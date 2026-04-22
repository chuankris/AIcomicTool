# AI 漫剧生成器 - 项目上下文

最后更新：2026-04-22

## 项目目标

这是一个面向个人创作者的本地 AI 漫剧/漫画分镜生成工作台。用户自带文本模型 Key 和即梦/火山引擎凭证，从剧本开始，完成角色设定、分镜拆解、批量出图，并在后续扩展到配音和竖屏 MP4 导出。

核心体验不是“展示型网站”，而是一个反复创作、审核、修改、重生成的生产工具。

## 当前产品流程

1. 在设置页配置文本 AI 模型和即梦图片生成凭证。
2. 在首页创建项目，选择风格和文本模型配置。
3. 在项目页 Step 1 编写/优化剧本，提取或手动添加角色/背景。
4. 通过 AI 润色角色设定，确认后生成角色参考图。
5. 在项目页 Step 2 生成分镜脚本，逐条编辑分镜描述。
6. 批量调用即梦生成分镜图。
7. 单格图片可查看/编辑 prompt，可 AI 润色 prompt，可重生成。
8. 项目页 Step 3 是配音与导出，占位中，尚未实现。

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- SQLite + Drizzle ORM + better-sqlite3
- Tailwind CSS + shadcn/ui 风格组件
- OpenAI SDK 兼容层，用于 Claude / OpenAI / Gemini / 自定义接口
- 即梦/火山引擎图片生成 API
- Vitest

## 关键目录

- `src/app/page.tsx`：首页项目列表和新建项目弹窗
- `src/app/settings/page.tsx`：AI 模型配置和即梦凭证配置
- `src/app/project/[token]/page.tsx`：项目三步创作流程
- `src/components/project/`：剧本、角色、分镜、步骤条等核心 UI
- `src/app/api/`：项目、设置、角色、分镜、AI 辅助、即梦配置等 API
- `src/lib/db/`：SQLite/Drizzle 数据层
- `src/lib/ai/`：文本模型调用、剧本拆解、prompt 构建等逻辑
- `src/lib/jimeng/`：即梦签名、凭证、图片生成客户端
- `drizzle/`：数据库迁移
- `docs/superpowers/`：早期计划和 UX 重构记录
- `../ued/漫剧生成器 Design System/`：设计系统和 UI 参考

## 当前状态

- TypeScript 检查通过：`npx tsc --noEmit`
- Vitest 通过：8 个测试文件，16 个测试
- 项目主流程已具备基础闭环：剧本 -> 角色 -> 分镜 -> 出图
- 配音、视频导出、下载入口尚未实现
- 图片生成模型类型中有未来扩展位，但实际生成目前走即梦

## 协作者启动顺序

无论是 Codex 还是 Claude Code，开始任务前请先读 `ai-collab/` 目录，尤其是：

1. `ai-collab/PROJECT_CONTEXT.md`
2. `ai-collab/DECISIONS.md`
3. `ai-collab/TASKS.md`
4. `ai-collab/HANDOFF.md`
5. 任务涉及的具体源码文件

如果任务涉及 UI/视觉设计，也要查看：

- `../ued/漫剧生成器 Design System/README.md`
- `../ued/漫剧生成器 Design System/ui_kits/web-app/`

## 重要注意

- 不要把这个项目改成营销落地页；第一屏应该服务于实际创作流程。
- 不要无理由重写整个项目页，当前 Stepper 流程是最新方向。
- 不要把真实 API Key 输出到前端或日志中。
- 不要随意改数据库 schema；需要同步类型、迁移、API 和测试。
- 不要在不了解当前状态机的情况下改生成流程。
- 本地数据库文件可能有运行时变动，提交前注意区分代码变更和数据文件变更。
