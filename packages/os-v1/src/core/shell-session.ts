import { Inject, Injectable } from "@context-ai/core";
import { SHELL_SESSION_FILE } from "../tokens.js";
import * as fs from "node:fs";
import * as path from "node:path";

type SessionEnvObject = { value: string; description?: string };
type SessionEnvValue = SessionEnvObject | string;
type SessionEnvRecord = Record<string, SessionEnvValue>;

@Injectable()
export class ShellSessionStore {

    constructor(@Inject(SHELL_SESSION_FILE) public readonly sessionFile: string) { }

    getEnv() {
        const env = this.get();
        const object: Record<string, string> = {};

        Object.keys(env).forEach((key) => {
            const val = env[key];
            if (typeof val === "string") {
                object[key] = val;
                return;
            }
            if (typeof val?.value === "string") {
                object[key] = val.value;
            }
        });

        return object;
    }

    /**
     * Gets the current environment for the given session.
     * @returns The current environment for the given session.
     */
    get(): SessionEnvRecord {
        try {
            if (!fs.existsSync(this.sessionFile)) {
                return {};
            }
            const content = fs.readFileSync(this.sessionFile, "utf-8");
            return JSON.parse(content);
        } catch (error) {
            console.error(`Failed to read session file: ${this.sessionFile}`, error);
            return {};
        }
    }

    /**
     * Sets the current environment for the given session.
     * @param env The environment to set.
     */
    set(env: SessionEnvRecord): void {
        try {
            const dir = path.dirname(this.sessionFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const normalized: Record<string, SessionEnvObject> = {};
            Object.keys(env).forEach((key) => {
                const val = env[key]!;
                if (typeof val === "string") {
                    normalized[key] = { value: val };
                    return;
                }
                normalized[key] = val;
            });

            const content = JSON.stringify(normalized, null, 2);
            fs.writeFileSync(this.sessionFile, content, "utf-8");
        } catch (error) {
            console.error(`Failed to write session file: ${this.sessionFile}`, error);
            throw error;
        }
    }

    /**
     * Sets an environment variable for the given session.
     * @param key The key of the environment variable to set.
     * @param value The value of the environment variable to set.
     */
    setVar(key: string, value: string, description?: string): void {
        const env = this.get();
        env[key] = { value, description };
        this.set(env);
    }

    /**
     * Unsets an environment variable for the given session.
     * @param key The key of the environment variable to unset.
     */
    unsetVar(key: string): void {
        const env = this.get();
        delete env[key];
        this.set(env);
    }
}
