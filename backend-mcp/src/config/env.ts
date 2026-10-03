import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve potential .env paths across the monorepo hierarchy
const rootEnvPath = path.resolve(__dirname, '../../../.env');
const backendEnvPath = path.resolve(__dirname, '../../.env');
const cwdEnvPath = path.resolve(process.cwd(), '.env');

// 1. Load from monorepo root (carebridge-ambient/.env)
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

// 2. Load or override from backend-mcp/.env
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath, override: true });
}

// 3. Fallback to current working execution directory
if (fs.existsSync(cwdEnvPath)) {
  dotenv.config({ path: cwdEnvPath, override: true });
}

export const envConfig = {
  NEBIUS_API_KEY: process.env.NEBIUS_API_KEY || '',
  NEBIUS_BASE_URL: process.env.NEBIUS_BASE_URL || 'https://api.tokenfactory.nebius.com/v1',
  NVIDIA_MODEL_ID: process.env.NVIDIA_MODEL_ID || process.env.NEMOTRON_MODEL_ID || 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B',
  NEMOTRON_MODEL_ID: process.env.NEMOTRON_MODEL_ID || process.env.NVIDIA_MODEL_ID || 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B',
  NEMOTRON_FAST_MODEL: process.env.NEMOTRON_FAST_MODEL || process.env.NVIDIA_FAST_MODEL || 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B',
  NEMOTRON_REASONING_MODEL: process.env.NEMOTRON_REASONING_MODEL || process.env.NVIDIA_REASONING_MODEL || 'nvidia/Nemotron-3-Ultra-550b-a55b',
  TAVILY_API_KEY: process.env.TAVILY_API_KEY || '',
  NEMOTRON_GUARDRAIL_ID: process.env.NEMOTRON_GUARDRAIL_ID || 'carebridge-nemotron-clinical-guardrail-v1',
  EMERGENCY_WEBHOOK_URL: process.env.EMERGENCY_WEBHOOK_URL || '',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
  MCP_PORT: Number(process.env.MCP_PORT || process.env.PORT) || 3001,
  NEXT_PUBLIC_MCP_URL: process.env.NEXT_PUBLIC_MCP_URL || 'http://localhost:3001',
};
