

[目标用户]

这套系统的目标用户是：USER_INFO.md，请在任务规划阶段充分了解目标客户的痛点及场景


## [必须执行] 做plan计划文件时

- 注意将计划文件放到 docs/plans/xxx/xxx.md 千万不要放根目录，一定要遵守
- 应该面向接口而不是实现，充分使用依赖注入/Provider/分层隔离等
- 每次编码完成后，务必践行类型检查，语法检查 确保缩写代码无语法错误

## 当编写Action时

- 禁止使用 as any 这种类型不安全的操作，单元测试除外
- 如果遇到api扩展问题 可以添加 @ts-ignore
- 非单元测试场景，禁止使用mock假数据等敷衍了事的做法
- 所有实现禁止使用memory存储，必须持久化存储，除非单元测试场景
- 依赖的第三方服务 必须通过 _injector.get 获取，禁止使用 globalService.xxx
- type的类型必须是 Token<TRequest, TResponse>
- dependencies 类型必须是 [Token引用]，权限与type保持一致，不能使用不存在的 type
- 不允许出现：type: "shell.env.unset" 直接使用字符串的情况, 这是类型不安全的
- 每个文件有且仅有一个action, 不允许出现一个文件多个action的情况，如: shell有3个action，那么应该是 [action name].action.ts

