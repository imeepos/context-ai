import { InjectionToken } from "@context-ai/core";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

export interface NovelChapter {
	id: string;
	title: string;
	content: string;
	summary: string;
	issues: string[];
	reviewCount: number;
	rewriteCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface Novel {
	id: string;
	name: string;
	description: string;
	summary: string;
	outline: string;
	chapters: NovelChapter[];
	createdAt: string;
	updatedAt: string;
}

export interface NovelChangeLog {
	sessionId: string;
	name: string;
	description: string;
	time: string;
	tiem: string;
}

export interface NovelStoreData {
	novels: Novel[];
	logs: NovelChangeLog[];
}

export interface NovelStoreService {
	load(): NovelStoreData;
	save(data: NovelStoreData): void;
}

export const NOVEL_STORE_SERVICE = new InjectionToken<NovelStoreService>("NOVEL_STORE_SERVICE");

interface PersistedChapterMeta {
	id: string;
	title: string;
	summary: string;
	issues: string[];
	reviewCount: number;
	rewriteCount: number;
	createdAt: string;
	updatedAt: string;
	file: string;
}

interface PersistedNovelMeta {
	id: string;
	name: string;
	description: string;
	summary: string;
	outline: string;
	createdAt: string;
	updatedAt: string;
	chapters: PersistedChapterMeta[];
}

interface PersistedCatalogEntry {
	id: string;
	name: string;
	description: string;
	updatedAt: string;
	chapters: number;
	dir: string;
}

function createEmptyStoreData(): NovelStoreData {
	return {
		novels: [],
		logs: [],
	};
}

function cloneStoreData(data: NovelStoreData): NovelStoreData {
	return JSON.parse(JSON.stringify(data)) as NovelStoreData;
}

function safeJsonParse<T>(raw: string, fallback: T): T {
	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

function ensureDir(path: string): void {
	if (!existsSync(path)) {
		mkdirSync(path, { recursive: true });
	}
}

function safeSegment(input: string): string {
	return input.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

function listDirs(path: string): string[] {
	if (!existsSync(path)) return [];
	return readdirSync(path)
		.map((name) => join(path, name))
		.filter((fullPath) => {
			try {
				return statSync(fullPath).isDirectory();
			} catch {
				return false;
			}
		});
}

export function getDefaultNovelStorageRoot(): string {
	return join(homedir(), ".context-ai", "addons", "novel");
}

export class MemoryNovelStoreService implements NovelStoreService {
	private data: NovelStoreData = createEmptyStoreData();

	load(): NovelStoreData {
		return cloneStoreData(this.data);
	}

	save(data: NovelStoreData): void {
		this.data = cloneStoreData(data);
	}
}

export class FileNovelStoreService implements NovelStoreService {
	constructor(private readonly storageRoot: string = getDefaultNovelStorageRoot()) {}

	load(): NovelStoreData {
		return {
			novels: this.readNovels(),
			logs: this.readLogs(),
		};
	}

	save(data: NovelStoreData): void {
		ensureDir(this.storageRoot);
		const novelsRoot = this.getNovelsRoot();
		ensureDir(novelsRoot);

		const keepNovelDirs = new Set<string>();
		const catalog: PersistedCatalogEntry[] = [];

		for (const novel of data.novels) {
			const dirName = safeSegment(novel.id);
			const novelDir = join(novelsRoot, dirName);
			const chaptersDir = join(novelDir, "chapters");
			ensureDir(chaptersDir);

			const chapterMetas: PersistedChapterMeta[] = [];
			const keepChapterFiles = new Set<string>();

			for (const chapter of novel.chapters) {
				const chapterFileName = `${safeSegment(chapter.id)}.md`;
				writeFileSync(join(chaptersDir, chapterFileName), chapter.content, "utf8");
				chapterMetas.push({
					id: chapter.id,
					title: chapter.title,
					summary: chapter.summary,
					issues: chapter.issues,
					reviewCount: chapter.reviewCount,
					rewriteCount: chapter.rewriteCount,
					createdAt: chapter.createdAt,
					updatedAt: chapter.updatedAt,
					file: chapterFileName,
				});
				keepChapterFiles.add(chapterFileName);
			}

			if (existsSync(chaptersDir)) {
				for (const fileName of readdirSync(chaptersDir)) {
					if (!keepChapterFiles.has(fileName)) {
						rmSync(join(chaptersDir, fileName), { force: true });
					}
				}
			}

			const meta: PersistedNovelMeta = {
				id: novel.id,
				name: novel.name,
				description: novel.description,
				summary: novel.summary,
				outline: novel.outline,
				createdAt: novel.createdAt,
				updatedAt: novel.updatedAt,
				chapters: chapterMetas,
			};
			writeFileSync(join(novelDir, "novel.json"), JSON.stringify(meta, null, 2), "utf8");

			keepNovelDirs.add(dirName);
			catalog.push({
				id: novel.id,
				name: novel.name,
				description: novel.description,
				updatedAt: novel.updatedAt,
				chapters: novel.chapters.length,
				dir: dirName,
			});
		}

		for (const fullPath of listDirs(novelsRoot)) {
			const dirName = basename(fullPath);
			if (!keepNovelDirs.has(dirName)) {
				rmSync(fullPath, { recursive: true, force: true });
			}
		}

		writeFileSync(this.getCatalogPath(), JSON.stringify(catalog, null, 2), "utf8");
		this.writeLogs(data.logs);
	}

	private getNovelsRoot(): string {
		return join(this.storageRoot, "novels");
	}

	private getLogsPath(): string {
		return join(this.storageRoot, "logs.json");
	}

	private getCatalogPath(): string {
		return join(this.storageRoot, "catalog.json");
	}

	private readLogs(): NovelChangeLog[] {
		const logsPath = this.getLogsPath();
		if (!existsSync(logsPath)) return [];
		const logs = safeJsonParse<NovelChangeLog[]>(readFileSync(logsPath, "utf8"), []);
		return Array.isArray(logs) ? logs : [];
	}

	private writeLogs(logs: NovelChangeLog[]): void {
		ensureDir(this.storageRoot);
		writeFileSync(this.getLogsPath(), JSON.stringify(logs, null, 2), "utf8");
	}

	private readNovels(): Novel[] {
		const novelsRoot = this.getNovelsRoot();
		if (!existsSync(novelsRoot)) return [];

		const catalogPath = this.getCatalogPath();
		if (existsSync(catalogPath)) {
			const catalog = safeJsonParse<PersistedCatalogEntry[]>(readFileSync(catalogPath, "utf8"), []);
			if (Array.isArray(catalog)) {
				const novels = catalog
					.map((entry) => this.readNovelFromDir(join(novelsRoot, entry.dir)))
					.filter((item): item is Novel => Boolean(item));
				if (novels.length > 0) return novels;
			}
		}

		return listDirs(novelsRoot)
			.map((dir) => this.readNovelFromDir(dir))
			.filter((item): item is Novel => Boolean(item));
	}

	private readNovelFromDir(novelDir: string): Novel | undefined {
		const metaPath = join(novelDir, "novel.json");
		if (!existsSync(metaPath)) return undefined;
		const meta = safeJsonParse<PersistedNovelMeta | undefined>(readFileSync(metaPath, "utf8"), undefined);
		if (!meta || !Array.isArray(meta.chapters)) return undefined;

		const chapters: NovelChapter[] = meta.chapters.map((chapterMeta) => {
			const chapterPath = join(novelDir, "chapters", chapterMeta.file);
			const content = existsSync(chapterPath) ? readFileSync(chapterPath, "utf8") : "";
			return {
				id: chapterMeta.id,
				title: chapterMeta.title,
				content,
				summary: chapterMeta.summary ?? "",
				issues: Array.isArray(chapterMeta.issues) ? chapterMeta.issues : [],
				reviewCount: typeof chapterMeta.reviewCount === "number" ? chapterMeta.reviewCount : 0,
				rewriteCount: typeof chapterMeta.rewriteCount === "number" ? chapterMeta.rewriteCount : 0,
				createdAt: chapterMeta.createdAt,
				updatedAt: chapterMeta.updatedAt,
			};
		});

		return {
			id: meta.id,
			name: meta.name,
			description: meta.description,
			summary: meta.summary,
			outline: meta.outline,
			chapters,
			createdAt: meta.createdAt,
			updatedAt: meta.updatedAt,
		};
	}
}

export function getSessionIdFromPath(sessionFilePath: string): string {
	const fileName = basename(sessionFilePath);
	return fileName.replace(/\.[^.]+$/, "") || "unknown-session";
}

export function nowIso(): string {
	return new Date().toISOString();
}

export function createId(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function addLog(data: NovelStoreData, sessionId: string, name: string, description: string): void {
	const time = nowIso();
	data.logs.push({
		sessionId,
		name,
		description,
		time,
		tiem: time,
	});
	if (data.logs.length > 2000) {
		data.logs = data.logs.slice(data.logs.length - 2000);
	}
}
