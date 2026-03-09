

每次编码完成后，务必践行类型检查，语法检查 确保缩写代码无语法错误

## 做plan计划文件时

- 目录结构要求 ./docs/plans/xxx/task_plan.md

## 当编写Action时

- type的类型必须是 Token<TRequest, TResponse>
- dependencies 类型必须是 [Token引用]，权限与type保持一致，不能使用不存在的 type
- 不允许出现：type: "shell.env.unset" 这是类型不安全的
- 每个文件要给action, 不允许出现一个文件多个action的情况，如: shell有3个action，那么应该是 [action name].action.ts
### 步骤：

1. 定义导出req schema 和 res schema 定义时，description 务必清晰明了，这个是接口字段的文档，不可忽略
2. 定义导出type token
3. 定义导出action
