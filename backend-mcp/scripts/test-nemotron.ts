import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Multi-tier environment variable loader for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootEnvPath = path.resolve(__dirname, '../../.env');
const backendEnvPath = path.resolve(__dirname, '../.env');
const cwdEnvPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(rootEnvPath)) dotenv.config({ path: rootEnvPath });
if (fs.existsSync(backendEnvPath)) dotenv.config({ path: backendEnvPath, override: true });
if (fs.existsSync(cwdEnvPath)) dotenv.config({ path: cwdEnvPath, override: true });

const apiKey = process.env.NEBIUS_API_KEY?.trim();

console.log(`
=====================================================
  CAREBRIDGE AMBIENT - NEBIUS NEMOTRON DIAGNOSTIC
=====================================================
• Nebius API Key:   ${apiKey ? apiKey.substring(0, 4) + '****' + apiKey.slice(-4) : 'MISSING'}
=====================================================
`);

if (!apiKey || apiKey.includes('PASTE_') || apiKey === 'your_nebius_api_key_here') {
  console.log(`[Diagnostic Info] NEBIUS_API_KEY is not configured or is placeholder in .env.`);
  process.exit(0);
}

const candidateEndpoints = [
  process.env.NEBIUS_BASE_URL?.trim(),
  'https://api.studio.nebius.ai/v1',
  'https://api.tokenfactory.nebius.ai/v1',
  'https://api.tokenfactory.nebius.com/v1',
  'https://api.studio.nebius.com/v1',
].filter(Boolean) as string[];

// Remove duplicate endpoints
const uniqueEndpoints = Array.from(new Set(candidateEndpoints.map(e => e.replace(/\/+$/, ''))));

async function probeEndpoint(baseUrl: string) {
  console.log(`\n[Probe] Probing endpoint: ${baseUrl} ...`);
  const client = new OpenAI({ baseURL: baseUrl, apiKey });

  try {
    const startTime = performance.now();
    const modelsResponse = await client.models.list();
    const latency = Math.round(performance.now() - startTime);

    const modelList = [];
    for await (const m of modelsResponse) {
      modelList.push(m.id);
    }

    console.log(`>>> [SUCCESS] models.list() succeeded on ${baseUrl} (${latency}ms)! <<<`);
    console.log(`Total models found: ${modelList.length}`);
    console.log(`Available Model IDs:`);
    modelList.forEach(id => console.log(`  - ${id}`));

    // Find NVIDIA / Nemotron models
    const nvidiaModels = modelList.filter(id => 
      id.toLowerCase().includes('nemotron') || 
      id.toLowerCase().includes('nvidia')
    );

    console.log(`\nNVIDIA / Nemotron models detected:`, nvidiaModels);

    const preferredModel = process.env.NEMOTRON_MODEL_ID?.trim() || process.env.NVIDIA_MODEL_ID?.trim();
    const selectedModel =
      (preferredModel && modelList.includes(preferredModel) ? preferredModel : null) ||
      nvidiaModels[0] ||
      modelList[0] ||
      'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B';

    console.log(`\n[Test Completion] Testing chat completion with model: "${selectedModel}" ...`);
    const testPrompt = 'Say hello in 5 words';
    console.log(`[Prompt] "${testPrompt}"`);
    const compStart = performance.now();
    const comp = await client.chat.completions.create({
      model: selectedModel,
      messages: [{ role: 'user', content: testPrompt }],
      max_tokens: 150,
      temperature: 0.1,
    });
    const compLatency = Math.round(performance.now() - compStart);

    console.log(`-----------------------------------------------------`);
    console.log(`>>> [SUCCESS] Nemotron Model Invocation Succeeded! <<<`);
    console.log(`-----------------------------------------------------`);
    console.log(`• Working Base URL: ${baseUrl}`);
    console.log(`• Working Model ID: ${selectedModel}`);
    console.log(`• Roundtrip Latency: ${compLatency}ms`);
    console.log(`• Raw Model Output:`);
    console.log(comp.choices?.[0]?.message?.content || '');
    console.log(`\n• Usage Metrics:`, comp.usage || 'N/A');
    console.log(`=====================================================\n`);
    return { success: true, baseUrl, selectedModel };
  } catch (err: any) {
    console.log(`[Probe Failed] ${baseUrl} -> ${err.status || ''} ${err.message}`);
    return { success: false, baseUrl, error: err };
  }
}

async function run() {
  for (const ep of uniqueEndpoints) {
    const res = await probeEndpoint(ep);
    if (res.success) {
      console.log(`\nRecommended Configuration:`);
      console.log(`NEBIUS_BASE_URL=${res.baseUrl}`);
      console.log(`NEMOTRON_MODEL_ID=${res.selectedModel}`);
      console.log(`NVIDIA_MODEL_ID=${res.selectedModel}`);
      process.exit(0);
    }
  }

  console.error(`\nAll candidate endpoints failed!`);
  process.exit(1);
}

run();
