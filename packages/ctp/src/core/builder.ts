import type { RenderedContext } from './types';

/**
 * Builds a formatted prompt string from a RenderedContext.
 *
 * The prompt structure follows this format:
 * ```
 * # {name}
 *
 * {description}
 *
 * ---
 *
 * {collected prompt content}
 *
 * ---
 *
 * ## Available Tools
 * ### toolName
 * tool description
 * [Risk Level if not low]
 * [confirmation warning if needed]
 *
 * ## Data Views
 * - Title (format)
 *   Fields: field1, field2
 *
 * ## Metadata
 * - key: value
 * ```
 *
 * @param context - The rendered context containing all prompt components
 * @returns A formatted prompt string
 */
export function buildPrompt(context: RenderedContext): string {
  const lines: string[] = [];

  // Header: name and description
  lines.push(`# ${context.name}`);
  lines.push('');

  if (context.description) {
    lines.push(context.description);
    lines.push('');
  }

  // Separator
  lines.push('---');
  lines.push('');

  // Collected prompt content
  if (context.prompt) {
    lines.push(context.prompt.trim());
    lines.push('');
  }

  // Separator
  lines.push('---');
  lines.push('');

  // Available Tools section
  if (context.tools.length > 0) {
    lines.push('## Available Tools');
    lines.push('');

    for (const tool of context.tools) {
      lines.push(`### ${tool.name}`);
      lines.push(tool.description);
      lines.push('');
    }
  }

  // Data Views section
  if (context.dataViews.length > 0) {
    lines.push('## Data Views');
    lines.push('');

    for (const dataView of context.dataViews) {
      const format = dataView.format || 'list';
      const title = dataView.title || 'Untitled';
      lines.push(`- ${title} (${format})`);

      if (dataView.fields && dataView.fields.length > 0) {
        lines.push(`  Fields: ${dataView.fields.join(', ')}`);
      }
    }

    lines.push('');
  }

  // Metadata section
  if (context.metadata && Object.keys(context.metadata).length > 0) {
    lines.push('## Metadata');
    lines.push('');

    for (const [key, value] of Object.entries(context.metadata)) {
      lines.push(`- ${key}: ${value}`);
    }

    lines.push('');
  }

  return lines.join('\n').trim();
}
