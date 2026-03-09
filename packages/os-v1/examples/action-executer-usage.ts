/**
 * ActionExecuter 使用示例
 *
 * 本文件演示如何使用 ActionExecuter 执行系统能力。
 */

import { os, ACTION_EXECUTER, SHELL_EXECUTE_TOKEN, SHELL_ENV_SET_TOKEN, SHELL_ENV_LIST_TOKEN } from '../src/index.js';

async function main() {
    // 从 DI 容器获取 ActionExecuter 实例
    const actionExecuter = os.get(ACTION_EXECUTER);

    console.log('=== ActionExecuter 使用示例 ===\n');

    // 示例 1: 执行 Shell 命令
    console.log('1. 执行 Shell 命令: echo "Hello World"');
    try {
        const result = await actionExecuter.execute(
            SHELL_EXECUTE_TOKEN,
            { command: 'echo "Hello World"' },
            os
        );
        console.log('输出:', result.stdout.trim());
        console.log('退出码:', result.exitCode);
    } catch (error) {
        console.error('错误:', error);
    }

    console.log('\n---\n');

    // 示例 2: 设置环境变量
    console.log('2. 设置环境变量: MY_VAR=test_value');
    try {
        const result = await actionExecuter.execute(
            SHELL_ENV_SET_TOKEN,
            {
                key: 'MY_VAR',
                value: 'test_value',
                description: '测试环境变量'
            },
            os
        );
        console.log('设置成功:', result.ok);
    } catch (error) {
        console.error('错误:', error);
    }

    console.log('\n---\n');

    // 示例 3: 列出所有环境变量
    console.log('3. 列出环境变量（仅显示前5个）');
    try {
        const envVars = await actionExecuter.execute(
            SHELL_ENV_LIST_TOKEN,
            { _: 'list' },
            os
        );
        const entries = Object.entries(envVars).slice(0, 5);
        entries.forEach(([key, value]) => {
            console.log(`  ${key}=${value}`);
        });
        console.log(`  ... (共 ${Object.keys(envVars).length} 个环境变量)`);
    } catch (error) {
        console.error('错误:', error);
    }

    console.log('\n---\n');

    // 示例 4: 参数验证错误
    console.log('4. 测试参数验证（故意传入错误参数）');
    try {
        await actionExecuter.execute(
            SHELL_EXECUTE_TOKEN,
            { command: 123 } as any, // 故意传入错误类型
            os
        );
    } catch (error: any) {
        console.log('捕获到验证错误:', error.name);
        console.log('错误信息:', error.message);
    }

    console.log('\n---\n');

    // 示例 5: Action 不存在错误
    console.log('5. 测试 Action 不存在错误');
    try {
        await actionExecuter.execute(
            'non.existent.action' as any,
            {},
            os
        );
    } catch (error: any) {
        console.log('捕获到错误:', error.name);
        console.log('错误信息:', error.message);
    }

    console.log('\n=== 示例完成 ===');
}

// 运行示例
main().catch(console.error);
