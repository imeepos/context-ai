/**
 * EventBus Service
 * 基于 Node.js EventEmitter 的事件总线实现
 */

import { EventEmitter } from "node:events";
import { Injectable } from "@context-ai/core";
import type { EventBus } from "../tokens.js";

/**
 * EventBus 实现
 *
 * 提供发布/订阅模式的事件总线，用于组件间解耦通信
 *
 * 特性：
 * - 基于 Node.js EventEmitter
 * - 支持通配符订阅（使用 * 匹配任意主题）
 * - 自动错误处理
 * - 订阅管理（返回取消订阅函数）
 */
@Injectable({ providedIn: "root" })
export class EventBusService implements EventBus {
	private readonly emitter = new EventEmitter();
	private readonly wildcardHandlers = new Map<string, (topic: string, payload: unknown) => void>();

	constructor() {
		// 设置最大监听器数量，避免内存泄漏警告
		this.emitter.setMaxListeners(100);
	}

	/**
	 * 发布事件
	 *
	 * @param topic 事件主题
	 * @param payload 事件负载
	 */
	publish(topic: string, payload: unknown): void {
		try {
			// 触发具体主题的监听器
			this.emitter.emit(topic, payload);

			// 触发通配符监听器
			for (const [pattern, handler] of this.wildcardHandlers.entries()) {
				if (this.matchPattern(pattern, topic)) {
					handler(topic, payload);
				}
			}
		} catch (error) {
			console.error(`[EventBus] Error publishing event "${topic}":`, error);
		}
	}

	/**
	 * 订阅事件
	 *
	 * @param topic 事件主题（支持通配符 *）
	 * @param handler 事件处理函数
	 * @returns 取消订阅函数
	 */
	subscribe(topic: string, handler: (payload: unknown) => void): () => void {
		// 如果包含通配符，使用特殊处理
		if (topic.includes("*")) {
			const wrappedHandler = (actualTopic: string, payload: unknown) => {
				try {
					handler(payload);
				} catch (error) {
					console.error(`[EventBus] Error in handler for "${actualTopic}":`, error);
				}
			};

			this.wildcardHandlers.set(topic, wrappedHandler);

			// 返回取消订阅函数
			return () => {
				this.wildcardHandlers.delete(topic);
			};
		}

		// 普通订阅
		const wrappedHandler = (payload: unknown) => {
			try {
				handler(payload);
			} catch (error) {
				console.error(`[EventBus] Error in handler for "${topic}":`, error);
			}
		};

		this.emitter.on(topic, wrappedHandler);

		// 返回取消订阅函数
		return () => {
			this.emitter.off(topic, wrappedHandler);
		};
	}

	/**
	 * 订阅一次性事件（触发后自动取消订阅）
	 *
	 * @param topic 事件主题
	 * @param handler 事件处理函数
	 */
	once(topic: string, handler: (payload: unknown) => void): void {
		const wrappedHandler = (payload: unknown) => {
			try {
				handler(payload);
			} catch (error) {
				console.error(`[EventBus] Error in once handler for "${topic}":`, error);
			}
		};

		this.emitter.once(topic, wrappedHandler);
	}

	/**
	 * 取消所有订阅
	 *
	 * @param topic 可选，指定主题则只取消该主题的订阅
	 */
	unsubscribeAll(topic?: string): void {
		if (topic) {
			this.emitter.removeAllListeners(topic);
			// 清除匹配的通配符订阅
			for (const pattern of this.wildcardHandlers.keys()) {
				if (this.matchPattern(pattern, topic)) {
					this.wildcardHandlers.delete(pattern);
				}
			}
		} else {
			this.emitter.removeAllListeners();
			this.wildcardHandlers.clear();
		}
	}

	/**
	 * 获取主题的监听器数量
	 *
	 * @param topic 事件主题
	 * @returns 监听器数量
	 */
	listenerCount(topic: string): number {
		return this.emitter.listenerCount(topic);
	}

	/**
	 * 匹配通配符模式
	 *
	 * @param pattern 模式（支持 * 通配符）
	 * @param topic 实际主题
	 * @returns 是否匹配
	 *
	 * @example
	 * matchPattern("scheduler.*", "scheduler.task.started") // true
	 * matchPattern("*.task.*", "scheduler.task.completed") // true
	 */
	private matchPattern(pattern: string, topic: string): boolean {
		const regexPattern = pattern
			.split("*")
			.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
			.join(".*");

		const regex = new RegExp(`^${regexPattern}$`);
		return regex.test(topic);
	}
}
