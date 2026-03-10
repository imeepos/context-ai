严格遵循TDD规范，测试驱动开发

[语言]
用中文回答用户

[任务计划阶段]
use planning-with-files + writing-plans + test-driven-development skills finish user task
[执行任务阶段]
use context-engineering + prompt-engineering skills finish user task
为了防止上下文超长，每个子任务分配sub agent 完成，并根据sub agent 完成的工作汇报，运行TDD验证无误后，更新相关plan文件

Running Get-Content -Path "packages/sdk/src/schemas/toonflow-asset.schema.ts" -Encoding utf8