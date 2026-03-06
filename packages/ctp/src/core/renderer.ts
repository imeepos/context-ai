import type {
  JSXElement,
  RenderedContext,
  DataView,
} from './types.js';
import type { ContextProps } from '../components/context.js';
import type { DataProps } from '../components/data.js';
import type { ToolProps } from '../components/tool.js';
import type { GroupProps } from '../components/group.js';
import type { TextProps } from '../components/text.js';
import type { ExampleProps } from '../components/example.js';
import { buildPrompt } from './builder.js';
import type { AgentTool } from '@mariozechner/pi-agent-core';

/**
 * Render a JSX element or function component into a RenderedContext
 * @param component - JSXElement or function returning JSXElement
 * @returns Promise<RenderedContext> - The rendered context with prompt, tools, and data views
 */
export async function render(
  component: JSXElement | (() => JSXElement | Promise<JSXElement>)
): Promise<RenderedContext> {
  // Create a fresh RenderedContext
  const ctx: RenderedContext = {
    name: '',
    prompt: '',
    tools: [],
    dataViews: [],
    metadata: {}
  };

  // Execute component if it's a function
  const element = typeof component === 'function'
    ? await component()
    : component;

  // Walk the JSX tree
  await walkJSX(element, ctx);

  // Build the final prompt using buildPrompt
  ctx.prompt = buildPrompt(ctx);

  return ctx;
}

/**
 * Recursively traverse the JSX tree and populate the RenderedContext
 * @param node - The current JSX node to process
 * @param ctx - The RenderedContext to populate
 */
export async function walkJSX(node: unknown, ctx: RenderedContext): Promise<void> {
  // Handle null/undefined
  if (node === null || node === undefined) {
    return;
  }

  // Handle Arrays - iterate each element
  if (Array.isArray(node)) {
    for (const item of node) {
      await walkJSX(item, ctx);
    }
    return;
  }

  // Handle primitive values - skip them
  if (typeof node !== 'object') {
    return;
  }

  const element = node as JSXElement;

  // Handle function components - execute and recurse
  if (typeof element.type === 'function') {
    const result = await element.type(element.props);
    return walkJSX(result, ctx);
  }

  // Handle built-in types
  switch (element.type) {
    case 'Context':
      await handleContext(element.props as unknown as ContextProps, ctx);
      break;

    case 'Text':
      handleText(element.props as unknown as TextProps, ctx);
      break;

    case 'Data':
      await handleData(element.props as unknown as DataProps, ctx);
      break;

    case 'Tool':
      handleTool(element.props as unknown as ToolProps, ctx);
      break;

    case 'Group':
      await handleGroup(element.props as unknown as GroupProps, ctx);
      break;

    case 'Example':
      handleExample(element.props as unknown as ExampleProps, ctx);
      break;

    default:
      // Unknown types - process children if any
      if (element.props?.children) {
        await walkJSX(element.props.children, ctx);
      }
      break;
  }
}

/**
 * Handle Context component - set name/description and process children
 */
async function handleContext(props: ContextProps, ctx: RenderedContext): Promise<void> {
  ctx.name = props.name;
  ctx.description = props.description || '';
  ctx.metadata = props.metadata as RenderedContext['metadata'];

  if (props.children) {
    await walkJSX(props.children, ctx);
  }
}

/**
 * Handle Text component - append formatted text to prompt
 */
function handleText(props: TextProps, ctx: RenderedContext): void {
  const text = formatText(props.children);
  if (text) {
    ctx.prompt += text + '\n';
  }
}

/**
 * Handle Data component - add to dataViews and append formatted data to prompt
 */
async function handleData(props: DataProps, ctx: RenderedContext): Promise<void> {
  // Resolve data source
  let data: unknown[] = [];
  if (typeof props.source === 'string') {
    // Fetch data from URL
    try {
      const response = await fetch(props.source);
      const json = await response.json();
      data = Array.isArray(json) ? json : [json];
    } catch {
      data = [];
    }
  } else if (Array.isArray(props.source)) {
    data = props.source as unknown[];
  } else if (props.source !== undefined) {
    data = [props.source];
  }

  // Create data view
  const dataView: DataView = {
    source: data,
    format: (props.format as DataView['format']) || 'json',
    fields: props.fields,
    title: props.title
  };

  ctx.dataViews.push(dataView);

  // Append formatted data to prompt
  const formattedData = formatDataPrompt(data, props);
  ctx.prompt += formattedData + '\n';
}

/**
 * Handle Tool component - add to tools array
 */
function handleTool(props: ToolProps, ctx: RenderedContext): void {
  const toolDef = createToolDefinition(props);
  ctx.tools.push(toolDef);
}

/**
 * Handle Group component - append title header and process children
 */
async function handleGroup(props: GroupProps, ctx: RenderedContext): Promise<void> {
  if (props.title) {
    ctx.prompt += `\n## ${props.title}\n`;
  }

  if (props.children) {
    await walkJSX(props.children, ctx);
  }
}

/**
 * Handle Example component - append formatted example to prompt
 */
function handleExample(props: ExampleProps, ctx: RenderedContext): void {
  const formattedExample = formatExample(props);
  ctx.prompt += formattedExample + '\n';
}

/**
 * Format text content from various types
 */
export function formatText(children: unknown): string {
  if (children === null || children === undefined) {
    return '';
  }

  if (typeof children === 'string') {
    return children;
  }

  if (typeof children === 'number') {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map(formatText).join('');
  }

  return '';
}

/**
 * Format data for the prompt based on format type
 */
export function formatDataPrompt(data: unknown[], props: DataProps): string {
  if (props.render) {
    return formatCustomList(data, props.render as (item: unknown, index: number) => string);
  }

  const format = props.format || 'json';

  switch (format) {
    case 'table':
      return formatTable(data, props.fields);
    case 'list':
      return formatList(data, props.fields);
    case 'csv':
      return formatCSV(data, props.fields);
    case 'tree':
      return formatTree(data);
    case 'json':
    default:
      return formatJSON(data, props.fields);
  }
}

/**
 * Format data using a custom item renderer
 */
export function formatCustomList(
  data: unknown[],
  renderItem: (item: unknown, index: number) => string
): string {
  if (!Array.isArray(data) || data.length === 0) {
    return '*(No data)*';
  }

  return data
    .map((item, index) => {
      try {
        return renderItem(item, index);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `[Render Error #${index + 1}] ${message}`;
      }
    })
    .join('\n');
}

/**
 * Format data as a markdown table
 */
export function formatTable(data: unknown[], fields?: string[]): string {
  if (!Array.isArray(data) || data.length === 0) {
    return '*(No data)*';
  }

  // Determine fields to display
  const displayFields = fields || Object.keys(data[0] as object);

  if (displayFields.length === 0) {
    return '*(No fields)*';
  }

  // Build header
  const header = '| ' + displayFields.join(' | ') + ' |';
  const separator = '|' + displayFields.map(() => ' --- |').join('');

  // Build rows
  const rows = data.map(item => {
    const values = displayFields.map(field => {
      const value = (item as Record<string, unknown>)[field];
      return formatCellValue(value);
    });
    return '| ' + values.join(' | ') + ' |';
  });

  return [header, separator, ...rows].join('\n');
}

/**
 * Format a single cell value for table display
 */
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Format data as a list
 */
export function formatList(data: unknown[], fields?: string[]): string {
  if (!Array.isArray(data) || data.length === 0) {
    return '*(No data)*';
  }

  return data.map((item, index) => {
    if (typeof item === 'object' && item !== null) {
      const displayFields = fields || Object.keys(item);
      const values = displayFields.map(field => {
        const value = (item as Record<string, unknown>)[field];
        return `${field}: ${formatCellValue(value)}`;
      });
      return `${index + 1}. ${values.join(', ')}`;
    }
    return `${index + 1}. ${String(item)}`;
  }).join('\n');
}

/**
 * Format data as CSV
 */
function formatCSV(data: unknown[], fields?: string[]): string {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  const displayFields = fields || Object.keys(data[0] as object);

  // Header
  const header = displayFields.join(',');

  // Rows
  const rows = data.map(item => {
    return displayFields.map(field => {
      const value = (item as Record<string, unknown>)[field];
      const str = formatCellValue(value);
      // Escape commas and quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Format data as a tree structure
 */
export function formatTree(data: unknown, indent: number = 0): string {
  if (data === null || data === undefined) {
    return '';
  }

  if (typeof data !== 'object') {
    return '  '.repeat(indent) + String(data);
  }

  if (Array.isArray(data)) {
    return data.map((item, index) => {
      const prefix = '  '.repeat(indent) + `[${index}]: `;
      if (typeof item === 'object' && item !== null) {
        return prefix + '\n' + formatTree(item, indent + 1);
      }
      return '  '.repeat(indent) + `[${index}]: ${String(item)}`;
    }).join('\n');
  }

  const entries = Object.entries(data);
  return entries.map(([key, value]) => {
    const prefix = '  '.repeat(indent) + key + ': ';
    if (typeof value === 'object' && value !== null) {
      return prefix + '\n' + formatTree(value, indent + 1);
    }
    return prefix + String(value);
  }).join('\n');
}

/**
 * Format data as JSON string
 */
export function formatJSON(data: unknown[], fields?: string[]): string {
  if (!Array.isArray(data)) {
    return JSON.stringify(data, null, 2);
  }

  if (fields && fields.length > 0) {
    // Filter to only specified fields
    const filtered = data.map(item => {
      if (typeof item !== 'object' || item === null) {
        return item;
      }
      const filteredItem: Record<string, unknown> = {};
      for (const field of fields) {
        if (field in item) {
          filteredItem[field] = (item as Record<string, unknown>)[field];
        }
      }
      return filteredItem;
    });
    return JSON.stringify(filtered, null, 2);
  }

  return JSON.stringify(data, null, 2);
}

/**
 * Create a ToolDefinition from ToolProps
 */
export function createToolDefinition(props: ToolProps): AgentTool {
  return props;
}

/**
 * Format an Example component for the prompt
 */
export function formatExample(props: ExampleProps): string {
  const lines: string[] = [];

  if (props.title) {
    lines.push(`### Example: ${props.title}`);
  }

  // Handle input/output format (for LLM examples)
  if (props.input !== undefined || props.output !== undefined) {
    if (props.description) {
      lines.push(`_${props.description}_`);
    }
    if (props.input) {
      lines.push(`\n**Input:**\n${props.input}`);
    }
    if (props.output) {
      lines.push(`\n**Output:**\n${props.output}`);
    }
    return lines.join('\n');
  }

  // Handle regular content format
  const content = formatText(props.children);
  if (props.description) {
    lines.push(`_${props.description}_`);
  }
  if (content) {
    lines.push(content);
  }

  return lines.join('\n');
}
