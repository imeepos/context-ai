import { render } from '@context-ai/ctp';
import { createTodoAgent, subscribeTodoAgentEvents } from '@context-ai/agent';

import { createTodoContext } from './context/createTodoContext.js';


const ADD_TODO_PROMPT = '如果Todo已存在，请不要重复添加。现在只做一件事：立刻调用 addTodo 工具，参数 text="明天早上8点开会"。';
const CLEAR_TODO_PROMPT = '请立即清空所有Todo。';

export async function runTodoDemo(): Promise<void> {
  const ctx = await render(createTodoContext());
  const agent = createTodoAgent(ctx.prompt, ctx.tools);

  subscribeTodoAgentEvents(agent);
  await agent.prompt(CLEAR_TODO_PROMPT);
  await agent.waitForIdle();

  const ctxNow = await render(createTodoContext());
  console.log(ctxNow.prompt);
}
