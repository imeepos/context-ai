

## 输入参数：
- 分镜: packages\ai-video\inputs\分镜优化.xlsx
- 提供的一些参考图片，如: 角色图/场景图片/风格图
packages\ai-video\inputs\微信图片_20260303183020_299_74.jpg
packages\ai-video\inputs\微信图片_20260303183025_300_74.jpg
packages\ai-video\inputs\微信图片_20260303183031_301_74.jpg
packages\ai-video\inputs\微信图片_20260303183036_302_74.jpg

## 目标生成:

packages\ai-video\outputs\4a4276b63d7a099ee507f78d4414beef.mp4


## 实现要求
设计一个视频生成agent，自主根据输入的文件生成目标视频

- agent框架：@mariozechner/pi-agent-core
- 命令行cli工具 如: ai-video start ./sources
- 生成的视频放到 ./outputs 文件夹

## api工具

API_KEY=ur7T7a9dqcQVVAdX-4AtjOjog6FFLvWAJr1a-WL3
BASE_URL=https://ai.bowong.cc


## prompts提示词动态生成

1. 注入 inputs 文件列表 
5. 注入最终目的
6. 注入工作流程
7. 规定json文件存储路径/文件名/简介用途

## 工作流程
1. 解析视频分镜脚本 并更新json
2. 根据分镜脚本提取人物/场景/道具并尝试匹配相关图片 并更新json文件
3. 补齐缺失的人物/场景/道具图片 并更新json

最简化工具集

状态数据存储: excel
文件存储

1. 生图工具
2. 生视频工具
3. 图片理解工具
4. excel读取工具
5. excel写入工具
6. 文件下载工具

请问应该如何设计实现