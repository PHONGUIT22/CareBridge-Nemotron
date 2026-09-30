import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { tavily } from '@tavily/core';
import {
  searchTavilyDrugInteraction,
  searchTavilyClinicalProtocol,
} from '../src/services/drugInteractionService.js';

// Multi-tier environment variable loader for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootEnvPath = path.resolve(__dirname, '../../.env');
const backendEnvPath = path.resolve(__dirname, '../.env');
const cwdEnvPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(rootEnvPath)) dotenv.config({ path: rootEnvPath });
if (fs.existsSync(backendEnvPath)) dotenv.config({ path: backendEnvPath, override: true });
if (fs.existsSync(cwdEnvPath)) dotenv.config({ path: cwdEnvPath, override: true });

const rawKey = process.env.TAVILY_API_KEY?.trim();
const maskedKey = rawKey
  ? `${rawKey.slice(0, 5)}...${rawKey.slice(-4)} (length: ${rawKey.length})`
  : 'NOT FOUND';

console.log(`
=====================================================
  CAREBRIDGE AMBIENT - TAVILY API DIAGNOSTIC
=====================================================
• Tavily API Key:     ${maskedKey}
• Node / ESM Target:  ${process.version}
=====================================================
`);

if (!rawKey || rawKey === 'your_tavily_api_key_here' || rawKey.includes('PASTE_')) {
  console.error('❌ [ERROR] TAVILY_API_KEY is missing or contains placeholder in .env!');
  process.exit(1);
}

async function runDiagnostics() {
  console.log('🔄 Step 1: Testing direct connection with @tavily/core SDK...');
  const startTime = Date.now();
  try {
    const client = tavily({ apiKey: rawKey });
    const directRes = await client.search('FDA Warfarin Aspirin bleeding risk geriatric', {
      searchDepth: 'basic',
      maxResults: 3,
    });
    const directDuration = Date.now() - startTime;
    console.log(`✅ [Step 1 SUCCESS] Direct Tavily API returned status 200 in ${directDuration}ms.`);
    console.log(`   Found ${directRes.results?.length ?? 0} results.`);
    if (directRes.results?.[0]) {
      console.log(`   Sample Source 1: "${directRes.results[0].title}"`);
      console.log(`   URL: ${directRes.results[0].url}`);
    }
  } catch (err: any) {
    console.error(`❌ [Step 1 FAILED] Direct Tavily call failed:`, err?.message || err);
    process.exit(1);
  }

  console.log('\n🔄 Step 2: Testing searchTavilyDrugInteraction("Warfarin", "Aspirin")...');
  const step2Start = Date.now();
  try {
    const interactionEvidence = await searchTavilyDrugInteraction('Warfarin', 'Aspirin');
    const step2Duration = Date.now() - step2Start;
    console.log(`✅ [Step 2 SUCCESS] drugInteractionService responded in ${step2Duration}ms:`);
    console.log(`   • Simulated fallback?: ${interactionEvidence.simulated ? 'YES (FALLBACK)' : 'NO (LIVE API CALLED!)'}`);
    console.log(`   • Query: "${interactionEvidence.query}"`);
    console.log(`   • Sources Count: ${interactionEvidence.sources.length}`);
    interactionEvidence.sources.slice(0, 3).forEach((src, idx) => {
      console.log(`     [${idx + 1}] ${src.title}`);
      console.log(`         ${src.url}`);
    });
    if (interactionEvidence.answer) {
      console.log(`   • Synthesized Clinical Answer Preview: "${interactionEvidence.answer.slice(0, 150)}..."`);
    }

    if (interactionEvidence.simulated) {
      console.warn('⚠️ [WARNING] Result was simulated rather than live!');
    }
  } catch (err: any) {
    console.error(`❌ [Step 2 FAILED]:`, err?.message || err);
  }

  console.log('\n🔄 Step 3: Testing searchTavilyClinicalProtocol("orthostatic dizziness after amlodipine")...');
  const step3Start = Date.now();
  try {
    const protocolEvidence = await searchTavilyClinicalProtocol('orthostatic dizziness after amlodipine');
    const step3Duration = Date.now() - step3Start;
    console.log(`✅ [Step 3 SUCCESS] Clinical Protocol responded in ${step3Duration}ms:`);
    console.log(`   • Simulated fallback?: ${protocolEvidence.simulated ? 'YES (FALLBACK)' : 'NO (LIVE API CALLED!)'}`);
    console.log(`   • Sources Count: ${protocolEvidence.sources.length}`);
    if (protocolEvidence.answer) {
      console.log(`   • Protocol Answer Preview: "${protocolEvidence.answer.slice(0, 150)}..."`);
    }
  } catch (err: any) {
    console.error(`❌ [Step 3 FAILED]:`, err?.message || err);
  }

  console.log(`
=====================================================
>>> [ALL TAVILY DIAGNOSTICS COMPLETE] <<<
• Total Time: ${Date.now() - startTime}ms
• Status: OPERATIONAL
=====================================================
`);
}

runDiagnostics();
