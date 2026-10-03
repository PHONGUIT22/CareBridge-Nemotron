import './config/env.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Multi-tier environment variable loader for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, '../../.env');
const backendEnvPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath, override: true });
}

// Initialize Database and Seeder
import { initDB, getDatabase } from './database/db.js';
import { seedDemoData } from './database/seedDemoData.js';
import { MedicineRepo } from './database/medicineRepo.js';
import { LogRepo } from './database/logRepo.js';
import { VitalsRepo } from './database/vitalsRepo.js';
import { CaregiverRepo } from './database/caregiverRepo.js';
import { ConversationRepo } from './database/conversationRepo.js';

// Core MCP Tools
import { getTodayScheduleTool } from './tools/getTodaySchedule.js';
import { logDoseStatusTool } from './tools/logDoseStatus.js';
import { recordVitalsTool } from './tools/recordVitals.js';
import { clinicalAdvisorTool } from './tools/clinicalAdvisor.js';
import { orderRefillTool } from './tools/orderRefill.js';
import { ringDeviceHubTool } from './tools/ringDeviceHub.js';
import { negotiateAdherenceTool } from './tools/negotiateAdherence.js';
import { getLocalDateString } from './utils/dateUtils.js';
import { handleAgentTurn } from './tools/agentTurnHandler.js';
import { synthesizeSpeech } from './ai/voiceClient.js';
import {
  checkDrugInteractions,
  BEERS_CRITERIA_GERIATRIC_DRUGS,
  getBeersCriteriaProfile,
  searchTavilyDrugInteraction,
  searchTavilyClinicalProtocol,
} from './services/drugInteractionService.js';
import {
  evaluateNemotronGuardrails,
  evaluateBedrockGuardrails,
  invokeNemotronWithStreaming,
  invokeBedrockWithStreaming,
  NEMOTRON_GUARDRAIL_ID,
  NEMOTRON_GUARDRAIL_VERSION,
  BEDROCK_GUARDRAIL_ID,
  BEDROCK_GUARDRAIL_VERSION,
} from './ai/nemotronClient.js';

// Core MCP Resources & Prompts (Completing all 3 MCP Primitives: Tools + Resources + Prompts)
import { registeredResources, readResourceHandler } from './resources/index.js';
import { registeredPrompts, getPromptHandler } from './prompts/index.js';

const app = express();
const PORT = Number(process.env.MCP_PORT || process.env.PORT) || 3001;

// Allow Next.js frontend (port 3000) CORS access
app.use(cors({ origin: '*' }));
app.use(express.json());

// 1. INITIALIZE DATABASE SCHEMA & SYSTEM TABLES
initDB();

// ==========================================
// 2. SETUP MCP SERVER (Spec 2025-11-25)
// ==========================================
const mcpServer = new Server(
  {
    name: 'carebridge-ambient-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Registered tools ready for CareBridge Ambient agent
const registeredTools = [
  getTodayScheduleTool,
  logDoseStatusTool,
  recordVitalsTool,
  clinicalAdvisorTool,
  orderRefillTool,
  ringDeviceHubTool,
  negotiateAdherenceTool,
];

// --- MCP TOOLS HANDLERS ---
// Handler when Agent requests tool list
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: registeredTools.map((t) => t.definition),
  };
});

// Handler when Agent executes a tool
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: toolArgs } = request.params;

  try {
    switch (name) {
      case 'getTodaySchedule': {
        const result = await getTodayScheduleTool.handler(toolArgs as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'logDoseStatus': {
        const result = await logDoseStatusTool.handler(toolArgs as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'recordVitals': {
        const result = await recordVitalsTool.handler(toolArgs as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'clinicalAdvisor': {
        const result = await clinicalAdvisorTool.handler(toolArgs as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'orderRefill': {
        const result = await orderRefillTool.handler(toolArgs as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'ringDeviceHub': {
        const result = await ringDeviceHubTool.handler(toolArgs as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'negotiateAdherence': {
        const result = await negotiateAdherenceTool.handler(toolArgs as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      default:
        throw new Error(`MCP Tool '${name}' does not exist.`);
    }
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Error executing tool '${name}': ${error.message}` }],
    };
  }
});

// --- MCP RESOURCES HANDLERS (ListResourcesRequestSchema & ReadResourceRequestSchema) ---
// Handler when MCP client queries available read-only resources
mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: registeredResources,
  };
});

// Handler when MCP client reads static URI resource (e.g. adherence history, active prescriptions)
mcpServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  try {
    return await readResourceHandler(uri);
  } catch (error: any) {
    throw new Error(`Failed to read MCP Resource '${uri}': ${error.message}`);
  }
});

// --- MCP PROMPTS HANDLERS (ListPromptsRequestSchema & GetPromptRequestSchema) ---
// Handler when MCP client queries pre-engineered ambient interaction and triage prompts
mcpServer.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: registeredPrompts,
  };
});

// Handler when MCP client instantiates a prompt template with parameters
mcpServer.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: promptArgs } = request.params;
  try {
    return await getPromptHandler(name, promptArgs);
  } catch (error: any) {
    throw new Error(`Failed to get MCP Prompt '${name}': ${error.message}`);
  }
});

// ==========================================
// 3. STREAMABLE HTTP TRANSPORT (SSE for Web & Smart Display Clients)
// ==========================================
const sseTransports = new Map<string, SSEServerTransport>();

// SSE stream initiation endpoint
app.get('/sse', async (req: Request, res: Response) => {
  console.log('[MCP] New client connected via SSE stream...');
  const transport = new SSEServerTransport('/message', res);
  sseTransports.set(transport.sessionId, transport);

  req.on('close', () => {
    console.log(`[MCP] Closed SSE session: ${transport.sessionId}`);
    sseTransports.delete(transport.sessionId);
  });

  await mcpServer.connect(transport);
});

// Message POST endpoint from Agent client
app.post('/message', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = sseTransports.get(sessionId);

  if (!transport) {
    res.status(404).json({ error: 'MCP Session does not exist or has expired.' });
    return;
  }

  await transport.handlePostMessage(req, res);
});

// ==========================================
// 4. REST APIS FOR NEXT.JS FRONTEND
// ==========================================

/**
 * Helper to extract active authenticated user ID from request headers, query, or body
 */
function extractUserId(req: Request): string | undefined {
  const fromHeader = req.headers['x-user-id'];
  if (typeof fromHeader === 'string' && fromHeader.trim()) {
    return fromHeader.trim();
  }
  const fromQuery = req.query.userId;
  if (typeof fromQuery === 'string' && fromQuery.trim()) {
    return fromQuery.trim();
  }
  if (req.body && typeof req.body.userId === 'string' && req.body.userId.trim()) {
    return req.body.userId.trim();
  }
  return undefined;
}

// POST /api/auth/login - Multi-user authentication & demo isolation
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, pin, role } = req.body || {};
    if (!email || typeof email !== 'string' || !email.trim()) {
      res.status(400).json({ success: false, error: 'Email address is required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPin = pin !== undefined && pin !== null ? String(pin).trim() : '';
    const userRole = role === 'senior' ? 'senior' : 'caregiver';

    const isDemoAccount = normalizedEmail === 'demo@gmail.com' && normalizedPin === '1234';
    const db = getDatabase();

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as any;

    if (!user) {
      const id = isDemoAccount ? 'usr_demo' : `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const isPro = isDemoAccount ? 1 : 0;
      const isDemo = isDemoAccount ? 1 : 0;
      const createdAt = new Date().toISOString();

      db.prepare(`
        INSERT INTO users (id, email, pin, role, is_pro, is_demo, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, normalizedEmail, normalizedPin || null, userRole, isPro, isDemo, createdAt);

      user = {
        id,
        email: normalizedEmail,
        pin: normalizedPin || null,
        role: userRole,
        is_pro: isPro,
        is_demo: isDemo,
        is_onboarded: isDemoAccount ? 1 : 0,
        caregiver_name: isDemoAccount ? 'Sarah Connor' : null,
        patient_name: isDemoAccount ? 'Eleanor Vance' : null,
        patient_age: isDemoAccount ? 78 : null,
        created_at: createdAt,
      };
    } else {
      // If demo account logging in, make sure is_demo, is_pro, and demo profile are set
      if (isDemoAccount) {
        db.prepare(`
          UPDATE users 
          SET is_demo = 1, is_pro = 1, is_onboarded = 1,
              caregiver_name = 'Sarah Connor',
              patient_name = 'Eleanor Vance',
              patient_age = 78
          WHERE id = ?
        `).run(user.id);
        user.is_demo = 1;
        user.is_pro = 1;
        user.is_onboarded = 1;
        user.caregiver_name = 'Sarah Connor';
        user.patient_name = 'Eleanor Vance';
        user.patient_age = 78;
      }
    }

    // Seed demo data ONLY when email is demo@gmail.com and pin is 1234
    if (isDemoAccount) {
      await seedDemoData(user.id, false);
    }

    const isOnboarded = isDemoAccount ? true : Boolean(user.is_onboarded);
    const caregiverName = user.caregiver_name || (isDemoAccount ? 'Sarah Connor' : null);
    const patientName = user.patient_name || (isDemoAccount ? 'Eleanor Vance' : null);
    const patientAge = user.patient_age || (isDemoAccount ? 78 : null);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: userRole,
        isPro: Boolean(user.is_pro),
        isDemo: Boolean(user.is_demo),
        isOnboarded,
        caregiverName,
        patientName,
        patientAge,
        name: userRole === 'senior'
          ? (patientName || (isDemoAccount ? 'Eleanor Vance (Senior)' : `${user.email} (Senior)`))
          : (caregiverName || (isDemoAccount ? 'Sarah Connor (Caregiver)' : `${user.email} (Caregiver)`)),
      },
    });
  } catch (error: any) {
    console.error('[Auth Login Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/user/profile - Save/Update Caregiver & Patient profile during Onboarding
app.post('/api/user/profile', async (req: Request, res: Response) => {
  try {
    const userId = req.body.userId || extractUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized: missing user identifier.' });
      return;
    }

    const { caregiverName, patientName, patientAge } = req.body || {};
    if (!caregiverName || !patientName) {
      res.status(400).json({ success: false, error: 'caregiverName and patientName are required fields.' });
      return;
    }

    const ageNum = parseInt(String(patientAge), 10) || 75;
    const trimmedCaregiver = String(caregiverName).trim();
    const trimmedPatient = String(patientName).trim();
    const db = getDatabase();

    db.prepare(`
      UPDATE users 
      SET caregiver_name = ?,
          patient_name = ?,
          patient_age = ?,
          is_onboarded = 1
      WHERE id = ?
    `).run(trimmedCaregiver, trimmedPatient, ageNum, userId);

    // Also update caregiver_profile table
    try {
      db.prepare(`
        INSERT INTO caregiver_profile (id, name, email, updated_at)
        VALUES ('caregiver_active', ?, 'caregiver@carebridge.internal', ?)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at
      `).run(trimmedCaregiver, new Date().toISOString());
    } catch (_) {}

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

    res.json({
      success: true,
      user: {
        id: updatedUser?.id || userId,
        email: updatedUser?.email,
        role: updatedUser?.role || 'caregiver',
        isPro: Boolean(updatedUser?.is_pro),
        isDemo: Boolean(updatedUser?.is_demo),
        isOnboarded: true,
        caregiverName: updatedUser?.caregiver_name || trimmedCaregiver,
        patientName: updatedUser?.patient_name || trimmedPatient,
        patientAge: updatedUser?.patient_age || ageNum,
        name: trimmedCaregiver,
      },
    });
  } catch (error: any) {
    console.error('[User Profile Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/schedule - Fetch schedule + vitals + caregiver for targetDate (defaults to today)
app.get('/api/schedule', async (req: Request, res: Response) => {
  try {
    const today = getLocalDateString();
    const targetDate = (req.query.date as string) || today;
    const userId = extractUserId(req);
    const db = getDatabase();

    const [schedule, vitals, caregiver, userRow] = await Promise.all([
      LogRepo.getLogsByDate(targetDate, userId),
      VitalsRepo.getVitalsByDate(targetDate, userId),
      CaregiverRepo.getCaregiver(),
      userId ? (db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any) : null,
    ]);

    const isDemo = userRow?.is_demo === 1 || userId === 'usr_demo';
    const caregiverName = userRow?.caregiver_name || (isDemo ? 'Sarah Connor' : (caregiver?.name || 'Caregiver'));
    const patientName = userRow?.patient_name || (isDemo ? 'Eleanor Vance' : 'Patient');
    const patientAge = userRow?.patient_age || (isDemo ? 78 : undefined);

    const total = schedule.length;
    const taken = schedule.filter((s) => s.status === 'taken').length;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 100;

    res.json({
      success: true,
      date: targetDate,
      adherenceRate,
      schedule,
      vitals: vitals || null,
      caregiver: {
        ...caregiver,
        name: caregiverName,
      },
      caregiverName,
      patientName,
      patientAge,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Backward-compatible alias for /api/today -> forwards to date-filtered schedule
app.get('/api/today', async (req: Request, res: Response) => {
  try {
    const today = getLocalDateString();
    const targetDate = (req.query.date as string) || today;
    const userId = extractUserId(req);
    const db = getDatabase();

    const [schedule, vitals, caregiver, userRow] = await Promise.all([
      LogRepo.getLogsByDate(targetDate, userId),
      VitalsRepo.getVitalsByDate(targetDate, userId),
      CaregiverRepo.getCaregiver(),
      userId ? (db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any) : null,
    ]);

    const isDemo = userRow?.is_demo === 1 || userId === 'usr_demo';
    const caregiverName = userRow?.caregiver_name || (isDemo ? 'Sarah Connor' : (caregiver?.name || 'Caregiver'));
    const patientName = userRow?.patient_name || (isDemo ? 'Eleanor Vance' : 'Patient');
    const patientAge = userRow?.patient_age || (isDemo ? 78 : undefined);

    const total = schedule.length;
    const taken = schedule.filter((s) => s.status === 'taken').length;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 100;

    res.json({
      success: true,
      date: targetDate,
      adherenceRate,
      schedule,
      vitals: vitals || null,
      caregiver: {
        ...caregiver,
        name: caregiverName,
      },
      caregiverName,
      patientName,
      patientAge,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Direct "I Took My Pill" toggle action
app.post('/api/toggle', async (req: Request, res: Response) => {
  try {
    const { logId, currentStatus } = req.body;
    if (!logId) {
      res.status(400).json({ success: false, error: 'Missing logId parameter.' });
      return;
    }

    await LogRepo.toggleLogStatus(logId, currentStatus);
    res.json({ success: true, message: 'Medication dose status updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Log or update dose status (Ambient voice command or direct UI action)
app.post('/api/dose', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const result = await logDoseStatusTool.handler({ ...req.body, userId });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Smart Pharmacy Refill Hub: Automated prescription refill
app.post('/api/refill', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const result = await orderRefillTool.handler({ ...req.body, userId });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Smart IoT Home Hub control and monitoring
app.post('/api/ring', async (req: Request, res: Response) => {
  try {
    const result = await ringDeviceHubTool.handler(req.body || {});
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update clinical dose notes
app.post('/api/note', async (req: Request, res: Response) => {
  try {
    const { logId, notes } = req.body;
    if (!logId) {
      res.status(400).json({ success: false, error: 'Missing logId parameter.' });
      return;
    }
    await LogRepo.updateLogNotes(logId, notes || '');
    res.json({ success: true, message: 'Clinical note saved successfully.', logId, notes });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Quick vitals recording from QuickVitalsBar
app.post('/api/vitals', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const result = await recordVitalsTool.handler({ ...req.body, userId });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch 30-day historical matrix for punch-card visualization & clinician report
app.get('/api/history', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const [logs, vitals] = await Promise.all([
      LogRepo.getAllLogs(userId),
      VitalsRepo.getAllVitals(userId),
    ]);
    res.json({ success: true, logs, vitals });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// All medicines catalog and inventory levels
app.get('/api/medicines', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const medicines = await MedicineRepo.getAllMedicines(userId);
    res.json({ success: true, medicines });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add new medicine to catalog
app.post('/api/medicines', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const { name, dosage, reminderTimes, daysOfWeek, stockCount, imageUri, type } = req.body;
    if (!name || !dosage) {
      res.status(400).json({ success: false, error: 'Medicine name and dosage are required.' });
      return;
    }
    const id = await MedicineRepo.addMedicine({
      userId,
      name,
      dosage,
      reminderTimes: reminderTimes || ['08:00'],
      daysOfWeek: daysOfWeek || ['ALL'],
      stockCount: stockCount !== undefined ? Number(stockCount) : 30,
      imageUri,
      type: type || 'medication',
    });
    const todayStr = getLocalDateString();
    await LogRepo.generateLogsForDate(todayStr, userId);
    res.json({ success: true, id, message: 'New medicine added successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update medicine in catalog
app.put('/api/medicines/:id', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const id = String(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, error: 'Missing medicine id.' });
      return;
    }

    const { name, dosage, reminderTimes, daysOfWeek, stockCount, type, imageUri } = req.body || {};

    await MedicineRepo.updateMedicine(
      id,
      {
        name,
        dosage,
        reminderTimes,
        daysOfWeek,
        stockCount: stockCount !== undefined ? Number(stockCount) : undefined,
        type,
        imageUri,
      },
      userId
    );

    // Synchronize today's pending intake logs if reminderTimes or schedule changed
    const todayStr = getLocalDateString();
    const db = getDatabase();
    if (reminderTimes && Array.isArray(reminderTimes)) {
      if (userId) {
        db.prepare(
          "DELETE FROM intake_logs WHERE medicine_id = ? AND date = ? AND status = 'pending' AND user_id = ?"
        ).run(id, todayStr, userId);
      } else {
        db.prepare(
          "DELETE FROM intake_logs WHERE medicine_id = ? AND date = ? AND status = 'pending'"
        ).run(id, todayStr);
      }
    }
    await LogRepo.generateLogsForDate(todayStr, userId);

    res.json({ success: true, message: 'Medicine updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete medicine from catalog
app.delete('/api/medicines/:id', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    const id = String(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, error: 'Missing medicine id.' });
      return;
    }
    await MedicineRepo.deleteMedicine(id, userId);
    res.json({ success: true, message: 'Medicine deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Automated drug interaction check (Drug Safety & Beers Criteria check)
app.post('/api/medicines/check-interaction', async (req: Request, res: Response) => {
  try {
    const { newMedicineName, currentMedicines } = req.body || {};
    if (!newMedicineName || typeof newMedicineName !== 'string') {
      res.status(400).json({ success: false, error: 'Missing medicine name to check (newMedicineName).' });
      return;
    }
    const result = await checkDrugInteractions(newMedicineName, currentMedicines);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[Server Check Interaction Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clinical advisor query endpoint for AgentConsole and voice/text queries
app.post('/api/advisor', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) {
      res.status(400).json({ success: false, error: 'Missing question query.' });
      return;
    }
    const result = await clinicalAdvisorTool.handler({ query });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI Health Guardian adherence negotiation endpoint
app.post('/api/guardian/negotiate', async (req: Request, res: Response) => {
  try {
    const result = await negotiateAdherenceTool.handler(req.body || {});
    res.json(result);
  } catch (error: any) {
    console.error('[Server Guardian Negotiate Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Agent turn orchestration endpoint (NVIDIA Nemotron Tool-Calling & Offline Heuristic Fallback)
app.post('/api/agent/turn', async (req: Request, res: Response) => {
  try {
    const { query, context } = req.body || {};
    const userId = extractUserId(req) || 'usr_demo';
    if (!query || typeof query !== 'string') {
      res.status(400).json({ success: false, error: 'Missing user query for agent turn.' });
      return;
    }

    // Persist incoming user turn into SQLite WAL
    const userMsgId = `user_${Date.now()}`;
    await ConversationRepo.saveMessage({
      id: userMsgId,
      userId,
      sender: 'user',
      text: query.trim(),
      createdAt: new Date().toISOString(),
    });

    const result = await handleAgentTurn({ query, context });

    // Persist assistant response turn into SQLite WAL
    if (result) {
      const assistantMsgId = `copilot_${Date.now()}`;
      await ConversationRepo.saveMessage({
        id: assistantMsgId,
        userId,
        sender: 'assistant',
        text: result.speechResponse,
        toolName: result.toolName,
        toolArgs: result.toolArgs,
        toolResult: result.toolResult,
        urgencyLevel: result.toolResult?.urgencyLevel || result.toolResult?.richCard?.urgencyLevel,
        createdAt: new Date().toISOString(),
      });
    }

    res.json(result);
  } catch (error: any) {
    console.error('[Server Agent Turn Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/agent/history - Load persistent cross-session dialogue turns and senior habit memories
app.get('/api/agent/history', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req) || 'usr_demo';
    const limit = Number(req.query.limit) || 30;
    const [messages, memories] = await Promise.all([
      ConversationRepo.getRecentConversations(userId, limit),
      ConversationRepo.getSeniorMemories(userId),
    ]);
    res.json({ success: true, messages, memories });
  } catch (error: any) {
    console.error('[Server Agent History Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/agent/sync - Manually persist an ambient voice or simulated dialogue turn
app.post('/api/agent/sync', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req) || 'usr_demo';
    const { message } = req.body || {};
    if (!message || !message.text) {
      res.status(400).json({ success: false, error: 'Missing message body.' });
      return;
    }
    const saved = await ConversationRepo.saveMessage({ ...message, userId });
    res.json({ success: true, message: saved });
  } catch (error: any) {
    console.error('[Server Agent Sync Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/agent/memory - Add or update a senior habit, personal preference, or clinical note
app.post('/api/agent/memory', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req) || 'usr_demo';
    const { category, content } = req.body || {};
    if (!category || !content) {
      res.status(400).json({ success: false, error: 'Missing category or content.' });
      return;
    }
    const memory = await ConversationRepo.addSeniorMemory(userId, category, content);
    res.json({ success: true, memory });
  } catch (error: any) {
    console.error('[Server Agent Memory Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Neural TTS synthesis endpoint for Smart Displays & Ambient OS
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceId } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ success: false, error: 'Missing text content for TTS synthesis.' });
      return;
    }

    const audioBuffer = await synthesizeSpeech(text, voiceId);
    if (!audioBuffer) {
      res.status(200).json({
        success: false,
        fallback: true,
        message: 'Neural TTS is not configured or unavailable. Seamlessly fallback to Web Speech API.',
      });
      return;
    }

    if (req.headers.accept === 'audio/mpeg' || req.query.format === 'binary') {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.end(audioBuffer);
    } else {
      res.json({
        success: true,
        fallback: false,
        mimeType: 'audio/mpeg',
        audioBase64: audioBuffer.toString('base64'),
      });
    }
  } catch (error: any) {
    console.error('[Server TTS Error]:', error);
    res.status(200).json({
      success: false,
      fallback: true,
      error: error.message,
    });
  }
});

// Reset and reseed 30-day clinical demo dataset
app.post('/api/seed', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req) || 'usr_demo';
    await seedDemoData(userId, true);
    res.json({ success: true, message: `Reset and reseeded 30 days of clinical demo data for user ${userId} successfully!` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// MCP PROTOCOL REST INSPECTION ENDPOINTS
// ==========================================

// GET /api/mcp/resources - List registered MCP read-only resources
app.get('/api/mcp/resources', async (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      resources: registeredResources,
      count: registeredResources.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/mcp/resources/read - Read resource content via query param (?uri=carebridge://...)
app.get('/api/mcp/resources/read', async (req: Request, res: Response) => {
  try {
    const uri = req.query.uri as string;
    if (!uri) {
      res.status(400).json({
        success: false,
        error: 'Missing required query parameter "uri".',
        registeredUris: registeredResources.map((r) => r.uri),
      });
      return;
    }
    const result = await readResourceHandler(uri);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// GET /api/mcp/prompts - List registered pre-engineered MCP prompts
app.get('/api/mcp/prompts', async (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      prompts: registeredPrompts,
      count: registeredPrompts.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/mcp/prompts/:name - Retrieve prompt instructions by name
app.get('/api/mcp/prompts/:name', async (req: Request, res: Response) => {
  try {
    const rawName = req.params.name;
    const name = Array.isArray(rawName) ? rawName[0] : rawName;
    const args = req.query as Record<string, string>;
    const result = await getPromptHandler(name, args);
    res.json({ success: true, promptName: name, ...result });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// POST /api/mcp/prompts/get - Retrieve prompt instructions with JSON payload arguments
app.post('/api/mcp/prompts/get', async (req: Request, res: Response) => {
  try {
    const { name, arguments: promptArgs } = req.body || {};
    if (!name) {
      res.status(400).json({
        success: false,
        error: 'Missing prompt name in request body.',
        availablePrompts: registeredPrompts.map((p) => p.name),
      });
      return;
    }
    const result = await getPromptHandler(name, promptArgs);
    res.json({ success: true, promptName: name, ...result });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// ==========================================
// NVIDIA NEMOTRON & CLINICAL GUARDRAILS
// ==========================================

// POST /api/nemotron/guardrails/check - Verify Topic Denial & PII Redaction
app.post(['/api/nemotron/guardrails/check', '/api/bedrock/guardrails/check'], async (req: Request, res: Response) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string') {
      res.status(400).json({ success: false, error: 'Missing text in request body.' });
      return;
    }
    const result = evaluateNemotronGuardrails(text);
    res.json({
      success: true,
      guardrailConfig: {
        identifier: NEMOTRON_GUARDRAIL_ID,
        version: NEMOTRON_GUARDRAIL_VERSION,
      },
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/nemotron/stream - Streaming NVIDIA Nemotron inference with TTFA < 400ms metrics
app.post(['/api/nemotron/stream', '/api/bedrock/stream'], async (req: Request, res: Response) => {
  try {
    const { query, voiceId } = req.body || {};
    if (!query || typeof query !== 'string') {
      res.status(400).json({ success: false, error: 'Missing query in request body.' });
      return;
    }

    const streamedTokens: string[] = [];
    const streamedSentences: string[] = [];

    const streamResult = await invokeNemotronWithStreaming(
      query,
      {
        onToken: (tok) => streamedTokens.push(tok),
        onSentence: (sen) => streamedSentences.push(sen),
        voiceId,
      }
    );

    res.json({
      success: true,
      query,
      fullText: streamResult.fullText,
      sentences: streamResult.sentences,
      audioBuffersCount: streamResult.audioBuffers.length,
      timeToFirstTokenMs: streamResult.timeToFirstTokenMs,
      timeToFirstAudioMs: streamResult.timeToFirstAudioMs,
      targetTtfpAchieved: streamResult.timeToFirstAudioMs < 400,
      guardrailRedacted: streamResult.guardrailRedacted,
      guardrailBlocked: streamResult.guardrailBlocked,
      firstAudioBase64: streamResult.audioBuffers[0]?.toString('base64') || null,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/medicines/beers-criteria - Query 2023 AGS Beers Criteria 15-Medication Registry
app.get('/api/medicines/beers-criteria', async (req: Request, res: Response) => {
  try {
    const query = req.query.drug as string;
    if (query) {
      const profile = getBeersCriteriaProfile(query);
      if (!profile) {
        res.status(404).json({
          success: false,
          error: `Drug "${query}" not found in Beers Criteria registry.`,
          availableDrugs: Object.keys(BEERS_CRITERIA_GERIATRIC_DRUGS),
        });
        return;
      }
      res.json({ success: true, drug: query, profile });
      return;
    }

    res.json({
      success: true,
      guideline: '2023 American Geriatrics Society (AGS) Beers Criteria®',
      medicationsCount: Object.keys(BEERS_CRITERIA_GERIATRIC_DRUGS).length,
      medications: BEERS_CRITERIA_GERIATRIC_DRUGS,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/clinical/tavily-search - Real-time Tavily search for FDA drug interactions and clinical protocols
app.post('/api/clinical/tavily-search', async (req: Request, res: Response) => {
  try {
    const { med1, med2, query } = req.body || {};
    let evidence;
    if (query && typeof query === 'string') {
      evidence = await searchTavilyClinicalProtocol(query);
    } else if (med1 && typeof med1 === 'string') {
      evidence = await searchTavilyDrugInteraction(med1, typeof med2 === 'string' ? med2 : undefined);
    } else {
      res.status(400).json({
        success: false,
        error: 'Missing search target. Provide "query" for protocol search or "med1" (with optional "med2") for interaction search.',
      });
      return;
    }
    res.json({ success: true, ...evidence });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 5. START SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(`
=====================================================
  CAREBRIDGE AMBIENT MCP SERVER READY!
  • Port:               ${PORT}
  • REST API:           http://localhost:${PORT}/api/today
  • MCP SSE Endpoint:   http://localhost:${PORT}/sse
  • MCP Message Post:   http://localhost:${PORT}/message
=====================================================
  `);
  console.log(`[AWS Config] Region: ${process.env.AWS_REGION || 'none'}, Key ID: ${process.env.AWS_ACCESS_KEY_ID ? 'Configured' : 'Empty'}`);
});