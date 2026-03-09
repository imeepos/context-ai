import { Inject, Injectable } from "@context-ai/core";
import { SHELL_SESSION_FILE } from "../tokens.js";
import * as fs from "node:fs";
import * as path from "node:path";

@Injectable()
export class ShellSessionStore {

    constructor(@Inject(SHELL_SESSION_FILE) private readonly sessionFile: string) { }
    getEnv() {
        const env = this.get();
        const object: Record<string, string> = {}
        Object.keys(env).map(key => {
            const val = env[key]!;
            object[key] = val.value
        })
        return object;
    }
    /**
     * Gets the current environment for the given session.
     * @returns The current environment for the given session.
     */
    get(): Record<string, { value: string, description?: string }> {
        try {
            // 检查文件是否存在
            if (!fs.existsSync(this.sessionFile)) {
                return {};
            }
            // 读取并解析 JSON 文件
            const content = fs.readFileSync(this.sessionFile, "utf-8");
            return JSON.parse(content)
        } catch (error) {
            // 文件损坏或解析失败时返回空对象
            console.error(`Failed to read session file: ${this.sessionFile}`, error);
            return {};
        }
    }

    /**
     * Sets the current environment for the given session.
     * @param env The environment to set.
     */
    set(env: Record<string, { value: string, description?: string }>): void {
        try {
            // 确保父目录存在
            const dir = path.dirname(this.sessionFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            // 写入 JSON 文件，格式化输出
            const content = JSON.stringify(env, null, 2);
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
