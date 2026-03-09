import * as fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import * as nodeOs from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createDefaultLLMOS,
  type AppManifestV1,
  type OSContext,
} from '@context-ai/os';
import { render } from '@context-ai/ctp';
import { createAgent, subscribeAgentEvents } from '@context-ai/agent';
import { createTodoContext } from '../context/createTodoContext.js';
import { createTodoRepository } from '../todo/repository.js';
import { createTodoService } from '../todo/service.js';
import { TodoRuntimeContext } from '../runtime/TodoRuntimeContext.js';

export const TODO_APP_ID = 'app.todo';
export const TODO_ROUTE = 'app.todo://main';
export const TODO_STORE_KEY = 'app.todo.store.v1';

const INSTALL_ROOT_DIR = path.join(nodeOs.homedir(), '.context-ai', 'os', 'apps');
const STORE_FILE = path.join(nodeOs.homedir(), '.context-ai', 'todo', 'os-store.json');
const DEFAULT_MANIFEST_XML_PATH = resolveDefaultManifestPath();

export type TodoOSRuntime = {
  appId: string;
  route: string;
  storeKey: string;
  os: ReturnType<typeof createDefaultLLMOS>;
  installerContext: OSContext;
  appContext: OSContext;
  install: (manifestXmlPath?: string) => Promise<{ installed: boolean; appId: string; manifestPath: string }>;
  start: () => Promise<void>;
  run: (prompt: string) => Promise<string>;
};

export async function createTodoOSRuntime(): Promise<TodoOSRuntime> {
  const os = createDefaultLLMOS({
    pathPolicy: {
      allow: [process.cwd(), INSTALL_ROOT_DIR, path.dirname(STORE_FILE)],
      deny: [],
    },
  });
  await os.storeService.loadFromFile(STORE_FILE);

  const installerContext: OSContext = {
    appId: 'app.system.installer',
    sessionId: 'todo-install-session',
    permissions: ['app:manage', 'app:read', 'store:read', 'store:write'],
    workingDirectory: process.cwd(),
  };
  const appContext: OSContext = {
    appId: TODO_APP_ID,
    sessionId: 'todo-app-session',
    permissions: ['app:read', 'store:read', 'store:write'],
    workingDirectory: process.cwd(),
  };

  const repository = createTodoRepository(os.kernel, appContext, TODO_STORE_KEY);
  const todoService = createTodoService(repository);
  let started = false;

  async function install(manifestXmlPath = DEFAULT_MANIFEST_XML_PATH): Promise<{ installed: boolean; appId: string; manifestPath: string }> {
    const xml = await fs.readFile(manifestXmlPath, 'utf8');
    const manifest = parseManifestXml(xml);
    const appInstallDir = path.join(INSTALL_ROOT_DIR, manifest.id);
    const targetManifestPath = path.join(appInstallDir, 'manifest.xml');

    await fs.mkdir(appInstallDir, { recursive: true });
    await fs.writeFile(targetManifestPath, xml, 'utf8');

    const installed = await installManifestIntoKernel(manifest);
    return {
      installed,
      appId: manifest.id,
      manifestPath: targetManifestPath,
    };
  }

  async function installManifestIntoKernel(manifest: AppManifestV1): Promise<boolean> {
    const listed = await os.kernel.execute<{ _: 'list' }, { apps: Array<{ id: string }> }>(
      'app.list',
      { _: 'list' },
      installerContext
    );
    const exists = listed.apps.some((app) => app.id === manifest.id);
    if (exists) {
      return false;
    }
    await os.kernel.execute('app.install.v1', { manifest }, installerContext);
    return true;
  }

  async function loadInstalledAppsFromDisk(): Promise<void> {
    await fs.mkdir(INSTALL_ROOT_DIR, { recursive: true });
    const entries = await fs.readdir(INSTALL_ROOT_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const manifestPath = path.join(INSTALL_ROOT_DIR, entry.name, 'manifest.xml');
      try {
        const xml = await fs.readFile(manifestPath, 'utf8');
        const manifest = parseManifestXml(xml);
        await installManifestIntoKernel(manifest);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to load installed app manifest: ${manifestPath}. ${message}`);
      }
    }
  }

  async function ensureTargetAppLoaded(appId: string): Promise<void> {
    const listed = await os.kernel.execute<{ _: 'list' }, { apps: Array<{ id: string }> }>(
      'app.list',
      { _: 'list' },
      installerContext
    );
    const exists = listed.apps.some((app) => app.id === appId);
    if (!exists) {
      throw new Error(`App ${appId} is not installed. Please call install() first.`);
    }
  }

  async function start(): Promise<void> {
    if (started) return;
    await loadInstalledAppsFromDisk();
    await ensureTargetAppLoaded(TODO_APP_ID);
    await os.kernel.execute('app.start', { appId: TODO_APP_ID }, appContext);
    started = true;
  }

  async function run(prompt: string): Promise<string> {
    if (!started) {
      throw new Error('Runtime is not started. Call start() before run(prompt).');
    }
    const runtimeContext = new TodoRuntimeContext({
      appId: appContext.appId,
      sessionId: appContext.sessionId,
      route: TODO_ROUTE,
      todoService,
    });
    const ctx = await render(await createTodoContext(runtimeContext));
    const agent = createAgent(ctx.prompt, ctx.tools);
    subscribeAgentEvents(agent);
    await agent.prompt(prompt);
    await agent.waitForIdle();

    const latest = await render(await createTodoContext(runtimeContext));
    await os.storeService.saveToFile(STORE_FILE);
    return latest.prompt;
  }

  return {
    appId: TODO_APP_ID,
    route: TODO_ROUTE,
    storeKey: TODO_STORE_KEY,
    os,
    installerContext,
    appContext,
    install,
    start,
    run,
  };
}

function parseManifestXml(xml: string): AppManifestV1 {
  const appTag = matchFirst(xml, /<application\b([^>]*)>/i, 'application');
  const appAttrs = parseAttributes(appTag[1] ?? '');
  const id = requiredValue(appAttrs.id, 'application.id');
  const name = requiredValue(appAttrs.name, 'application.name');
  const version = requiredValue(appAttrs.version, 'application.version');

  const pageMatches = [...xml.matchAll(/<page\b([\s\S]*?)\/>/gi)];
  if (pageMatches.length === 0) {
    throw new Error('Manifest XML requires at least one <page /> entry.');
  }
  const pages = pageMatches.map((match) => {
    const attrs = parseAttributes(match[1] ?? '');
    return {
      id: requiredValue(attrs.id, 'page.id'),
      route: requiredValue(attrs.route, 'page.route'),
      name: requiredValue(attrs.name, 'page.name'),
      description: requiredValue(attrs.description, 'page.description'),
      path: requiredValue(attrs.path, 'page.path'),
      default: (attrs.default ?? '').toLowerCase() === 'true',
    };
  });

  const permissions = [...xml.matchAll(/<permission>([\s\S]*?)<\/permission>/gi)]
    .map((match) => decodeXml((match[1] ?? '').trim()))
    .filter((value) => value.length > 0);

  const metadataEntries = [...xml.matchAll(/<item\b([\s\S]*?)\/>/gi)];
  const metadata: Record<string, string> = {};
  for (const entry of metadataEntries) {
    const attrs = parseAttributes(entry[1] ?? '');
    const key = attrs.key?.trim();
    const value = attrs.value?.trim();
    if (!key || value === undefined) {
      continue;
    }
    metadata[key] = decodeXml(value);
  }

  return {
    id,
    name,
    version,
    entry: { pages },
    permissions,
    metadata,
  };
}

function parseAttributes(input: string): Record<string, string> {
  const result: Record<string, string> = {};
  const regex = /([a-zA-Z_:][\w:.-]*)\s*=\s*"([^"]*)"/g;
  for (const match of input.matchAll(regex)) {
    const key = match[1];
    const value = match[2] ?? '';
    result[key] = decodeXml(value);
  }
  return result;
}

function matchFirst(input: string, pattern: RegExp, label: string): RegExpMatchArray {
  const match = input.match(pattern);
  if (!match) {
    throw new Error(`Manifest XML missing <${label}> tag.`);
  }
  return match;
}

function requiredValue(value: string | undefined, field: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`Manifest XML missing required field: ${field}`);
  }
  return normalized;
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function resolveDefaultManifestPath(): string {
  const distCandidate = fileURLToPath(new URL('../manifest.xml', import.meta.url));
  if (existsSync(distCandidate)) {
    return distCandidate;
  }
  const packageRootCandidate = fileURLToPath(new URL('../../manifest.xml', import.meta.url));
  return packageRootCandidate;
}
