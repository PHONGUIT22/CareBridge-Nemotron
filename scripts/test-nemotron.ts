import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// 1. Multi-tier environment variable loader for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootEnvPath = path.resolve(__dirname, '../../../.env');
const backendEnvPath = path.resolve(__dirname, '../../.env');
const cwdEnvPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(rootEnvPath)) dotenv.config({ path: rootEnvPath });
if (fs.existsSync(backendEnvPath)) dotenv.config({ path: backendEnvPath, override: true });
if (fs.existsSync(cwdEnvPath)) dotenv.config({ path: cwdEnvPath, override: true });

const baseURL = process.env.NEBIUS_BASE_URL?.trim() || 'https://api.tokenfactory.nebius.ai/v1';
const modelId =
  process.env.NEMOTRON_MODEL_ID?.trim() ||
  process.env.NEBIUS_MODEL_ID?.trim() ||
  'nvidia/Llama-3.1-Nemotron-70B-Instruct';
const apiKey = process.env.NEBIUS_API_KEY?.trim();

console.log(`
=====================================================
  CAREBRIDGE AMBIENT - NEBIUS NEMOTRON DIAGNOSTIC
=====================================================
• Base URL:         ${baseURL}
• Target Model:     ${modelId}
• Nebius API Key:   ${apiKey ? apiKey.substring(0, 4) + '****' + apiKey.slice(-4) : 'MISSING'}
=====================================================
`);

if (!apiKey || apiKey.includes('PASTE_') || apiKey === 'your_nebius_api_key_here') {
  console.log(`[Diagnostic Info] NEBIUS_API_KEY is not configured or is placeholder in .env.`);
  console.log(`CareBridge will operate using its built-in clinical offline heuristic fallback.`);
  console.log(`To connect to live Nebius Token Factory, set NEBIUS_API_KEY in your .env file.`);
  process.exit(0);
}

// 2. Initialize OpenAI Client with Nebius Endpoint
const client = new OpenAI({
  baseURL,
  apiKey,
});

// 3. Prepare test payload
const testPrompt = 'Respond in JSON: {"status": "ok", "message": "Nemotron connected"}';

async function runNemotronDiagnostic() {
  console.log(`[Diagnostic] Sending test prompt to Nebius Token Factory (${modelId})...`);
  console.log(`[Prompt Content] "${testPrompt}"\n`);
  const startTime = performance.now();

  try {
    const response = await client.chat.completions.create({
      model: modelId,
      messages: [{ role: 'user', content: testPrompt }],
      max_tokens: 150,
      temperature: 0.1,
    });

    const latency = Math.round(performance.now() - startTime);
    const textOutput = response.choices?.[0]?.message?.content || '';

    console.log(`-----------------------------------------------------`);
    console.log(`>>> [SUCCESS] Nemotron Model Invocation Succeeded! <<<`);
    console.log(`-----------------------------------------------------`);
    console.log(`• Roundtrip Latency: ${latency}ms`);
    console.log(`• Raw Model Output:`);
    console.log(textOutput);
    console.log(`\n• Usage Metrics:`, response.usage || 'N/A');
    console.log(`=====================================================\n`);
  } catch (error: any) {
    const latency = Math.round(performance.now() - startTime);
    console.error(`-----------------------------------------------------`);
    console.error(`>>> [FAILED] Nebius Nemotron Invocation Failed! <<<`);
    console.error(`-----------------------------------------------------`);
    console.error(`• Latency to Error:     ${latency}ms`);
    console.error(`• Error Message:        ${error.message}`);
    console.error(`• Status Code:          ${error.status ?? 'N/A'}`);
    console.error(`=====================================================\n`);
    process.exit(1);
  }
}

runNemotronDiagnostic();
