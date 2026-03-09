

每次编码完成后，务必践行类型检查，语法检查 确保缩写代码无语法错误

## [必须执行] 做plan计划文件时

- 注意将计划文件放到 docs/plans/xxx/xxx.md

## 当编写Action时

- 禁止使用 as any 这种类型不安全的操作，单元测试除外
- 如果遇到api扩展问题 可以添加 @ts-ignore
- 非单元测试场景，禁止使用mock假数据等敷衍了事的做法
- 所有实现禁止使用memory存储，必须持久化存储，除非单元测试场景
- 依赖的第三方服务 必须通过 _injector.get 获取，禁止使用 globalService.xxx
- type的类型必须是 Token<TRequest, TResponse>
- dependencies 类型必须是 [Token引用]，权限与type保持一致，不能使用不存在的 type
- 不允许出现：type: "shell.env.unset" 这是类型不安全的
- 每个文件要给action, 不允许出现一个文件多个action的情况，如: shell有3个action，那么应该是 [action name].action.ts
### 步骤：

1. 定义导出req schema 和 res schema 定义时，description 务必清晰明了，这个是接口字段的文档，不可忽略
2. 定义导出type token
3. 定义导出action
