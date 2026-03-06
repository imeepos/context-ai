import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, LoggerLevel } from '../logger';

describe('Logger Timezone', () => {
  let logger: Logger;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logger = new Logger(LoggerLevel.info);
    consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should output timestamp in Beijing timezone (Asia/Shanghai)', () => {
    // 固定时间为 UTC 2026-01-24 02:05:40
    const fixedDate = new Date('2026-01-24T02:05:40.000Z');
    vi.setSystemTime(fixedDate);

    logger.info('test message');

    expect(consoleSpy).toHaveBeenCalled();
    const loggedMessage = consoleSpy.mock.calls[0][0] as string;

    // UTC 02:05:40 转换为北京时间应该是 10:05:40
    // 日志格式应该是 [2026-01-24 10:05:40] test message
    expect(loggedMessage).toContain('[2026-01-24 10:05:40]');
    expect(loggedMessage).toContain('test message');

    vi.useRealTimers();
  });

  it('should handle midnight UTC correctly (Beijing next day)', () => {
    // UTC 2026-01-23 16:00:00 = 北京时间 2026-01-24 00:00:00
    const fixedDate = new Date('2026-01-23T16:00:00.000Z');
    vi.setSystemTime(fixedDate);

    logger.info('midnight test');

    expect(consoleSpy).toHaveBeenCalled();
    const loggedMessage = consoleSpy.mock.calls[0][0] as string;

    // 应该显示北京时间 2026-01-24 00:00:00
    expect(loggedMessage).toContain('[2026-01-24 00:00:00]');

    vi.useRealTimers();
  });

  it('should handle end of day in Beijing timezone', () => {
    // UTC 2026-01-24 15:59:59 = 北京时间 2026-01-24 23:59:59
    const fixedDate = new Date('2026-01-24T15:59:59.000Z');
    vi.setSystemTime(fixedDate);

    logger.info('end of day test');

    expect(consoleSpy).toHaveBeenCalled();
    const loggedMessage = consoleSpy.mock.calls[0][0] as string;

    expect(loggedMessage).toContain('[2026-01-24 23:59:59]');

    vi.useRealTimers();
  });
});
