import { extname } from "node:path";
import { MEDIA_INSPECT } from "../tokens.js";
import type { OSService } from "../types/os.js";

export interface MediaInspectRequest {
	path: string;
}

export interface MediaInspectResult {
	path: string;
	ext: string;
	mime: string;
	kind: "image" | "audio" | "video" | "unknown";
}

function resolveKind(mime: string): MediaInspectResult["kind"] {
	if (mime.startsWith("image/")) return "image";
	if (mime.startsWith("audio/")) return "audio";
	if (mime.startsWith("video/")) return "video";
	return "unknown";
}

function detectMimeFromExt(path: string): string {
	const ext = extname(path).toLowerCase();
	switch (ext) {
		case ".jpg":
		case ".jpeg":
			return "image/jpeg";
		case ".png":
			return "image/png";
		case ".gif":
			return "image/gif";
		case ".webp":
			return "image/webp";
		case ".mp3":
			return "audio/mpeg";
		case ".wav":
			return "audio/wav";
		case ".mp4":
			return "video/mp4";
		case ".webm":
			return "video/webm";
		default:
			return "application/octet-stream";
	}
}

export class MediaService {
	inspect(path: string): MediaInspectResult {
		const mime = detectMimeFromExt(path);
		return {
			path,
			ext: extname(path).toLowerCase(),
			mime,
			kind: resolveKind(mime),
		};
	}
}

export function createMediaInspectService(service: MediaService): OSService<MediaInspectRequest, MediaInspectResult> {
	return {
		name: MEDIA_INSPECT,
		requiredPermissions: ["media:read"],
		execute: async (req) => service.inspect(req.path),
	};
}
