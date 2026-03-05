/**
 * Excel storyboard file parser
 */

import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import type { Storyboard } from '../types.js';

/**
 * Parse Excel storyboard file
 * @param filePath Excel file path
 * @returns Storyboard data array
 */
export function parseStoryboardExcel(filePath: string): Storyboard[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }

  // Read file content
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('No worksheet in Excel file');
  }

  const sheet = workbook.Sheets[sheetName]!;
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  return rawData.map((row, index) => parseRowToStoryboard(row, index));
}

/**
 * Convert raw row data to storyboard object
 */
function parseRowToStoryboard(row: Record<string, unknown>, index: number): Storyboard {
  // Try to match common column names
  const storyboard: Storyboard = {
    index: index + 1,
    raw: row,
  };

  // Match index column
  const indexKeys = ['index', 'no', 'number'];
  for (const key of indexKeys) {
    if (row[key] !== undefined) {
      storyboard.index = Number(row[key]) || index + 1;
      break;
    }
  }

  // Match scene column
  const sceneKeys = ['scene', 'background'];
  for (const key of sceneKeys) {
    if (row[key] !== undefined) {
      storyboard.scene = String(row[key]);
      break;
    }
  }

  // Match character column
  const characterKeys = ['character'];
  for (const key of characterKeys) {
    if (row[key] !== undefined) {
      storyboard.character = String(row[key]);
      break;
    }
  }

  // Match action column
  const actionKeys = ['action'];
  for (const key of actionKeys) {
    if (row[key] !== undefined) {
      storyboard.action = String(row[key]);
      break;
    }
  }

  // Match shot column
  const shotKeys = ['shot'];
  for (const key of shotKeys) {
    if (row[key] !== undefined) {
      storyboard.shot = String(row[key]);
      break;
    }
  }

  // Match dialogue column
  const dialogueKeys = ['dialogue'];
  for (const key of dialogueKeys) {
    if (row[key] !== undefined) {
      storyboard.dialogue = String(row[key]);
      break;
    }
  }

  // Match duration column
  const durationKeys = ['duration'];
  for (const key of durationKeys) {
    if (row[key] !== undefined) {
      storyboard.duration = Number(row[key]) || undefined;
      break;
    }
  }

  // Match prompt column
  const promptKeys = ['prompt', 'description'];
  for (const key of promptKeys) {
    if (row[key] !== undefined) {
      storyboard.prompt = String(row[key]);
      break;
    }
  }

  // If no separate prompt, generate from storyboard data
  if (!storyboard.prompt) {
    storyboard.prompt = generatePromptFromStoryboard(storyboard);
  }

  return storyboard;
}

/**
 * Generate prompt from storyboard data
 */
function generatePromptFromStoryboard(storyboard: Storyboard): string {
  const parts: string[] = [];

  if (storyboard.scene) {
    parts.push(`Scene: ${storyboard.scene}`);
  }
  if (storyboard.character) {
    parts.push(`Character: ${storyboard.character}`);
  }
  if (storyboard.action) {
    parts.push(`Action: ${storyboard.action}`);
  }
  if (storyboard.shot) {
    parts.push(`Shot: ${storyboard.shot}`);
  }

  return parts.length > 0 ? parts.join(', ') : `Storyboard ${storyboard.index}`;
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
  const excelExtensions = ['.xlsx', '.xls'];

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
