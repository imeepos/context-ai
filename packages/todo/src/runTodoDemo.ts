import { createTodoOSRuntime } from './os/createTodoOSRuntime.js';

const ADD_TODO_PROMPT = '如果Todo已存在，请不要重复添加。现在只做一件事：立刻调用 addTodo 工具，参数 text="明天早上8点开会"。';
const CLEAR_TODO_PROMPT = '请立即清空所有Todo。';

export async function runTodoDemo(): Promise<void> {
  const os = await createTodoOSRuntime();
  try {
    await os.start();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`启动失败：${message}。请先执行 npm run install:app -w @context-ai/todo`);
  }

  const started = await os.os.kernel.execute(
    'app.page.render',
    { route: os.route },
    os.appContext
  ) as {
    appId: string;
    page: { route: string };
  };
  console.log(`[OS] 启动成功: ${started.appId} route=${started.page.route}`);

  await os.run(CLEAR_TODO_PROMPT);
  const promptAfterRun = await os.run(ADD_TODO_PROMPT);
  console.log(promptAfterRun);
}
