/**
 * 自动错误恢复功能演示
 *
 * 这个示例展示了如何使用自动错误恢复功能
 */

import { bootstrap } from '../src/bootstrap.js';
import { AutoRecoveryService } from '../src/core/auto-recovery.service.js';
import { ACTION_EXECUTER, SHELL_EXECUTE_TOKEN } from '../src/tokens.js';
import type { ActionExecuter } from '../src/tokens.js';

async function main() {
    console.log('🚀 启动应用...');

    // 1. 启动应用（自动恢复服务会自动启动）
    const app = await bootstrap('demo-session');

    // 2. 获取服务实例
    const autoRecovery = app.get(AutoRecoveryService);
    const actionExecuter = app.get(ACTION_EXECUTER) as ActionExecuter;

    console.log('✅ 应用启动成功');
    console.log('📊 自动恢复服务配置:');
    console.log('   - 启用: true');
    console.log('   - 最大重试次数: 3');
    console.log('   - Codex 模型: claude-sonnet-4.5');

    // 3. 查看初始统计
    console.log('\n📈 初始统计:');
    console.log(autoRecovery.getStatistics());

    // 4. 模拟一个会失败的操作
    console.log('\n🔥 执行一个会失败的命令...');

    try {
        await actionExecuter.execute(
            SHELL_EXECUTE_TOKEN,
            {
                command: 'npm run nonexistent-script', // 不存在的脚本
                cwd: process.cwd()
            },
            app
        );
    } catch (error) {
        console.log('❌ 命令执行失败（预期行为）');
        console.log(`   错误: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 5. 等待自动恢复尝试
    console.log('\n⏳ 等待自动恢复...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 6. 查看恢复统计
    console.log('\n📊 恢复后统计:');
    const stats = autoRecovery.getStatistics();
    console.log(`   总失败次数: ${stats.totalFailures}`);
    console.log(`   恢复尝试次数: ${stats.totalAttempts}`);
    console.log(`   成功恢复: ${stats.successfulRecoveries}`);
    console.log(`   失败恢复: ${stats.failedRecoveries}`);

    // 7. 演示动态配置
    console.log('\n⚙️ 更新配置（增加重试次数到 5）...');
    autoRecovery.updateConfig({
        maxRetries: 5
    });

    // 8. 演示暂停和恢复
    console.log('\n⏸️ 暂停自动恢复...');
    autoRecovery.stop();

    console.log('▶️ 恢复自动恢复...');
    autoRecovery.start();

    // 9. 演示排除特定 action
    console.log('\n🚫 配置排除列表（排除 shell.execute）...');
    autoRecovery.updateConfig({
        excludedActions: ['shell.execute', 'codex.execute']
    });

    // 10. 清空记录
    console.log('\n🗑️ 清空恢复记录...');
    autoRecovery.clearRecords();

    console.log('\n✅ 演示完成！');
    console.log('\n💡 提示:');
    console.log('   - 自动恢复会在后台监听所有 action 失败事件');
    console.log('   - 通过环境变量可以配置启用状态和重试次数');
    console.log('   - 查看 docs/auto-recovery.md 了解更多详情');

    process.exit(0);
}

// 运行示例
main().catch(error => {
    console.error('❌ 示例运行失败:', error);
    process.exit(1);
});
