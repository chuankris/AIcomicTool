# 任务看板

这个文件用来给 Codex 和 Claude Code 共享当前工作状态。开始任务前先读；完成任务后更新对应条目。

状态约定：

- `todo`：计划做，还未开始
- `doing`：正在做，最好不要让另一个 AI 同时改同一区域
- `blocked`：被外部信息或决策阻塞
- `done`：已完成，并在 `ai-collab/HANDOFF.md` 写明验证结果

## 当前任务

| 状态 | 任务 | 建议 owner | 范围 | 备注 |
| --- | --- | --- | --- | --- |
| todo | Plan B：配音与视频导出 MVP | Codex 或 Claude Code | API、FFmpeg、项目状态、下载入口 | 先做无 TTS 的图片 MP4 也可以作为 MVP |
| todo | 验证真实即梦 API 生成链路 | Codex | 即梦配置、签名、生成接口 | 需要真实火山/即梦凭证 |
| todo | 设计导出页/导出状态 UI | Claude Code 或 Codex | Step 3 UI、项目页状态 | 需要遵循 UED 设计系统 |
| todo | 强化生成失败和重试体验 | Codex | panel 状态、错误展示、重试 API | 适合补测试 |
| todo | 梳理 API map 文档 | Codex | `docs/api-map.md` | 帮后续 AI 快速定位接口 |
| todo | 建立提示词 demo/eval 脚本 | Codex | `scripts` 或 `src/lib/ai` 测试辅助 | 固定剧本，对比当前/新版提示词输出 |
| todo | 拆分角色与背景 prompt 构建 | Codex | `src/lib/ai/prompt-builder.ts`、角色提取 API | 背景不要再出现角色参考图关键词 |
| todo | 设计动态 Tip 参数系统 | Claude Code 或 Codex | 项目页 UI、AI API 入参、prompt 模板 | 剧本润色、角色提取、分镜拆解前置选项 |
| todo | 建立漫画风格词库 | Codex | `src/lib/ai` 或 `src/lib/style` | 基础画风 + 视觉题材 + 画面气质 |
| todo | 设计组合式风格选择 UI | Claude Code | 项目创建/配置/分镜页 | 标签组合，不要只做单一下拉 |
| done | HTML 交互原型：Tip + 风格词库 | Codex | `docs/prompt-style-interaction-prototype.html` | 单文件原型，可直接浏览器打开 |
| done | HTML 交互原型：工作台融合版 | Codex | `docs/workspace-integrated-interaction-prototype.html` | 演示 Tip/风格如何嵌入 Step 2 出图流程 |
| done | HTML 交互原型：导演工作台增强版 | Codex | `docs/director-workbench-prototype.html` | 加入画幅、清晰度、参考图强度、安全区、单格高级设置 |
| done | HTML 交互原型：剧本角色设定台 | Codex | `docs/script-character-workbench-prototype.html` | 演示剧本优化预览、AI 提取建议、角色/背景确认和参考图状态 |
| done | 导演地基需求清单 | Codex | `docs/director-foundation-checklist.md` | 补充钩子、关系、道具、时长、批量确认、重试、版本历史等能力 |
| done | 专业导演层未来能力文档 | Codex | `docs/director-foundation-checklist.md` | 记录情绪曲线、信息揭示、表演指导、SFX、合规、标题封面、系列化等未来能力 |

## 已完成的重要任务

| 日期 | 任务 | 说明 |
| --- | --- | --- |
| 2026-04-22 | 建立 AI 协作协议 | 新增项目上下文、决策、任务和交接文档 |
| 2026-04-22 | 工程现状阅读 | 已确认当前主流程、技术栈、测试状态 |
| 2026-04-22 | 提示词与风格方案讨论 | 已记录动态 Tip、局部反馈、组合式风格词库方向 |
| 2026-04-22 | HTML 交互原型 | 已新增 Tip/风格词库交互原型 |
| 2026-04-22 | 工作台融合交互原型 | 已新增嵌入 Stepper/分镜出图流程的 HTML 原型 |
| 2026-04-22 | 导演工作台增强原型 | 已新增画幅/参考图/安全区/单格高级设置原型 |
| 2026-04-22 | 剧本角色设定台原型 | 已新增 Step 1 剧本/角色/背景交互原型 |

## 新任务模板

复制下面模板追加到“当前任务”或直接写成独立小节。

```md
## Task: 任务名称

Status: todo
Owner: Codex / Claude Code / TBD

### Goal

一句话说明这轮要达成什么。

### Scope

- 允许修改的文件或模块
- 允许新增的 API/UI/测试

### Do Not Touch

- 不要修改的文件或行为
- 任何用户明确不想动的区域

### Acceptance

- 可观察的完成标准
- 必须通过的检查命令

### Notes

- 背景、约束、设计参考、风险
```
