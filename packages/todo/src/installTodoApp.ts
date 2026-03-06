import { createTodoOSRuntime } from './os/createTodoOSRuntime.js';

export async function installTodoApp(): Promise<void> {
  const os = await createTodoOSRuntime();
  const result = await os.install();
  if (result.installed) {
    console.log(`[OS] 安装成功: ${result.appId}`);
  } else {
    console.log(`[OS] 已安装: ${result.appId}`);
  }
  console.log(`[OS] 清单路径: ${result.manifestPath}`);
}

void installTodoApp();
