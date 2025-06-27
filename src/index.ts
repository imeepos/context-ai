import { readFileSync, existsSync } from "fs";
import { writeFile, rename } from "fs/promises";
import { execFile } from "child_process";

const HOST = `https://api.siliconflow.cn/v1/chat/completions` as const;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const BACKUP_SUFFIX = `.backup.${Date.now()}`;
const MAX_RESTART_ATTEMPTS = 5;
const RESTART_DELAY = 3000;

async function secureFetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<any> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Failed to read error body");
      throw new Error(`API responded with ${response.status}: ${errorBody}`);
    }
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      console.warn(`Retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return secureFetchWithRetry(url, options, retries - 1);
    }
    throw new Error(
      `API request failed after ${MAX_RETRIES} attempts: ${errorToString(error)}`
    );
  }
}

function errorToString(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack || "No stack trace"}`;
  }
  return String(error);
}

function validateCodeIntegrity(code: string): boolean {
  const requiredPatterns = [
    /import\s*{.*}\s*from\s*["']fs["']/,
    /import\s*{.*}\s*from\s*["']child_process["']/,
    /work\(.*\)\.then/,
    /process\.env\.SF_API_KEY/,
    /validateCodeIntegrity/,
    /safeWriteWithBackup/,
    /secureFetchWithRetry/,
    /main\s*\(\)/
  ];
  return requiredPatterns.every((pattern) => pattern.test(code));
}

async function safeWriteWithBackup(
  content: string,
  targetPath: string
): Promise<void> {
  const tempPath = `${targetPath}.tmp.${Date.now()}.ts`;

  try {
    // 写入临时文件
    await writeFile(tempPath, content, "utf-8");
    
    // 验证代码完整性
    if (!validateCodeIntegrity(content)) {
      throw new Error("Generated code failed integrity validation");
    }

    // 创建备份
    if (existsSync(targetPath)) {
      await rename(targetPath, `${targetPath}${BACKUP_SUFFIX}`);
    }

    // 原子替换
    await rename(tempPath, targetPath);
    console.log(
      `File updated successfully. Backup: ${targetPath}${BACKUP_SUFFIX}`
    );
  } catch (error) {
    console.error(`File update failed: ${errorToString(error)}`);

    // 清理临时文件
    if (existsSync(tempPath)) {
      await rename(tempPath, `${tempPath}.failed`).catch(() => {});
    }

    // 恢复备份
    if (existsSync(`${targetPath}${BACKUP_SUFFIX}`)) {
      await rename(`${targetPath}${BACKUP_SUFFIX}`, targetPath);
      console.warn("Restored from backup");
    }
    throw error;
  }
}

async function work(dest: string): Promise<string> {
  const body = {
    model: "Pro/deepseek-ai/DeepSeek-R1",
    messages: [
      {
        role: "system",
        content: `你正在升级一个自迭代程序。返回必须是可直接执行的完整代码文件，保持自我升级能力并优化：
1. 提高安全性 
2. 增强错误处理 
3. 确保重启可靠性
# 规范
- 必须包含所有import语句
- 必须保留核心工作循环
- 禁止添加外部依赖`,
      },
      {
        role: "user",
        content: dest,
      },
    ],
    temperature: 0.2,
  };

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };

  const response = await secureFetchWithRetry(HOST, options);
  
  // 验证响应结构
  if (!response?.choices?.[0]?.message?.content) {
    throw new Error("Invalid API response structure");
  }
  
  return response.choices[0].message.content.trim();
}

async function restartProcess(attempt = 1): Promise<void> {
  if (attempt > MAX_RESTART_ATTEMPTS) {
    throw new Error(`Failed to restart after ${MAX_RESTART_ATTEMPTS} attempts`);
  }

  return new Promise((resolve, reject) => {
    console.log(`Restarting process (attempt ${attempt}/${MAX_RESTART_ATTEMPTS})...`);
    
    const child = execFile(process.argv[0], [process.argv[1]], (error) => {
      if (error) {
        console.error(`Restart failed: ${errorToString(error)}`);
        setTimeout(() => restartProcess(attempt + 1).then(resolve).catch(reject), RESTART_DELAY);
      }
    });

    child.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Child process exited with code ${code}`);
        setTimeout(() => restartProcess(attempt + 1).then(resolve).catch(reject), RESTART_DELAY);
      }
    });

    child.unref();
    process.exit(0);
  });
}

async function main() {
  try {
    const content = readFileSync(__filename, "utf-8");
    const upgradePrompt = `
## 自我认知
- 注意：你本身是一段代码

## 目标
- 你的目标是升级自己，升级完成后以便更好更快的升级自己
- 每次生成的结果都会覆盖原文件，覆盖成功后重新运行新程序

## 升级要求
- 当前代码版本：${Date.now()}
- 关键改进点：错误处理强化
- 保持核心循环：读文件 -> 请求API -> 覆盖文件 -> 重启

${content}

请生成可运行的完整代码文件，不要任何额外解释`;

    const newCode = await work(upgradePrompt);
    await safeWriteWithBackup(newCode, __filename);
    await restartProcess();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Critical failure: ${errorToString(error)}`);
    console.error("Maintaining current version for recovery");
    
    try {
      await restartProcess();
    } catch (restartError) {
      console.error(`Fatal restart failure: ${errorToString(restartError)}`);
      process.exit(1);
    }
  }
}

// 执行入口
main().catch((e) => {
  console.error("Unhandled top-level exception:", errorToString(e));
  process.exit(1);
});


// 需要添加 错误自动处理逻辑