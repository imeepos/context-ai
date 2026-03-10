import { Injectable } from '@context-ai/core';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * 编码任务执行历史记录
 */
export interface CodingExecutionRecord {
	/** 唯一标识符 */
	id: string;
	/** 时间戳 */
	timestamp: string;
	/** 使用的助手 (claude/codex) */
	assistant: 'claude' | 'codex';
	/** 使用的模型 */
	model: string;
	/** 任务提示词 */
	prompt: string;
	/** 工作目录 */
	cwd?: string;
	/** 是否成功 */
	success: boolean;
	/** 执行时长（毫秒） */
	duration_ms: number;
	/** 退出码 */
	exit_code: number;
	/** 标准输出（截断） */
	stdout_preview?: string;
	/** 标准错误输出（截断） */
	stderr_preview?: string;
}

/**
 * 编码历史存储服务
 *
 * 负责持久化编码任务的执行历史记录。
 * 使用 JSON 文件存储，支持查询和过滤。
 */
@Injectable()
export class CodingHistoryStore {
	private readonly historyFile: string;
	private records: CodingExecutionRecord[] = [];
	private initialized = false;

	constructor() {
		// 存储在用户主目录下的 .context-ai 文件夹
		const homeDir = process.env.HOME || process.env.USERPROFILE || process.cwd();
		const configDir = path.join(homeDir, '.context-ai');
		this.historyFile = path.join(configDir, 'coding-history.json');
	}

	/**
	 * 初始化存储，加载历史记录
	 */
	private async ensureInitialized(): Promise<void> {
		if (this.initialized) return;

		try {
			const dir = path.dirname(this.historyFile);
			await fs.mkdir(dir, { recursive: true });

			try {
				const content = await fs.readFile(this.historyFile, 'utf-8');
				this.records = JSON.parse(content);
			} catch {
				// 文件不存在或解析失败，使用空数组
				this.records = [];
			}

			this.initialized = true;
		} catch (error) {
			console.error('Failed to initialize coding history store:', error);
			this.records = [];
			this.initialized = true;
		}
	}

	/**
	 * 保存历史记录到文件
	 */
	private async save(): Promise<void> {
		try {
			await fs.writeFile(
				this.historyFile,
				JSON.stringify(this.records, null, 2),
				'utf-8'
			);
		} catch (error) {
			console.error('Failed to save coding history:', error);
		}
	}

	/**
	 * 添加执行记录
	 */
	async addRecord(record: CodingExecutionRecord): Promise<void> {
		await this.ensureInitialized();
		this.records.unshift(record); // 新记录放在最前面

		// 限制历史记录数量（保留最近 1000 条）
		if (this.records.length > 1000) {
			this.records = this.records.slice(0, 1000);
		}

		await this.save();
	}

	/**
	 * 查询历史记录
	 */
	async getRecords(filter?: {
		assistant?: 'claude' | 'codex';
		success?: boolean;
		limit?: number;
	}): Promise<CodingExecutionRecord[]> {
		await this.ensureInitialized();

		let filtered = this.records;

		if (filter?.assistant) {
			filtered = filtered.filter(r => r.assistant === filter.assistant);
		}

		if (filter?.success !== undefined) {
			filtered = filtered.filter(r => r.success === filter.success);
		}

		if (filter?.limit) {
			filtered = filtered.slice(0, filter.limit);
		}

		return filtered;
	}

	/**
	 * 获取统计信息
	 */
	async getStats(): Promise<{
		total: number;
		claude: number;
		codex: number;
		success_rate: number;
	}> {
		await this.ensureInitialized();

		const total = this.records.length;
		const claude = this.records.filter(r => r.assistant === 'claude').length;
		const codex = this.records.filter(r => r.assistant === 'codex').length;
		const successful = this.records.filter(r => r.success).length;
		const success_rate = total > 0 ? successful / total : 0;

		return { total, claude, codex, success_rate };
	}

	/**
	 * 清空历史记录
	 */
	async clear(): Promise<void> {
		await this.ensureInitialized();
		this.records = [];
		await this.save();
	}
}
