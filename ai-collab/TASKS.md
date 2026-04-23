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
| done | 创作工作台升级实施计划 | Codex | `ai-collab/IMPLEMENTATION_PLAN.md` | 已写计划并完成 Phase 1/2 |
| todo | 建立提示词 demo/eval 脚本 | Codex | `scripts` 或 `src/lib/ai` 测试辅助 | 固定剧本，对比当前/新版提示词输出 |
| done | 拆分角色与背景 prompt 构建 | Codex | `src/lib/ai/prompt-builder.ts`、角色提取 API | 背景不再复用角色参考图 prompt |
| todo | 设计动态 Tip 参数系统 | Claude Code 或 Codex | 项目页 UI、AI API 入参、prompt 模板 | 剧本润色、角色提取、分镜拆解前置选项 |
| done | 建立漫画风格词库 | Codex | `src/lib/ai/style-presets.ts` | 基础画风 + 视觉题材 + 画面气质 |
| done | Step 1 数据地基 | Codex | `src/types/index.ts`、AI 提取/润色 API、角色保存 API | 扩展角色/背景 attributes，不改 DB schema |
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
## 生成失败详情展示完成记录

Status: done
Owner: Codex

### Result

- 生成、单格生成、重生成失败时会保存错误详情到 `panels.reviewFeedback`。
- API 会把错误文本返回给前端。
- 分镜卡片失败时可展开查看原因。
- 单格实时失败也会临时展示错误信息。

### Validation

- `npx tsc --noEmit`：通过。
- `npx vitest run`：通过，8 个测试文件，25 个测试。
- 相关文件定向 eslint：通过。

## Phase 6.5 完成记录：生成前可见可改 Prompt

Status: done
Owner: Codex

### Result

- `Shot` 新增 `promptOverride`。
- 未出图分镜也能看到预生成词。
- 用户可修改并保存每格生成词。
- 单格生成、批量出图、重生成都会优先使用 `promptOverride`。
- 可一键还原到系统生成版。

### Validation

- `npx tsc --noEmit`：通过。
- `npx vitest run`：通过，8 个测试文件，25 个测试。
- Phase 6.5 相关文件定向 eslint：通过。

## Phase 6.5 当前任务：生成前可见可改 Prompt

Status: done
Owner: Codex

### Goal

让 Step 2 在未出图前就能看到每格生成词，并允许用户修改后再出图。

### Acceptance

- 未出图分镜也能看到预生成词。
- 用户可修改并保存每格生成词。
- 单格生成优先使用保存后的生成词。
- 批量开始出图优先使用保存后的生成词。

## Phase 6 补充完成记录：出图一致性保护

Status: done
Owner: Codex

### Result

- 同名角色 fallback 已去重，优先选择有参考图且 id 更新的角色。
- 新生成分镜会自动绑定 `characterRefs/backgroundRef`。
- Step 2 新增“一键锁定参考”。
- 每格显示“本格主参考”；有主参考表示会传即梦 `ref_img`，无主参考会提示纯文本生成。

### Validation

- `npx tsc --noEmit`：通过。
- `npx vitest run`：通过，8 个测试文件，25 个测试。
- 一致性保护相关文件定向 eslint：通过。

## Phase 6 补充任务：出图一致性保护

Status: done
Owner: Codex

### Goal

减少分镜出图角色/背景不一致：自动锁定参考图，并在 Step 2 明确展示本格实际使用的主参考图。

### Acceptance

- 同名角色 fallback 时不再把多个重复角色都塞进 prompt。
- 新生成分镜会自动写入 `characterRefs/backgroundRef`。
- 旧分镜可以在 UI 一键补齐参考绑定。
- 每格显示主参考图来源。

## Phase 6 完成记录

Status: done
Owner: Codex

### Result

- 新增未生成分镜的单格生成 API：`src/app/api/projects/[token]/generate-panel/route.ts`。
- 批量出图会跳过已存在 panel，避免单格试生成后重复插入。
- Step 2 UI 新增顶部出图控制台：分辨率、字幕位置、底部安全区、批量开始出图。
- 每格分镜新增“生成此格”。
- 每格分镜新增单格设置：角色参考、背景参考、关键道具、预计时长、局部反馈。
- 已有 panel 仍支持生成词查看/编辑/AI 润色/重生成。

### Validation

- `npx tsc --noEmit`：通过。
- `npx vitest run`：通过，8 个测试文件，24 个测试。
- Phase 6 相关文件定向 eslint：通过。

## Phase 5 完成记录

Status: done
Owner: Codex

### Result

- `Shot` 已支持时长、字幕位置、关键道具、角色参考、背景参考、单格反馈、画幅、分辨率和安全区。
- 分镜拆解会要求模型输出 Phase 5 字段，缺失字段会自动补默认值。
- 批量出图会合成角色锁定、背景参考、关键道具、安全区和单格反馈。
- 单格重生成会读取对应 shot 上下文，并复用增强 prompt/参考图选择逻辑。
- 没有改数据库 schema，没有新增 drizzle 迁移。

### Validation

- `npx tsc --noEmit`：通过。
- `npx vitest run src/lib/ai/prompt-builder.test.ts`：通过，11 个测试。
- `npx vitest run`：通过，8 个测试文件，24 个测试。
- Phase 5 相关文件定向 eslint：通过。

## Phase 5 当前任务

Status: done
Owner: Codex

### Goal

Step 2 出图数据地基：扩展分镜数据结构，并让批量出图/单格重生成可以合成角色、背景、道具、字幕安全区和单格反馈。

### Scope

- 修改 `src/types/index.ts`
- 修改 `src/lib/ai/prompt-builder.ts`
- 修改 `src/app/api/projects/[token]/generate-shots/route.ts`
- 修改 `src/app/api/projects/[token]/generate/route.ts`
- 修改 `src/app/api/panels/[id]/regenerate/route.ts`
- 修改相关测试

### Do Not Touch

- 不改数据库 schema。
- 不新增 drizzle 迁移。
- 不做 Phase 6 的 Step 2 大 UI 改版。

### Acceptance

- 没有参考图时仍可用纯文本 prompt 出图。
- 有角色参考图时优先使用角色参考图并锁定角色设定。
- 背景参考通过 prompt 进入出图链路。
- 单格反馈只影响当前分镜。
- `npx tsc --noEmit` 通过。
- `npx vitest run` 通过。

## Phase 4 完成记录

Status: done
Owner: Codex

### Result

- Step 1 剧本优化已改为“预览 -> 采用 -> 手动保存”。
- AI 提取结果已改为建议区，角色建议和背景场景建议分开展示。
- 已确认角色和已确认背景场景分开展示。
- 背景卡片显示背景 Prompt 和参考图状态。

### Validation

- `npx tsc --noEmit`：通过。
- `npx vitest run`：通过，8 个测试文件，22 个测试。
- `npx eslint src/components/project/ScriptEditor.tsx src/components/project/CharacterManager.tsx`：通过。
- `npm run lint`：未全局通过，失败点来自本轮外既有文件，Phase 4 组件定向 lint 已通过。

## Phase 4 当前任务

Status: done
Owner: Codex

### Goal

Step 1 UI 小步升级：剧本优化先预览再采用，AI 提取结果进入建议区，角色和背景场景分开展示。

### Scope

- 修改 `src/components/project/ScriptEditor.tsx`
- 修改 `src/components/project/CharacterManager.tsx`
- 不改数据库 schema
- 不改 Step 2 出图链路

### Acceptance

- 手动添加角色/背景仍可用。
- AI 提取出的背景不混在角色列表里。
- 用户确认后才正式加入角色/背景。
- 剧本优化不会直接覆盖用户原文。
- `npx tsc --noEmit` 通过。
- `npx vitest run` 通过。
# 2026-04-23 - Phase 6.6 完成：角色身份与形态锁定入库

Status: done
Owner: Codex

## Result

- `characters` 表新增：
  - `identity_lock`：角色身份锁定词。
  - `default_form`：默认形态，例如 `human` / `animal` / `transforming`。
  - `form_prompts`：不同形态的出图补充词。
- 当前白狐项目 `b9eae942-8bcb-4993-ada5-2cf738d3d2a1` 中角色 id=8 已设置为默认 `human`。
- 分镜 prompt 生成会优先读取 DB 里的身份锁定和形态词。
- 普通“白狐现身”默认强化为人形九尾狐妖少女。
- 明确写“一只受伤的白狐 / 真身 / 狐狸形态”等镜头时，允许切换为动物白狐形态。
- 所有主要角色读取 API 改为走 `serializeCharacter`，避免新字段在不同接口里丢失。

## Validation

- `npx tsc --noEmit`：通过。
- `npx vitest run src/lib/ai/prompt-builder.test.ts`：通过，14 个测试。
- `npx vitest run`：通过，8 个测试文件，27 个测试。
- 相关文件定向 eslint：通过。

## Acceptance Notes

- 这次只解决“同一角色多形态导致白狐从少女变成普通狐狸”的数据和 prompt 地基。
- 已有分镜如果保存了 `promptOverride`，会继续优先使用用户改过的 prompt；需要重新预览或清空 override 才会完全吃到新的系统 prompt。
- 角色参考图本身如果已经画成白狐少女，可以继续复用；如果后续想更稳，可以重新生成白狐角色参考图。
# 2026-04-23 - Phase 6.7 完成：JSON 状态结构化入库

Status: done
Owner: Codex

## Result

- 审核了当前 JSON 存储：
  - `projects.shots` 已经是核心工作流状态，迁入结构化表。
  - `characters.form_prompts` 是固定三形态结构，迁入显式列。
  - `characters.attributes` 仍保持 JSON，因为它是 AI 弹性抽取字段。
  - `projects.model_config` 本轮保留 JSON，因为它是项目级模型快照，不是分镜工作流状态。
- 新增表：
  - `storyboard_shots`
  - `shot_character_refs`
  - `shot_character_names`
- 新增角色列：
  - `human_form_prompt`
  - `animal_form_prompt`
  - `transforming_form_prompt`
- API 新读写路径：
  - 项目 GET 返回 `shots` 数组。
  - 项目 PATCH 保存分镜时写入新表，并暂时同步旧 `projects.shots` 作为回退。
  - 分镜拆解、预览 prompt、单格出图、批量出图、重生成都改为读取结构化分镜表。

## Validation

- `npx tsc --noEmit`：通过。
- `npx vitest run`：通过，8 个测试文件，27 个测试。
- 相关文件定向 eslint：通过。
- 本地开发 DB 已回填：白狐项目的分镜、角色名、角色参考、背景参考已在新表中可查询。

# 2026-04-23 - Phase 6.8 完成：旧 JSON 字段清理

Status: done
Owner: Codex

## Result

- 删除旧字段依赖：
  - `projects.shots`
  - `characters.form_prompts`
- 新增 migration：
  - `drizzle/0006_puzzling_gunslinger.sql`
- 本地开发 DB 已执行 drop column：
  - `projects` 表不再包含 `shots`
  - `characters` 表不再包含 `form_prompts`
- 源码不再对 `projects.shots` 做镜像或 fallback。
- `formPrompts` 仍作为 TypeScript/前端/AI 层对象保留，但 DB 来源是三列：
  - `human_form_prompt`
  - `animal_form_prompt`
  - `transforming_form_prompt`

## Validation

- `npx tsc --noEmit`：通过。
- `npx vitest run`：通过，8 个测试文件，27 个测试。
- 相关文件定向 eslint：通过。
