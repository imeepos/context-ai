/** @jsx jsx */
import { jsx, render, Context, Text, Group, Tool, Data } from '@context-ai/ctp';
import { Type, Static } from '@sinclair/typebox';
import type { AgentToolResult, AgentToolUpdateCallback } from '@mariozechner/pi-agent-core';

type TodoItem = {
  id: number;
  text: string;
  completed: boolean;
};

// Immutable in‑memory store (demo only)
let todoState: TodoItem[] = [];
let nextId = 1;

// TypeBox schema definitions
const AddTodoParams = Type.Object({
  text: Type.String({ description: 'Todo text' }),
}, { additionalProperties: false });

const IdParams = Type.Object({
  id: Type.Number({ description: 'Todo ID' }),
}, { additionalProperties: false });

type AddTodoParamsType = Static<typeof AddTodoParams>;
type IdParamsType = Static<typeof IdParams>;

// Execute functions matching AgentTool.execute signature
const addTodo = async (
  _toolCallId: string,
  params: AddTodoParamsType,
  _signal?: AbortSignal,
  _onUpdate?: AgentToolUpdateCallback
): Promise<AgentToolResult<{ item: TodoItem }>> => {
  const text = params.text?.trim();
  if (!text) {
    return { content: [{ type: 'text', text: 'Text is required' }], details: { item: null! } };
  }
  const item: TodoItem = { id: nextId++, text, completed: false };
  todoState = [...todoState, item];
  return { content: [{ type: 'text', text: `Added: ${item.text}` }], details: { item } };
};

const toggleTodo = async (
  _toolCallId: string,
  params: IdParamsType,
  _signal?: AbortSignal,
  _onUpdate?: AgentToolUpdateCallback
): Promise<AgentToolResult<{ item: TodoItem }>> => {
  const id = params.id;
  if (id === undefined) {
    return { content: [{ type: 'text', text: 'ID is required' }], details: { item: null! } };
  }
  const index = todoState.findIndex((t) => t.id === id);
  if (index === -1) {
    return { content: [{ type: 'text', text: 'Not found' }], details: { item: null! } };
  }
  const item = todoState[index];
  const updated = { ...item, completed: !item.completed };
  todoState = [...todoState.slice(0, index), updated, ...todoState.slice(index + 1)];
  return { content: [{ type: 'text', text: `Toggled: ${updated.text}` }], details: { item: updated } };
};

const deleteTodo = async (
  _toolCallId: string,
  params: IdParamsType,
  _signal?: AbortSignal,
  _onUpdate?: AgentToolUpdateCallback
): Promise<AgentToolResult<{ removed: TodoItem }>> => {
  const id = params.id;
  if (id === undefined) {
    return { content: [{ type: 'text', text: 'ID is required' }], details: { removed: null! } };
  }
  const index = todoState.findIndex((t) => t.id === id);
  if (index === -1) {
    return { content: [{ type: 'text', text: 'Not found' }], details: { removed: null! } };
  }
  const removed = todoState[index];
  todoState = todoState.filter((t) => t.id !== id);
  return { content: [{ type: 'text', text: `Deleted: ${removed.text}` }], details: { removed } };
};

const TodoContext = (
  <Context name="Todo Demo" description="Simple TODO List demo using CTP">
    <Group title="Todo List">
      <Text>Current items:</Text>
      <Data source={todoState} format="list" fields={["id", "text", "completed"]} />
    </Group>
    <Tool
      name="addTodo"
      label="addTodo"
      description="Add a new todo item"
      parameters={AddTodoParams}
      execute={addTodo}
    />
    <Tool
      name="toggleTodo"
      label="toggleTodo"
      description="Toggle completion status of a todo"
      parameters={IdParams}
      execute={toggleTodo}
    />
    <Tool
      name="deleteTodo"
      label="deleteTodo"
      description="Delete a todo item"
      parameters={IdParams}
      execute={deleteTodo}
    />
  </Context>
);

// Render and output for demo
(async () => {
  const ctx = await render(TodoContext);
  console.log('=== Rendered Context ===');
  console.log('Name:', ctx.name);
  console.log('Description:', ctx.description);
  console.log('Prompt:', ctx.prompt);
  console.log('Tools count:', ctx.tools.length);
  console.log('Tools:', ctx.tools.map((t) => t.name));
  console.log('DataViews:', ctx.dataViews);
})();
