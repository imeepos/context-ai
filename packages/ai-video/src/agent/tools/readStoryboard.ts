/**
 * Read storyboard file tool
 */
import { Type } from '@sinclair/typebox';
import type { AgentTool } from '@mariozechner/pi-agent-core';
import { parseStoryboardExcel, findExcelFile, formatStoryboards } from '../../utils/xlsxParser.js';
import type { AgentContext } from '../../types.js';
import { result } from './toolUtils.js';

/**
 * Create read storyboard file tool
 */
export function createReadStoryboardTool(context: AgentContext): AgentTool {
  return {
    name: 'read_storyboard',
    label: 'Read Storyboard',
    description: 'Read storyboard Excel file from input directory, returns storyboard data',
    parameters: Type.Object({}),
    execute: async () => {
      try {
        const excelPath = findExcelFile(context.inputDir);

        if (!excelPath) {
          return result(`No Excel file found in directory ${context.inputDir}`, { error: true });
        }

        const storyboards = parseStoryboardExcel(excelPath);
        context.storyboards = storyboards;

        const summary = formatStoryboards(storyboards);
        return result(
          `Successfully read ${storyboards.length} storyboards:\n\n${summary}`,
          { count: storyboards.length, file: excelPath }
        );
      } catch (err: any) {
        return result(`Failed to read storyboard: ${err.message}`, { error: true });
      }
    },
  };
}
