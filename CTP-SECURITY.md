# CTP-Lite 安全指南

本文档描述 CTP-Lite 的安全最佳实践和配置建议，帮助开发者构建安全的 AI 应用。

---

## 概述

CTP-Lite 运行在 Node.js 命令行环境中，主要安全风险包括：

1. **API Key 泄露** - LLM API Key 管理不当
2. **无限循环** - 渲染循环无法终止
3. **文件系统安全** - 不受限制的文件操作
4. **网络请求安全** - 不安全的 HTTP 调用
5. **数据持久化安全** - 敏感数据存储不当

---

## 核心安全原则

### 1. API Key 管理

**永远不要**将 API Key 硬编码在代码中。

```typescript
// ❌ 错误：硬编码 API Key
await configure({
  llm: {
    providers: {
      openai: {
        apiKey: 'sk-xxx',
      },
    },
  },
});

// ✅ 正确：从环境变量读取
await configure({
  llm: {
    providers: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
      },
    },
  },
});
```

**使用 .env 文件（开发环境）：**

```bash
# .env
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
```

```typescript
import 'dotenv/config';

await configure({
  llm: {
    providers: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
      },
    },
  },
});
```

**使用密钥管理服务（生产环境）：**

```typescript
// AWS Secrets Manager
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const secrets = new SecretsManager();
const secret = await secrets.getSecretValue({ SecretId: 'ctp/llm-keys' });
const keys = JSON.parse(secret.SecretString!);

await configure({
  llm: {
    providers: {
      openai: { apiKey: keys.openai },
      anthropic: { apiKey: keys.anthropic },
    },
  },
});
```

---

### 2. 循环安全

防止无限循环和资源耗尽。

```typescript
await run({
  entry: 'Dashboard',
  safety: {
    maxCycles: 10,           // 最大循环次数
    maxDuration: 60000,      // 最大执行时间（60秒）
    maxToolCallsPerCycle: 5, // 单轮最大工具调用
    maxTokens: 8000,         // 最大 Token 数
    circuitBreaker: {
      failureThreshold: 3,   // 失败3次后熔断
      recoveryTimeout: 30000, // 30秒后尝试恢复
    },
  },
});
```

---

### 3. 文件系统安全

限制文件操作范围。

```typescript
await configure({
  security: {
    filesystem: {
      // 允许访问的目录
      allowedPaths: [
        './data',
        './logs',
      ],
      // 禁止访问的模式
      deniedPatterns: [
        /\.env$/,
        /secret/,
        /password/,
      ],
      // 禁止的操作
      deniedOperations: ['rm', 'rmdir'],
    },
  },
});
```

**安全的文件操作示例：**

```tsx
<Tool
  name="read_log"
  description="读取日志文件"
  executor={async (params: { filename: string }) => {
    // 验证路径
    const safePath = validatePath(params.filename, './logs');
    if (!safePath) {
      throw new Error('非法文件路径');
    }

    const content = await fs.readFile(safePath, 'utf-8');
    return { content };
  }}
/>
```

---

### 4. 网络请求安全

验证外部 API 调用。

```typescript
await configure({
  security: {
    http: {
      // 允许的域名
      allowedHosts: [
        'api.example.com',
        'api.openai.com',
      ],
      // 禁止的协议
      deniedProtocols: ['http:'],
      // 超时设置
      timeout: 30000,
      // 最大重试
      maxRetries: 3,
    },
  },
});
```

---

### 5. 数据存储安全

#### 敏感数据加密

```typescript
await run({
  storage: {
    type: 'file',
    path: './data/state.json',
    encryption: {
      enabled: true,
      algorithm: 'aes-256-gcm',
      // 从环境变量读取密钥
      key: process.env.STORAGE_ENCRYPTION_KEY!,
    },
  },
});
```

#### 敏感字段过滤

```typescript
import { maskSensitiveData } from '@context-ai/security';

<Context name="用户详情">
  <Text>用户名: {user.name}</Text>
  <Text>手机号: {maskSensitiveData(user.phone, 'phone')}</Text>
  {/* 输出: 138****8888 */}
</Context>
```

---

## 安全配置详解

### 完整安全配置示例

```typescript
await configure({
  security: {
    // API Key 配置
    apiKey: {
      rotation: {
        enabled: true,
        interval: 30 * 24 * 60 * 60 * 1000, // 30天轮换
      },
    },

    // 循环安全
    loop: {
      maxCycles: 10,
      maxDuration: 60000,
      maxToolCallsPerCycle: 5,
    },

    // 文件系统
    filesystem: {
      allowedPaths: ['./data', './logs'],
      deniedPatterns: [/\.env$/, /secret/],
      readOnly: false,
    },

    // HTTP 安全
    http: {
      allowedHosts: ['api.example.com'],
      deniedProtocols: ['http:'],
      timeout: 30000,
    },

    // 存储加密
    storage: {
      encryption: {
        enabled: true,
        algorithm: 'aes-256-gcm',
      },
    },

    // 审计日志
    audit: {
      enabled: true,
      events: ['tool_call', 'state_change', 'error'],
      logPath: './logs/audit.log',
    },
  },
});
```

---

## 工具执行安全

### 输入验证

```typescript
import { z } from 'zod';

const orderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive().max(100),
  })).min(1).max(50),
});

<Tool
  name="create_order"
  executor={async (params) => {
    // 运行时验证
    const validated = orderSchema.parse(params);

    // 业务逻辑
    return createOrder(validated);
  }}
/>
```

### 执行超时

```typescript
<Tool
  name="heavy_computation"
  executor={async (params) => {
    // 设置超时
    const result = await withTimeout(
      heavyComputation(params),
      5000 // 5秒超时
    );
    return result;
  }}
/>
```

### 资源限制

```typescript
<Tool
  name="process_data"
  executor={async (params) => {
    // 限制内存使用
    const limit = resourceLimit({
      maxMemory: 100 * 1024 * 1024, // 100MB
      maxCpu: 5000, // 5秒CPU时间
    });

    const result = await limit(() => processData(params));
    return result;
  }}
/>
```

---

## 错误处理安全

### 安全的错误信息

```typescript
await run({
  hooks: {
    onError: (error) => {
      // 记录完整错误（日志）
      logger.error('Full error:', error);

      // 向用户显示安全的信息
      if (process.env.NODE_ENV === 'production') {
        console.error('操作失败，请稍后重试');
        return false;
      }

      // 开发环境显示完整错误
      console.error('Error:', error.message);
      return false;
    },
  },
});
```

---

## 审计日志

### 启用审计日志

```typescript
await configure({
  security: {
    audit: {
      enabled: true,
      events: [
        'tool_call',
        'state_change',
        'context_switch',
        'error',
        'auth_failure',
      ],
      logPath: './logs/audit.log',
      // 或使用自定义处理器
      handler: (event) => {
        // 发送到日志服务
        logService.send({
          timestamp: event.timestamp,
          type: event.type,
          details: event.details,
        });
      },
    },
  },
});
```

---

## 生产环境检查清单

- [ ] API Key 存储在环境变量或密钥管理服务
- [ ] 启用循环安全限制（maxCycles, maxDuration）
- [ ] 配置文件系统访问限制
- [ ] 启用存储加密
- [ ] 配置 HTTP 安全策略
- [ ] 启用审计日志
- [ ] 输入参数验证
- [ ] 工具执行超时设置
- [ ] 敏感数据过滤
- [ ] 安全的错误处理

---

## 常见安全问题

### Q: 如何防止 AI 生成恶意代码？

```typescript
<Tool
  name="execute_code"
  executor={async (params) => {
    // 1. 代码审查
    if (containsDangerousPatterns(params.code)) {
      throw new Error('代码包含危险模式');
    }

    // 2. 沙箱执行
    const result = await runInSandbox(params.code, {
      timeout: 5000,
      allowedModules: ['math', 'util'],
    });

    return result;
  }}
/>
```

### Q: 如何处理敏感数据？

```typescript
// 1. 加密存储
await run({
  storage: {
    type: 'file',
    path: './data/state.json',
    encryption: { enabled: true },
  },
});

// 2. 过滤敏感字段
<Data
  source={userData}
  maskFields={['password', 'ssn', 'creditCard']}
/>
```

---

## 参考

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [npm security](https://www.npmjs.com/security)
