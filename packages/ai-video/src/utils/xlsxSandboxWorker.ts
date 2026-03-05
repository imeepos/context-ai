import XLSX from 'xlsx';
import * as fs from 'fs';
import type { Storyboard } from '../types.js';

const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function sanitizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = Object.create(null);
  for (const [key, value] of Object.entries(row)) {
    if (BLOCKED_KEYS.has(key)) {
      continue;
    }
    safe[key] = value;
  }
  return safe;
}

function parseRowToStoryboard(row: Record<string, unknown>, index: number): Storyboard {
  const storyboard: Storyboard = {
    index: index + 1,
    raw: row,
  };

  const indexKeys = ['index', 'no', 'number'];
  for (const key of indexKeys) {
    if (row[key] !== undefined) {
      storyboard.index = Number(row[key]) || index + 1;
      break;
    }
  }

  const sceneKeys = ['scene', 'background'];
  for (const key of sceneKeys) {
    if (row[key] !== undefined) {
      storyboard.scene = String(row[key]);
      break;
    }
  }

  const characterKeys = ['character'];
  for (const key of characterKeys) {
    if (row[key] !== undefined) {
      storyboard.character = String(row[key]);
      break;
    }
  }

  const actionKeys = ['action'];
  for (const key of actionKeys) {
    if (row[key] !== undefined) {
      storyboard.action = String(row[key]);
      break;
    }
  }

  const shotKeys = ['shot'];
  for (const key of shotKeys) {
    if (row[key] !== undefined) {
      storyboard.shot = String(row[key]);
      break;
    }
  }

  const dialogueKeys = ['dialogue'];
  for (const key of dialogueKeys) {
    if (row[key] !== undefined) {
      storyboard.dialogue = String(row[key]);
      break;
    }
  }

  const durationKeys = ['duration'];
  for (const key of durationKeys) {
    if (row[key] !== undefined) {
      storyboard.duration = Number(row[key]) || undefined;
      break;
    }
  }

  const promptKeys = ['prompt', 'description'];
  for (const key of promptKeys) {
    if (row[key] !== undefined) {
      storyboard.prompt = String(row[key]);
      break;
    }
  }

  if (!storyboard.prompt) {
    storyboard.prompt = generatePromptFromStoryboard(storyboard);
  }

  return storyboard;
}

function generatePromptFromStoryboard(storyboard: Storyboard): string {
  const parts: string[] = [];

  if (storyboard.scene) parts.push(`Scene: ${storyboard.scene}`);
  if (storyboard.character) parts.push(`Character: ${storyboard.character}`);
  if (storyboard.action) parts.push(`Action: ${storyboard.action}`);
  if (storyboard.shot) parts.push(`Shot: ${storyboard.shot}`);

  return parts.length > 0 ? parts.join(', ') : `Storyboard ${storyboard.index}`;
}

function parseStoryboardExcelInWorker(filePath: string): Storyboard[] {
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('No worksheet in Excel file');
  }

  const sheet = workbook.Sheets[sheetName]!;
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  return rawData.map((row, index) => parseRowToStoryboard(sanitizeRow(row), index));
}

function main(): void {
  try {
    const filePath = process.argv[2];
    if (!filePath) {
      throw new Error('Excel file path is required');
    }
    const storyboards = parseStoryboardExcelInWorker(filePath);
    process.stdout.write(JSON.stringify({ storyboards }));
  } catch (error: any) {
    process.stderr.write(error?.message || 'Unknown worker error');
    process.exit(1);
  }
}

main();
