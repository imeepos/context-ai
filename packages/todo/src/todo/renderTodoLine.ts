import type { TodoItem } from './types.js';

export function renderTodoLine(item: TodoItem): string {
  return `[${item.completed ? 'x' : ' '}] ${item.id}: ${item.text} (${item.completed ? '已完成' : '未完成'})`;
}
