import type { OSErrorCode } from "../types/os.js";

export class OSError extends Error {
	readonly code: OSErrorCode;

	constructor(code: OSErrorCode, message: string) {
		super(message);
		this.name = "OSError";
		this.code = code;
	}
}
