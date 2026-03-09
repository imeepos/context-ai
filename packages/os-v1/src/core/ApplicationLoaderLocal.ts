import type { Application, ApplicationLoader } from "../tokens.js";
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { pathToFileURL } from 'url';

/**
 * 从本地文件夹加载应用
 *
 * 扫描指定目录下的所有子文件夹，每个子文件夹代表一个应用
 * 每个应用必须包含 index.ts 或 index.js 作为入口文件
 * 入口文件必须 default export 一个符合 Application 接口的对象
 */
export class ApplicationLoaderLocal implements ApplicationLoader {
    constructor(private applicationDir: string) { }

    async load(): Promise<Application[]> {
        const applications: Application[] = [];

        try {
            // step1: 列出应用目录下的所有子目录
            const entries = await readdir(this.applicationDir, { withFileTypes: true });
            const appDirs = entries.filter(entry => entry.isDirectory());

            // step2: 遍历每个应用目录，加载入口文件
            for (const appDir of appDirs) {
                try {
                    const appPath = join(this.applicationDir, appDir.name);
                    const app = await this.loadApplication(appPath);
                    if (app) {
                        applications.push(app);
                    }
                } catch (error) {
                    console.warn(`Failed to load application from ${appDir.name}:`, error);
                }
            }

            // step3: 返回加载的应用列表
            return applications;
        } catch (error) {
            console.error(`Failed to read application directory ${this.applicationDir}:`, error);
            return [];
        }
    }

    /**
     * 加载单个应用
     * 尝试加载 index.ts 或 index.js
     */
    private async loadApplication(appPath: string): Promise<Application | null> {
        const possibleEntries = ['index.js'];

        for (const entry of possibleEntries) {
            const entryPath = join(appPath, entry);

            try {
                await stat(entryPath);
                const fileUrl = pathToFileURL(entryPath).href;
                const module = await import(fileUrl);

                if (module.default && this.isValidApplication(module.default)) {
                    return module.default as Application;
                }
            } catch (error) {
                continue;
            }
        }

        return null;
    }

    /**
     * 验证对象是否符合 Application 接口
     */
    private isValidApplication(obj: any): boolean {
        return (
            obj &&
            typeof obj === 'object' &&
            typeof obj.name === 'string' &&
            typeof obj.description === 'string' &&
            typeof obj.version === 'string' &&
            Array.isArray(obj.pages) &&
            Array.isArray(obj.providers)
        );
    }
}