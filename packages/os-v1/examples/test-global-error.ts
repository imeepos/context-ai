/**
 * 测试全局错误捕获和自动恢复
 */

import { bootstrap } from '../src/bootstrap.js';
import { AutoRecoveryService } from '../src/core/auto-recovery.service.js';
import { GlobalErrorHandler } from '../src/core/global-error-handler.js';

async function main() {
    console.log('🚀 启动应用...');

    // 启动应用
    const app = await bootstrap('test-global-error');

    // 获取服务实例
    const autoRecovery = app.get(AutoRecoveryService);
    const errorHandler = app.get(GlobalErrorHandler);

    console.log('✅ 应用启动成功');
    console.log('📊 全局错误处理器已安装');
    console.log('📊 自动恢复服务已启动');

    // 查看初始统计
    console.log('\n📈 初始统计:');
    console.log(autoRecovery.getStatistics());

    // 等待一会儿，让错误处理器准备好
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n🔥 测试 1: 抛出未捕获的异常...');
    console.log('预期: 全局错误处理器会捕获，触发自动恢复\n');

    // 这会被全局错误处理器捕获
    setTimeout(() => {
        throw new Error('这是一个测试错误 - Codex 应该会自动修复这个问题');
    }, 500);

    // 等待错误处理和恢复
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n📊 错误处理后统计:');
    const stats = autoRecovery.getStatistics();
    console.log({
        totalFailures: stats.totalFailures,
        totalAttempts: stats.totalAttempts,
        successfulRecoveries: stats.successfulRecoveries,
        failedRecoveries: stats.failedRecoveries
    });

    console.log('\n🔥 测试 2: 未处理的 Promise rejection...');
    console.log('预期: 全局错误处理器会捕获，触发自动恢复\n');

    // 这也会被全局错误处理器捕获
    Promise.reject(new Error('未处理的 Promise rejection - Codex 应该会修复'));

    // 等待错误处理和恢复
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n📊 最终统计:');
    const finalStats = autoRecovery.getStatistics();
    console.log({
        totalFailures: finalStats.totalFailures,
        totalAttempts: finalStats.totalAttempts,
        successfulRecoveries: finalStats.successfulRecoveries,
        failedRecoveries: finalStats.failedRecoveries
    });

    console.log('\n✅ 测试完成！');
    console.log('\n💡 说明:');
    console.log('   - 全局错误处理器捕获了所有未处理的错误');
    console.log('   - 自动恢复服务尝试使用 Codex 修复问题');
    console.log('   - 查看日志了解详细的恢复过程');

    // 不要退出，让用户看到日志
    console.log('\n⏳ 保持运行 10 秒以便查看日志...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('\n👋 测试结束');
    process.exit(0);
}

// 运行测试
main().catch(error => {
    console.error('❌ 测试失败:', error);
    process.exit(1);
});
