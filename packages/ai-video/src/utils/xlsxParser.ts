/**
 * Excel storyboard file parser
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import type { Storyboard } from '../types.js';

const ALLOWED_EXCEL_EXTENSIONS = ['.xlsx'];
const MAX_EXCEL_BYTES = Number(process.env.AI_VIDEO_MAX_EXCEL_BYTES || 5 * 1024 * 1024);
const PARSE_TIMEOUT_MS = Number(process.env.AI_VIDEO_EXCEL_PARSE_TIMEOUT_MS || 5000);
const WORKER_STDIO_MAX_BYTES = Number(process.env.AI_VIDEO_EXCEL_WORKER_STDIO_MAX_BYTES || 2 * 1024 * 1024);

/**
 * Parse Excel storyboard file
 * @param filePath Excel file path
 * @returns Storyboard data array
 */
export function parseStoryboardExcel(filePath: string): Storyboard[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXCEL_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported Excel extension: ${ext}. Only .xlsx is allowed`);
  }

  const stat = fs.statSync(filePath);
  if (stat.size > MAX_EXCEL_BYTES) {
    throw new Error(
      `Excel file too large: ${stat.size} bytes (max ${MAX_EXCEL_BYTES} bytes). ` +
      'Set AI_VIDEO_MAX_EXCEL_BYTES to override if needed'
    );
  }

  const workerPath = fileURLToPath(new URL('./xlsxSandboxWorker.js', import.meta.url));
  const workerResult = spawnSync(process.execPath, [workerPath, filePath], {
    encoding: 'utf8',
    timeout: PARSE_TIMEOUT_MS,
    maxBuffer: WORKER_STDIO_MAX_BYTES,
  });

  if (workerResult.error) {
    if (workerResult.error.name === 'Error' && workerResult.error.message.includes('ETIMEDOUT')) {
      throw new Error(`Excel parse timed out after ${PARSE_TIMEOUT_MS}ms`);
    }
    throw new Error(`Excel parse failed: ${workerResult.error.message}`);
  }

  if (workerResult.status !== 0) {
    const reason = workerResult.stderr?.trim() || 'unknown error';
    throw new Error(`Excel parse worker failed: ${reason}`);
  }

  const stdout = workerResult.stdout?.trim();
  if (!stdout) {
    throw new Error('Excel parse worker returned empty output');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(stdout);
  } catch (error: any) {
    throw new Error(`Excel parse worker returned invalid JSON: ${error.message}`);
  }

  const storyboards = (payload as { storyboards?: unknown }).storyboards;
  if (!Array.isArray(storyboards)) {
    throw new Error('Excel parse worker response missing storyboards array');
  }

  return storyboards as Storyboard[];
}

/**
 * Find Excel file in directory
 * @param dir Directory path
 * @returns Excel file path, or null if not found
 */
export function findExcelFile(dir: string): string | null {
  if (!fs.existsSync(dir)) {
    return null;
  }

  const files = fs.readdirSync(dir);
  const excelExtensions = ALLOWED_EXCEL_EXTENSIONS;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (excelExtensions.includes(ext)) {
      return path.join(dir, file);
    }
  }

  return null;
}

/**
 * Format storyboard data to readable string
 */
export function formatStoryboards(storyboards: Storyboard[]): string {
  return storyboards
    .map((s, _i) => {
      const parts = [`[Storyboard ${s.index}]`];
      if (s.scene) parts.push(`Scene: ${s.scene}`);
      if (s.character) parts.push(`Character: ${s.character}`);
      if (s.action) parts.push(`Action: ${s.action}`);
      if (s.shot) parts.push(`Shot: ${s.shot}`);
      if (s.prompt) parts.push(`Prompt: ${s.prompt}`);
      return parts.join('\n  ');
    })
    .join('\n\n');
}
