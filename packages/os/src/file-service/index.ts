import { readdir, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import type { PolicyEngine } from "../kernel/policy-engine.js";
import type { OSContext, OSService } from "../types/os.js";
import { FileGuard } from "./guard.js";
import { SnapshotStore } from "./snapshot.js";
import { atomicWrite } from "./transaction.js";

export interface FileReadRequest {
	path: string;
}

export interface FileWriteRequest {
	path: string;
	content: string;
}

export interface FileSnapshotRequest {
	snapshotId: string;
	path: string;
}

export interface FileListRequest {
	path: string;
}

export interface FileFindRequest {
	path: string;
	nameContains: string;
}

export interface FileGrepRequest {
	path: string;
	pattern: string;
}

export interface FileEditRequest {
	path: string;
	search: string;
	replace: string;
}

export class FileService {
	readonly guard: FileGuard;
	readonly snapshots: SnapshotStore;

	constructor(policy: PolicyEngine) {
		this.guard = new FileGuard(policy);
		this.snapshots = new SnapshotStore();
	}

	async read(req: FileReadRequest, ctx: OSContext): Promise<string> {
		const path = resolve(req.path);
		this.guard.assertPathAllowed(path, ctx);
		return readFile(path, "utf8");
	}

	async write(req: FileWriteRequest, ctx: OSContext): Promise<void> {
		const path = resolve(req.path);
		this.guard.assertPathAllowed(path, ctx);
		await atomicWrite(path, req.content);
	}

	async snapshot(req: FileSnapshotRequest, ctx: OSContext): Promise<void> {
		const path = resolve(req.path);
		this.guard.assertPathAllowed(path, ctx);
		await this.snapshots.capture(req.snapshotId, path);
	}

	async rollback(snapshotId: string): Promise<void> {
		await this.snapshots.rollback(snapshotId);
	}

	async list(req: FileListRequest, ctx: OSContext): Promise<string[]> {
		const path = resolve(req.path);
		this.guard.assertPathAllowed(path, ctx);
		return readdir(path);
	}

	async find(req: FileFindRequest, ctx: OSContext): Promise<string[]> {
		const root = resolve(req.path);
		this.guard.assertPathAllowed(root, ctx);
		const results: string[] = [];
		const visit = async (dir: string): Promise<void> => {
			const entries = await readdir(dir, { withFileTypes: true });
			for (const entry of entries) {
				const fullPath = join(dir, entry.name);
				if (entry.isDirectory()) {
					await visit(fullPath);
				} else if (basename(fullPath).includes(req.nameContains)) {
					results.push(fullPath);
				}
			}
		};
		await visit(root);
		return results;
	}

	async grep(req: FileGrepRequest, ctx: OSContext): Promise<Array<{ line: number; text: string }>> {
		const path = resolve(req.path);
		this.guard.assertPathAllowed(path, ctx);
		const content = await readFile(path, "utf8");
		const lines = content.split(/\r?\n/);
		const matches: Array<{ line: number; text: string }> = [];
		lines.forEach((lineText, index) => {
			if (lineText.includes(req.pattern)) {
				matches.push({ line: index + 1, text: lineText });
			}
		});
		return matches;
	}

	async edit(req: FileEditRequest, ctx: OSContext): Promise<{ changed: boolean }> {
		const path = resolve(req.path);
		this.guard.assertPathAllowed(path, ctx);
		const content = await readFile(path, "utf8");
		if (!content.includes(req.search)) {
			return { changed: false };
		}
		const next = content.replaceAll(req.search, req.replace);
		await atomicWrite(path, next);
		return { changed: true };
	}
}

export function createFileReadService(fileService: FileService): OSService<FileReadRequest, { content: string }> {
	return {
		name: "file.read",
		requiredPermissions: ["file:read"],
		execute: async (req, ctx) => {
			const content = await fileService.read(req, ctx);
			return { content };
		},
	};
}

export function createFileWriteService(fileService: FileService): OSService<FileWriteRequest, { ok: true }> {
	return {
		name: "file.write",
		requiredPermissions: ["file:write"],
		execute: async (req, ctx) => {
			await fileService.write(req, ctx);
			return { ok: true };
		},
	};
}

export function createFileListService(fileService: FileService): OSService<FileListRequest, { entries: string[] }> {
	return {
		name: "file.list",
		requiredPermissions: ["file:read"],
		execute: async (req, ctx) => ({
			entries: await fileService.list(req, ctx),
		}),
	};
}

export function createFileFindService(fileService: FileService): OSService<FileFindRequest, { paths: string[] }> {
	return {
		name: "file.find",
		requiredPermissions: ["file:read"],
		execute: async (req, ctx) => ({
			paths: await fileService.find(req, ctx),
		}),
	};
}

export function createFileGrepService(
	fileService: FileService,
): OSService<FileGrepRequest, { matches: Array<{ line: number; text: string }> }> {
	return {
		name: "file.grep",
		requiredPermissions: ["file:read"],
		execute: async (req, ctx) => ({
			matches: await fileService.grep(req, ctx),
		}),
	};
}

export function createFileEditService(fileService: FileService): OSService<FileEditRequest, { changed: boolean }> {
	return {
		name: "file.edit",
		requiredPermissions: ["file:write"],
		execute: async (req, ctx) => fileService.edit(req, ctx),
	};
}
