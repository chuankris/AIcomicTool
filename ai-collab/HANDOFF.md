# AI 协作交接记录

这个文件是 Codex 和 Claude Code 的交接日志。每次完成一轮实质工作后，在顶部追加一条记录。不要删除旧记录，除非用户要求整理归档。

## 交接规则

接手前请先读 `ai-collab/` 目录：

1. `ai-collab/PROJECT_CONTEXT.md`
2. `ai-collab/DECISIONS.md`
3. `ai-collab/TASKS.md`
4. 本文件最近 3 条记录

交付后请写清：

- 本轮目标
- 修改内容
- 验证结果
- 未完成事项
- 下个 AI 需要注意的点

## 交接模板

```md
## YYYY-MM-DD - Codex/Claude Code - 简短标题

### 本轮目标

说明这轮想完成什么。

### 修改内容

- 修改/新增了哪些文件
- 关键行为变化是什么

### 验证结果

- `npx tsc --noEmit`：通过/失败/未运行
- `npx vitest run`：通过/失败/未运行
- 其他手动验证：说明结果

### 未完成事项

- 还有什么没做
- 哪些地方只是占位或假设

### 下个 AI 请注意

- 不要踩的坑
- 接下来最自然的动作
- 用户偏好或上下文
```

## 2026-04-22 - Codex - 新增工作台融合交互原型

### 本轮目标

再画一个更贴近现有项目 Stepper 的 HTML 原型，说明动态 Tip、组合式风格和局部反馈如何嵌入“分镜 & 出图”流程，而不是作为独立控制台。

### 修改内容

- 新增 `docs/workspace-integrated-interaction-prototype.html`：单文件 HTML/CSS/JS 原型。
- 更新 `ai-collab/TASKS.md`：记录工作台融合版原型已完成。

### 验证结果

- 未改应用代码。
- 未运行 `npx tsc --noEmit`，因为本轮只新增静态 HTML 和文档。
- 未运行 `npx vitest run`，因为本轮只新增静态 HTML 和文档。

### 未完成事项

- 原型不调用真实 API。
- 还没有把 `ShotStrategyPanel`、`VisualStylePicker`、单格反馈弹窗落到 React 组件。

### 下个 AI 请注意

- 这个版本更适合产品落地参考：顶部是紧凑生成设置条，展开后调整分镜策略和视觉风格，分镜卡片内保留 prompt 展开、加要求、重生成。
- 生成图片时应把“全局视觉风格 + 当前分镜 + 角色锁定词 + 单格反馈”合成为最终即梦 prompt。

## 2026-04-22 - Codex - 明确 Step 2 两段式出图

### 本轮目标

根据讨论修正工作台融合原型，让 Step 2 默认体现“先确认分镜脚本，再点击开始出图”，避免误解为进入 Step 2 后自动调用即梦。

### 修改内容

- 更新 `docs/workspace-integrated-interaction-prototype.html`：
  - 默认状态改为“分镜确认中”。
  - 分镜卡片默认显示“待出图”，不显示已生成/生成中。
  - 底部主按钮改为“✨ 开始出图”。
  - 增加流程状态条：AI 生成分镜脚本 → 用户确认/编辑 → 点击开始出图 → 单格反馈重生成。
  - 点击“开始出图”后模拟进入出图中状态，并锁定生成设置。
- 更新 `ai-collab/DECISIONS.md`：记录 Step 2 采用两段式确认。

### 验证结果

- 未改应用代码。
- 未运行 `npx tsc --noEmit`，因为本轮只修改静态 HTML 和文档。
- 未运行 `npx vitest run`，因为本轮只修改静态 HTML 和文档。

### 未完成事项

- 还没有把两段式状态机落到 React 组件和真实 API。

### 下个 AI 请注意

- Step 2 的默认状态应是 `editing_shots`，只有用户点击“开始出图”才调用即梦。
- 生成中应锁定分镜策略和全局视觉风格；生成完成后单格反馈/重生成可以继续使用。

## 2026-04-22 - Codex - 增加单格生成入口

### 本轮目标

根据讨论补充 Step 2 交互：除了批量“开始出图”，每个分镜也可以先单独“生成此格”，方便用户试一张图的风格和 prompt 效果。

### 修改内容

- 更新 `docs/workspace-integrated-interaction-prototype.html`：
  - 每个未出图分镜卡片新增“生成此格”按钮。
  - 单格生成会模拟进入生成中，再显示单格已生成。
  - 单格生成后开启“加要求/重生成”操作。
  - 底部状态文案改为“可单格试生成，也可批量开始出图”。
- 更新 `ai-collab/DECISIONS.md`：记录 Step 2 支持单格试生成。

### 验证结果

- 未改应用代码。
- 未运行 `npx tsc --noEmit`，因为本轮只修改静态 HTML 和文档。
- 未运行 `npx vitest run`，因为本轮只修改静态 HTML 和文档。

### 未完成事项

- 还没有把单格生成接入真实 `generateImage` API。

### 下个 AI 请注意

- 单格生成用于试效果，不应强制锁定整个 Step 2。
- 已生成图片不应因为后续修改全局风格而自动覆盖；需要用户主动重生成。

## 2026-04-22 - Codex - 新增导演工作台增强版原型

### 本轮目标

把短视频导演和 AI 出图控制项加入 Step 2 原型，展示画幅/清晰度、角色参考图、背景参考图、字幕安全区和单格高级设置如何融入出图流程。

### 修改内容

- 新增 `docs/director-workbench-prototype.html`：
  - 顶部导演设置包含画幅、清晰度、视觉风格、一致性摘要。
  - 设置抽屉包含画幅/清晰度、字幕安全区、角色参考强度、背景参考强度、参考图列表、高级默认项。
  - 分镜卡片右侧展示本格使用的角色参考、背景参考、画幅和安全区。
  - 单格“生成此格”和“单格高级设置”支持局部反馈、局部参考强度、seed/负面词等高级项。
- 更新 `ai-collab/TASKS.md`、`ai-collab/DECISIONS.md`、`ai-collab/HANDOFF.md`。

### 验证结果

- 未改应用代码。
- 未运行 `npx tsc --noEmit`，因为本轮只新增静态 HTML 和文档。
- 未运行 `npx vitest run`，因为本轮只新增静态 HTML 和文档。

### 未完成事项

- 还没有把导演设置抽成真实数据结构。
- 还没有把角色/背景参考强度接入即梦 API 参数。

### 下个 AI 请注意

- 当前策略是能力层先做加法，UI 层渐进暴露；默认简单，高级项折叠。
- 出图 prompt 应利用角色和背景参考图，不能只靠文字描述保持一致性。

## 2026-04-22 - Codex - 新增剧本角色设定台原型

### 本轮目标

为 Step 1 画一个更像“创作前期设定台”的交互稿，展示剧本优化预览、AI 提取建议、正式角色/背景卡片和参考图状态。

### 修改内容

- 新增 `docs/script-character-workbench-prototype.html`：
  - 剧本区包含润色偏好、改动幅度、原剧本和 AI 优化预览，用户可采用/忽略。
  - AI 提取建议区将角色和背景先作为待确认项展示。
  - 已确认角色区展示角色锁定词、参考图状态、局部反馈和生成参考图。
  - 已确认背景场景区展示场景属性、场景参考图和背景 prompt。
  - 顶部准备状态提示进入 Step 2 前的风险。
- 更新 `ai-collab/TASKS.md`、`ai-collab/DECISIONS.md`、`ai-collab/HANDOFF.md`。

### 验证结果

- 未改应用代码。
- 未运行 `npx tsc --noEmit`，因为本轮只新增静态 HTML 和文档。
- 未运行 `npx vitest run`，因为本轮只新增静态 HTML 和文档。

### 未完成事项

- 还没有把 Step 1 原型拆成真实 React 组件。
- 还没有实现背景场景的独立 schema 和生成接口。

### 下个 AI 请注意

- Step 1 应产出角色/背景参考图，服务 Step 2 的一致性。
- AI 提取建议需要用户确认后才进入正式设定。

## 2026-04-22 - Codex - 补充导演地基清单和检查层

### 本轮目标

把短视频导演审核中发现的关键能力补充到文档和交互稿里，避免后续推进代码时遗漏故事钩子、角色关系、道具锁定、镜头时长、批量确认、失败重试和版本历史等基础能力。

### 修改内容

- 新增 `docs/director-foundation-checklist.md`：记录 Step 1/Step 2 的导演地基需求、优先级和实现提醒。
- 更新 `docs/script-character-workbench-prototype.html`：
  - 增加“进入分镜前检查”。
  - 增加故事钩子、角色关系、声音气质、固定服装/关键道具、尺度边界等信息。
- 更新 `docs/director-workbench-prototype.html`：
  - 增加批量生成前检查条。
  - 每格增加预计时长、TTS/字幕提示、关键道具、失败重试、版本历史/封面候选等导演参数。
- 更新 `ai-collab/TASKS.md`、`ai-collab/HANDOFF.md`。

### 验证结果

- 未改应用代码。
- 未运行 `npx tsc --noEmit`，因为本轮只修改静态 HTML 和文档。
- 未运行 `npx vitest run`，因为本轮只修改静态 HTML 和文档。

### 未完成事项

- 还没有把导演检查层接入真实 AI 诊断。
- 还没有定义正式数据结构。

### 下个 AI 请注意

- 这些能力是地基，不代表第一版 UI 要全部平铺。
- 实现时应优先做：钩子检查、角色关系/剧情功能、关键道具锁定、预计时长、参考图绑定、批量生成确认、失败重试、单格版本历史。

## 2026-04-22 - Codex - 记录专业导演层未来能力

### 本轮目标

把专业短剧导演视角下的高规格需求写入需求文档，暂缓实现，避免后续遗漏。

### 修改内容

- 更新 `docs/director-foundation-checklist.md`：
  - 新增“专业导演层未来能力”。
  - 高优先级未来能力：情绪曲线、信息揭示节奏、表演指导、每格 SFX/环境声、成片时长预估、审核/合规边界强化、标题/封面钩子、机位/站位连续性。
  - 中优先级未来能力：系列化/集数、BGM 情绪、素材资产库、旁白/无对白/屏幕文字类型。
- 更新 `ai-collab/TASKS.md`、`ai-collab/DECISIONS.md`、`ai-collab/HANDOFF.md`。

### 验证结果

- 未改应用代码。
- 未运行 `npx tsc --noEmit`，因为本轮只更新文档。
- 未运行 `npx vitest run`，因为本轮只更新文档。

### 未完成事项

- 这些能力暂不进入当前实现排期。

### 下个 AI 请注意

- 当前策略是先打好 Step 1/Step 2 主流程地基，专业导演层能力先保留在需求文档。
- 后续实现时优先以检查卡/诊断卡方式引入，而不是直接堆复杂参数。

## 2026-04-22 - Codex - 编写创作工作台升级实施计划

### 本轮目标

在进入代码改动前，先拆解实施阶段、第一轮任务范围和验收标准，避免一次性改 UI、DB 和生成链路导致风险过大。

### 修改内容

- 新增 `ai-collab/IMPLEMENTATION_PLAN.md`：
  - Phase 0 到 Phase 7 的实施顺序。
  - 明确第一轮代码任务：风格词库 + 角色/背景 prompt 分离。
  - 列出允许修改和禁止修改的文件范围。
  - 列出验收命令和人工验收标准。
- 更新 `ai-collab/TASKS.md`：新增/标记“创作工作台升级实施计划”为进行中。

### 验证结果

- 未改应用代码。
- 未运行 `npx tsc --noEmit`，因为本轮只新增计划文档。
- 未运行 `npx vitest run`，因为本轮只新增计划文档。

### 未完成事项

- 需要用户确认计划后，才开始 Phase 1/2 的代码改动。

### 下个 AI 请注意

- 第一轮代码不动核心 UI、不改数据库 schema、不改 drizzle。
- 优先实现 `src/lib/ai/style-presets.ts` 和背景 prompt 分离。

## 2026-04-22 - Codex - 完成 Phase 1/2 风格词库与背景 prompt 分离

### 本轮目标

按 `ai-collab/IMPLEMENTATION_PLAN.md` 实现第一轮代码任务：建立组合式漫画风格词库，并拆分角色和背景 prompt 构建逻辑。

### 修改内容

- 新增 `src/lib/ai/style-presets.ts`
  - 定义 `StylePreset`、`VisualStyleConfig`、`StyleInput`。
  - 提供基础画风、视觉题材、画面气质词库。
  - 提供 `getStylePreset`、`composeVisualStylePrompt`、`resolveStylePrompt`。
- 更新 `src/lib/ai/prompt-builder.ts`
  - `buildCharacterPrompt` 和 `buildPanelPrompt` 支持组合式风格输入。
  - 新增 `buildBackgroundPrompt`。
  - 新增 `buildReferencePrompt`，根据 `character/background` 类型路由。
- 更新 `src/app/api/projects/[token]/extract-characters/route.ts`
  - AI 提取出的 background 使用背景 prompt。
  - character 继续使用角色参考图 prompt。
- 更新 `src/types/index.ts`
  - 在 `CharacterAttributes` 中为背景属性预留轻量字段。
- 更新 `src/lib/ai/prompt-builder.test.ts`
  - 覆盖组合风格、性感魅惑安全表达、背景 prompt、reference prompt 路由。

### 验证结果

- `npx vitest run src/lib/ai/prompt-builder.test.ts`：通过，1 个测试文件，8 个测试。
- `npx tsc --noEmit`：通过。
- `npx vitest run`：通过，8 个测试文件，21 个测试。

### 未完成事项

- 尚未改 Step 1/Step 2 UI。
- 尚未改数据库 schema。
- 尚未把背景独立 schema 接入 AI 提取提示词；本轮只先复用 attributes JSON 和 description/name 生成背景 prompt。

### 下个 AI 请注意

- 背景 prompt 已不会出现“正面全身”“角色参考图”。
- 旧字符串风格仍兼容，例如 `buildPanelPrompt({ style: '韩漫' })`。
- 组合字符串也可用，例如 `韩漫 / 赛博朋克 / 电影感`。
- 下一阶段建议进入 Phase 3：扩展 Step 1 数据地基，但需用户验收后再做。

## 2026-04-22 - Codex - 完成 Phase 3 Step 1 数据地基

### 本轮目标

按计划完成 Phase 3：扩展角色/背景 attributes 数据地基，让 Step 1 能承载关系、剧情功能、声音气质、固定服装、关键道具和背景用途等前期设定信息，同时不改数据库 schema。

### 修改内容

- 更新 `src/types/index.ts`
  - `CharacterAttributes` 新增 `relationships`、`storyRole`、`voiceProfile`、`fixedOutfit`、`keyProps`、`doNotChange` 等字段。
- 更新 `src/app/api/ai/refine-character/route.ts`
  - 提示词支持角色和背景场景两类前期设定。
  - 根据 type 使用 `buildReferencePrompt` 生成角色/背景 prompt。
- 更新 `src/app/api/projects/[token]/extract-characters/route.ts`
  - 二次结构化时将 item type 传给模型。
  - 提示词覆盖角色关系、剧情功能、声音、固定服装、关键道具、背景用途等字段。
- 更新 `src/lib/ai/character-extractor.ts`
  - 支持新角色 attributes 字段。
- 更新 `src/app/api/characters/route.ts` 和 `src/app/api/characters/[id]/route.ts`
  - 创建/更新时根据 character/background 路由 prompt，避免背景保存时回退为角色 prompt。
- 更新测试：
  - `src/lib/ai/prompt-builder.test.ts`
  - `src/lib/ai/character-extractor.test.ts`

### 验证结果

- `npx vitest run src/lib/ai/prompt-builder.test.ts src/lib/ai/character-extractor.test.ts`：通过，2 个测试文件，11 个测试。
- `npx tsc --noEmit`：通过。
- `npx vitest run`：通过，8 个测试文件，22 个测试。

### 未完成事项

- 未改 UI，新增字段暂不会完整展示。
- 未改数据库 schema，字段通过现有 `attributes` JSON 存储。
- 背景独立 AI schema 已写入提示词，但模型输出稳定性仍需要后续 demo/eval 验证。

### 下个 AI 请注意

- Phase 3 已完成，建议用户验收后再进入 Phase 4：Step 1 UI 小步升级。
- Phase 4 重点应是剧本优化预览、AI 提取建议区、角色/背景分开展示。

## 2026-04-22 - Codex - 集中协作文档目录

### 本轮目标

把根目录下分散的协作文档集中到 `ai-collab/`，方便用户下次直接要求“读这个目录”。

### 修改内容

- 新增 `ai-collab/PROJECT_CONTEXT.md`
- 新增 `ai-collab/DECISIONS.md`
- 新增 `ai-collab/TASKS.md`
- 新增 `ai-collab/HANDOFF.md`
- 这些文件内容来自原根目录协作文档，并将内部引用改为 `ai-collab/` 路径。

### 验证结果

- 未改应用代码。
- 未运行 `npx tsc --noEmit`，因为本轮只整理文档。
- 未运行 `npx vitest run`，因为本轮只整理文档。

### 未完成事项

- 根目录旧协作文档待删除或保留，由用户确认后处理。

### 下个 AI 请注意

- 用户希望以后只说“读 `ai-collab/` 目录”即可恢复上下文。
- 后续交接记录请优先追加到 `ai-collab/HANDOFF.md`。

## 2026-04-22 - Codex - 新增提示词与风格 HTML 交互原型

### 本轮目标

做一个不接入后端、不改 Next.js 代码的 HTML 原型，用来讨论动态 Tip、组合式风格词库和结果后的局部反馈交互。

### 修改内容

- 新增 `docs/prompt-style-interaction-prototype.html`：单文件 HTML/CSS/JS 原型。
- 更新 `TASKS.md`：将 HTML 交互原型记录为已完成。

### 验证结果

- 未改应用代码。
- 未运行 `npx tsc --noEmit`，因为本轮只新增静态 HTML 和文档。
- 未运行 `npx vitest run`，因为本轮只新增静态 HTML 和文档。

### 未完成事项

- 该原型目前只模拟结果，不调用真实 API。
- 还没有把 Tip 参数接入现有 React 页面和后端 prompt。
- 还没有把风格词库抽成正式 TypeScript 数据结构。

### 下个 AI 请注意

- 原型的交互方向是：生成前选项控制，生成后自然语言局部反馈。
- 组合式风格包含基础画风、视觉题材、画面气质三组。
- 若实现到产品中，应先抽风格词库和 prompt 参数结构，再改 UI。

## 2026-04-22 - Codex - 记录提示词与风格系统方案

### 本轮目标

把关于提示词优化、多轮交互、动态 Tip 和扩展漫画风格的讨论落到项目文档里，方便后续 Codex 或 Claude Code 接手。

### 修改内容

- 新增 `docs/prompt-and-style-roadmap.md`：记录提示词交互策略、创作型/抽取型任务分工、组合式风格系统、风格词库结构和实施顺序。
- 更新 `DECISIONS.md`：新增 Tip + 局部反馈、组合式视觉词库、角色与背景 prompt 分离等决策。
- 更新 `TASKS.md`：新增提示词 eval、角色/背景 prompt 拆分、动态 Tip 参数系统、风格词库和组合式风格 UI 任务。

### 验证结果

- 未改代码。
- 未运行 `npx tsc --noEmit`，因为本轮只新增和更新文档。
- 未运行 `npx vitest run`，因为本轮只新增和更新文档。

### 未完成事项

- 尚未实现提示词 demo/eval 脚本。
- 尚未拆分背景 prompt 构建逻辑。
- 尚未实现风格词库和 UI。

### 下个 AI 请注意

- 用户倾向“前置动态 Tip/选项 + 后置自然语言反馈”，不希望主流程变成纯聊天。
- 风格系统要支持机甲科幻、末日废土、赛博朋克、性感魅惑等更具体题材。
- “性感魅惑”要走成熟时尚、高级感、非露骨表达，不做露骨色情方向。

## 2026-04-22 - Codex - 建立协作协议

### 本轮目标

把 Codex 和 Claude Code 的协作方式固化到项目目录，降低后续交接成本。

### 修改内容

- 新增 `PROJECT_CONTEXT.md`：项目目标、流程、技术栈、关键目录和协作启动顺序。
- 新增 `DECISIONS.md`：当前产品、技术和协作决策。
- 新增 `TASKS.md`：共享任务看板和任务模板。
- 新增 `HANDOFF.md`：交接规则、交接模板和本轮记录。

### 验证结果

- 未改代码。
- 未运行 `npx tsc --noEmit`，因为本轮只新增文档。
- 未运行 `npx vitest run`，因为本轮只新增文档。

### 未完成事项

- 还没有新增 `docs/api-map.md`。
- 还没有开始 Plan B 的配音与视频导出。

### 下个 AI 请注意

- 当前项目详情页最新方向是三步 Stepper，不是旧的四 Tab。
- 如果继续做 UI，请参考 `../ued/漫剧生成器 Design System/`。
- 如果继续做生成链路，请先读 `src/app/api/projects/[token]/generate/route.ts` 和 `src/components/project/ShotPanelEditor.tsx`。
## 2026-04-22 - Codex - 完成 Phase 5 Step 2 出图数据地基
### 本轮目标

完成 Step 2 出图数据地基：扩展分镜结构，并让批量出图/单格重生成能够使用角色锁定、背景参考、关键道具、字幕安全区、分辨率和单格反馈。

### 修改内容

- 修改 `src/types/index.ts`
  - `Shot` 新增 `durationSec`、`subtitlePosition`、`keyProps`、`characterRefs`、`backgroundRef`、`localFeedback`、`aspectRatio`、`resolution`、`safeArea`。
- 修改 `src/lib/ai/prompt-builder.ts`
  - `buildPanelPrompt` 支持背景、关键道具、字幕安全区、画面安全区、单格反馈。
  - 新增 `resolvePanelCharacters`、`resolvePanelBackground`、`resolvePanelReferenceImage`。
  - 参考图降级策略：显式角色参考图 -> 首个角色参考图 -> 背景参考图 -> 纯文本 prompt。
- 修改 `src/app/api/projects/[token]/generate-shots/route.ts`
  - 分镜拆解提示词要求输出 Phase 5 新字段。
  - 增加 `normalizeShot`，模型缺字段时自动补默认值。
- 修改 `src/app/api/projects/[token]/generate/route.ts`
  - 批量出图使用增强 prompt、角色/背景解析和参考图选择。
  - 支持从 shot `resolution` 传入宽高。
- 修改 `src/app/api/panels/[id]/regenerate/route.ts`
  - 单格重生成读取项目 `shots`，复用角色/背景/参考图解析。
  - 没有 shot 上下文时保留旧的 panel prompt / sceneDesc 降级路径。
- 修改 `src/lib/ai/prompt-builder.test.ts`
  - 覆盖增强 panel prompt 和参考图选择。

### 验证结果

- `npx tsc --noEmit`：通过。
- `npx vitest run src/lib/ai/prompt-builder.test.ts`：通过，11 个测试。
- `npx vitest run`：通过，8 个测试文件，24 个测试。
- `npx eslint src/types/index.ts src/lib/ai/prompt-builder.ts src/lib/ai/prompt-builder.test.ts src/app/api/projects/[token]/generate-shots/route.ts src/app/api/projects/[token]/generate/route.ts src/app/api/panels/[id]/regenerate/route.ts`：通过。

### 未完成事项

- 没有改数据库 schema，新增字段通过 `projects.shots` JSON 保存。
- 没有做 Phase 6 的 Step 2 UI 设置面板。
- 即梦客户端当前仍只接收单张 `referenceImageUrl`，多参考图先通过 prompt 锁定和主参考图降级策略实现。
- `manga.db-shm` / `manga.db-wal` 是本地运行时数据库文件变更，本轮未主动处理。

### 下个 AI 请注意

- Phase 5 已完成，建议用户验收后进入 Phase 6：Step 2 UI 升级。
- Phase 6 应把本轮新增字段暴露到 UI：单格生成、分辨率/画幅、字幕安全区、角色/背景参考绑定、局部反馈。
- 不要在 Phase 6 里顺手改 DB schema，除非用户明确验收并决定需要持久化更细粒度的 panel 设置。

## 2026-04-22 - Codex - Phase 5 Step 2 出图数据地基开始
### 本轮目标

进入 Phase 5：先补 Step 2 出图数据地基，不做大 UI 改版，不改数据库 schema。

### 计划范围

- `src/types/index.ts`：扩展 `Shot`，支持时长、字幕位置、关键道具、角色参考、背景参考、单格反馈、画幅安全区等导演参数。
- `src/lib/ai/prompt-builder.ts`：新增/增强分镜出图 prompt 构建，让全局风格、角色锁定、背景参考、关键道具、单格反馈、安全区可以合成。
- `src/app/api/projects/[token]/generate-shots/route.ts`：让 AI 拆分分镜时输出新增字段，缺失时可降级。
- `src/app/api/projects/[token]/generate/route.ts`：批量出图使用增强 prompt 和参考图选择。
- `src/app/api/panels/[id]/regenerate/route.ts`：单格重生成复用同一套 prompt 构建逻辑。

### 验收标准

- 没有参考图时仍可用纯文本 prompt 出图。
- 有角色参考图时优先使用角色参考图并在 prompt 中锁定角色设定。
- 有背景参考图/背景名称时 prompt 中包含背景约束。
- 单格反馈只影响该格重生成或该格 prompt。
- 不新增数据库迁移。

## 2026-04-22 - Codex - 完成 Phase 4 Step 1 UI 小步升级
### 本轮目标

完成 Step 1 的小步 UI 升级：剧本优化先预览再采用；AI 提取先进入建议区；角色和背景场景分开展示。

### 修改内容

- 修改 `src/components/project/ScriptEditor.tsx`
  - AI 优化结果进入右侧“优化预览”面板。
  - 用户点击“采用到编辑区”后才覆盖当前编辑内容。
  - 采用后仍需用户主动保存剧本。
- 修改 `src/components/project/CharacterManager.tsx`
  - 新增“AI 提取建议”区。
  - 提取结果按“角色建议”和“背景场景建议”分栏。
  - 已确认内容按“已确认角色”和“已确认背景场景”分区展示。
  - 背景卡片显示背景 Prompt 和参考图状态。
  - 手动添加角色/背景仍保留“润色 -> 审核 -> 确认生成参考图”的流程。
- 更新 `ai-collab/TASKS.md` 和 `ai-collab/HANDOFF.md` 记录 Phase 4 进度。

### 验证结果

- `npx tsc --noEmit`：通过。
- `npx vitest run`：通过，8 个测试文件，22 个测试。
- `npx eslint src/components/project/ScriptEditor.tsx src/components/project/CharacterManager.tsx`：通过。
- `npm run lint`：未全局通过，失败点来自本轮外的既有文件：`src/app/page.tsx`、`src/components/project/ShotPanelEditor.tsx`、`src/lib/ai/model-client.test.ts` 等。

### 未完成事项

- 没有改数据库 schema。
- 没有改 Step 2 出图链路。
- 没有接入新的真实参考图参数，仍沿用现有角色/背景创建与重生成 API。
- `manga.db-shm` / `manga.db-wal` 是本地运行时数据库文件变更，本轮未主动处理。

### 下个 AI 请注意

- Phase 4 已完成，建议用户验收后再进入 Phase 5。
- Phase 5 应从 Step 2 出图数据地基开始，而不是继续扩大 Step 1 UI。
- 当前 `ScriptEditor` 和 `CharacterManager` 已被重写为正常 UTF-8 中文文案，后续修改时请保持编码一致。

## 2026-04-22 - Codex - Phase 4 Step 1 UI 小步升级开始
### 本轮目标

进入 Phase 4，只改 Step 1 UI，不改 DB schema，不改 Step 2 出图链路。

### 计划范围

- `src/components/project/ScriptEditor.tsx`：剧本优化结果先进入预览区，用户确认后才覆盖原文。
- `src/components/project/CharacterManager.tsx`：AI 提取结果先进入建议区；角色和背景场景分开展示；背景卡片显示背景 prompt 和参考图状态。
- `ai-collab/IMPLEMENTATION_PLAN.md` / `ai-collab/TASKS.md` / `ai-collab/HANDOFF.md`：阶段进度同步。

### 验收标准

- 手动添加角色/背景仍可用。
- AI 提取出的背景不混在角色列表里。
- 用户确认后才正式加入角色/背景。
- 剧本优化不会直接覆盖用户原文。
## 2026-04-23 - Codex - 补充分镜出图失败详情展示
### 本轮目标

图片生成失败时把真实错误返回并显示到分镜卡片上，方便用户排查即梦 Key、参考图、额度、参数等问题。

### 修改内容

- 新增 `src/lib/errors.ts`
  - 统一格式化错误信息，避免把复杂错误对象直接丢给用户。
- 修改 `src/app/api/projects/[token]/generate/route.ts`
  - 批量出图某格失败时，将错误写入 `panels.reviewFeedback`。
- 修改 `src/app/api/projects/[token]/generate-panel/route.ts`
  - 单格生成失败时将错误写入 `panels.reviewFeedback`，并在 API 响应中返回错误文本。
- 修改 `src/app/api/panels/[id]/regenerate/route.ts`
  - 重生成失败时将错误写入 `panels.reviewFeedback`，并返回错误文本。
- 修改 `src/components/project/ShotPanelEditor.tsx`
  - 失败卡片显示“查看原因/收起原因”。
  - 展示服务端错误详情和常见排查方向。
  - 单格实时失败时也会临时展示错误信息。

### 验证结果

- `npx tsc --noEmit`：通过。
- `npx vitest run`：通过，8 个测试文件，25 个测试。
- 相关文件定向 eslint：通过。

### 下个 AI 请注意

- 当前错误详情复用了 `panels.reviewFeedback` 字段，尚未新增专门的 `errorMessage` DB 字段。
- 后续如果做失败重试体验，可以在这个错误详情块旁边补“复制错误 / 重新生成 / 打开设置检查 Key”。

## 2026-04-23 - Codex - 完成 Phase 6.5：生成前可见可改 Prompt
### 本轮目标

修补 Step 2：未出图前也能先看到并修改每格生成词，单格/批量出图优先使用用户确认过的 prompt。

### 修改内容

- 修改 `src/types/index.ts`
  - `Shot` 新增 `promptOverride`。
- 修改 `src/app/api/projects/[token]/generate/route.ts`
  - 批量出图优先使用 `shot.promptOverride`，否则使用系统合成 prompt。
- 修改 `src/app/api/projects/[token]/generate-panel/route.ts`
  - 单格生成优先使用 `shot.promptOverride`。
- 修改 `src/app/api/panels/[id]/regenerate/route.ts`
  - 重生成优先使用 `shot.promptOverride`，其次是 `panel.prompt`，最后才是系统合成 prompt。
- 新增 `src/app/api/projects/[token]/preview-panel-prompts/route.ts`
  - 返回每格预生成词、系统生成词、是否正在使用 override、主参考图信息。
- 修改 `src/components/project/ShotPanelEditor.tsx`
  - 未出图分镜也可展开“预生成词”。
  - 支持保存为 `promptOverride`。
  - 支持还原为系统生成版。
  - UI 会标明当前使用“系统预生成版”还是“手动修改版”。

### 验证结果

- `npx tsc --noEmit`：通过。
- `npx vitest run`：通过，8 个测试文件，25 个测试。
- Phase 6.5 相关文件定向 eslint：通过。

### 未完成事项

- `promptOverride` 目前仍保存在 `projects.shots` JSON 中，没有单独落表。
- 未给“系统预生成词刷新”做显式按钮，目前是跟随 shots 变化自动重新拉取。

### 下个 AI 请注意

- 现在 Step 2 是“先看 prompt，再决定是否出图”的审核台形态，更符合创作流程。
- 后续如果继续做 Phase 7，可直接在这个基础上加入“出图前检查卡”。

## 2026-04-23 - Codex - Phase 6.5：生成前可见可改 Prompt
### 本轮目标

修补 Step 2 工作流：未出图前也能先看到并修改每格生成词，单格/批量出图优先使用用户确认过的 prompt。

### 计划范围

- 扩展 `Shot`，支持保存用户修改后的 `promptOverride`。
- 新增生成词预览 API。
- Step 2 未出图分镜也显示“预生成词”。
- 单格/批量出图优先使用 `promptOverride`，否则走系统合成 prompt。
- 不改数据库 schema，不新增 drizzle 迁移。

## 2026-04-23 - Codex - 完成 Phase 6 补充：出图一致性保护
### 本轮目标

减少分镜出图不一致：自动绑定角色/背景参考图，并在 Step 2 UI 显示本格实际使用的主参考图。

### 修改内容

- 修改 `src/lib/ai/prompt-builder.ts`
  - `resolvePanelCharacters` 同名角色去重。
  - 同名角色优先选择有参考图且 id 更新的记录。
  - 新增 `pickBestCharacterByName` 和 `bindShotReferences`。
- 修改 `src/app/api/projects/[token]/generate-shots/route.ts`
  - 新生成分镜会自动写入 `characterRefs/backgroundRef`。
- 修改 `src/components/project/ShotPanelEditor.tsx`
  - 新增“一键锁定参考”。
  - 每格显示“本格主参考”，并说明会作为即梦 `ref_img` 传入。
  - 没有主参考图时明确提示“纯文本生成，角色一致性会明显变差”。
- 修改 `src/lib/ai/prompt-builder.test.ts`
  - 增加同名角色去重和自动绑定测试。

### 验证结果

- `npx tsc --noEmit`：通过。
- `npx vitest run src/lib/ai/prompt-builder.test.ts`：通过，12 个测试。
- `npx vitest run`：通过，8 个测试文件，25 个测试。
- 一致性保护相关文件定向 eslint：通过。

### 下个 AI 请注意

- 现在 UI 能直接看出某格是否真走参考图：有“本格主参考”就是会传 `ref_img`；显示纯文本生成则不会。
- 即梦客户端仍只支持单张主参考图，多角色一致性仍受限；后续如要更强，需要调研即梦是否支持多参考图/角色一致性专用接口。

## 2026-04-23 - Codex - Phase 6 补充：出图一致性保护
### 本轮目标

把分镜出图一致性保护夹进 Phase 6：让系统更明确地使用角色/背景参考图，并在 UI 中显示本格实际会使用哪张主参考图。

### 计划范围

- 修正参考解析逻辑：同名角色去重，优先选择有参考图的新记录。
- 分镜生成后自动绑定角色参考和背景参考。
- Step 2 UI 增加“一键锁定参考”和“本格主参考”提示。
- 不改 DB schema，不新增 drizzle 迁移。

## 2026-04-22 - Codex - 完成 Phase 6 Step 2 UI 升级
### 本轮目标

完成 Step 2 UI 升级，把 Phase 5 的出图数据地基暴露到真实交互中：单格生成、批量出图、全局设置、参考绑定、关键道具和单格反馈。

### 修改内容

- 新增 `src/app/api/projects/[token]/generate-panel/route.ts`
  - 支持未生成分镜单独出图。
  - 复用 Phase 5 的角色/背景/参考图/prompt 合成逻辑。
  - 生成失败时将对应 panel 标记为 `failed`。
- 修改 `src/app/api/projects/[token]/generate/route.ts`
  - 批量出图会跳过已存在 panel，避免单格试生成后重复插入。
  - 只有存在待生成分镜时才将项目状态改为 `generating`。
- 修改 `src/app/project/[token]/page.tsx`
  - `handlePanelUpdate` 支持新增 panel，而不只是更新已有 panel。
- 重写 `src/components/project/ShotPanelEditor.tsx`
  - 顶部新增 Step 2 出图控制台。
  - 支持全局分辨率、字幕位置、底部安全区设置。
  - 支持单格“生成此格”。
  - 支持单格设置：角色参考、背景参考、关键道具、预计时长、单格反馈。
  - 已有 panel 继续支持生成词查看/编辑/AI 润色/重生成。

### 验证结果

- `npx tsc --noEmit`：通过。
- `npx vitest run`：通过，8 个测试文件，24 个测试。
- `npx eslint src/components/project/ShotPanelEditor.tsx src/app/project/[token]/page.tsx src/app/api/projects/[token]/generate-panel/route.ts src/app/api/projects/[token]/generate/route.ts`：通过。

### 未完成事项

- 没有改数据库 schema。
- 没有新增 drizzle 迁移。
- 单格生成 API 当前是同步等待即梦返回，真实生成耗时可能导致按钮等待 10-20 秒；后续可改为异步队列/轮询。
- 即梦仍只使用单张主参考图，多参考图通过 prompt 锁定和主参考图策略降级。
- `manga.db-shm` / `manga.db-wal` / `.next-dev.*.log` 是本地运行文件，本轮未处理。

### 下个 AI 请注意

- Phase 6 已完成，建议用户验收后再决定进入 Phase 7 导演检查层，或先真实跑一遍出图链路。
- Phase 7 更适合做进入分镜前检查和批量出图前确认，不要继续盲目加复杂 UI。
# 2026-04-23 - Codex - Phase 6.6：角色身份与形态锁定

## 本轮目标

修复白狐项目中“角色卡是白狐少女，但分镜变成普通狐狸”的一致性问题。根因是原先角色 prompt 只有外观括号锁定词，缺少“默认保持人形狐妖少女”的数据字段；同时“受伤白狐”这类闪回镜头又确实需要支持动物形态。

## 修改内容

- 修改 `src/lib/db/schema.ts`
  - `characters.identityLock`
  - `characters.defaultForm`
  - `characters.formPrompts`
- 新增 `drizzle/0003_curved_sally_floyd.sql`
  - 给 `characters` 表追加身份锁定和形态字段。
- 新增 `src/lib/db/serializers.ts`
  - 统一解析 `attributes/formPrompts` JSON。
  - 统一输出 `Character` 类型，避免 API 间字段丢失。
- 修改角色相关 API
  - 创建/更新角色时可保存身份锁定和形态词。
  - 生成参考图 prompt 时会拼入身份锁定和默认形态词。
- 修改分镜出图 prompt 构建
  - 角色 prompt 会包含 `identityLock`、当前形态 prompt、外观锁定词。
  - 默认形态来自 `defaultForm`。
  - 镜头文字明确出现“真身 / 狐狸形态 / 一只受伤的白狐”等关键词时切到 `animal`。
  - 镜头文字出现“化形 / 人形渐显”等关键词时切到 `transforming`。
- 已更新本地 SQLite
  - 给 `characters` 表加了 3 列。
  - 白狐项目角色 id=8 设置为默认 `human`，并写入 human/animal/transforming 三套形态词。

## 验证结果

- `npx tsc --noEmit`：通过。
- `npx vitest run src/lib/ai/prompt-builder.test.ts`：通过，14 个测试。
- `npx vitest run`：通过，8 个测试文件，27 个测试。
- 相关文件定向 eslint：通过。

## 下个 AI 请注意

- `Shot.promptOverride` 仍然优先生效；如果用户之前手动保存过旧 prompt，新系统 prompt 不会覆盖它。
- 白狐 id=8 的 DB 形态词为了避免 Windows 管道编码污染，当前使用英文锁定词，实际对图像模型可用。
- 以后做角色编辑 UI 时，建议把 `identityLock/defaultForm/formPrompts` 暴露出来，但先不要强迫普通用户每次填写。
# 2026-04-23 - Codex - Phase 6.7：JSON 状态结构化入库

## 本轮目标

检查此前为了快速 vibe coding 写进 JSON 的数据，判断哪些已经成为稳定业务状态，应迁入数据库结构。

## 结论

- 已迁入 DB：
  - `projects.shots` -> `storyboard_shots`、`shot_character_refs`、`shot_character_names`
  - `characters.form_prompts` -> `human_form_prompt`、`animal_form_prompt`、`transforming_form_prompt`
- 暂时保留 JSON：
  - `characters.attributes`：AI 抽取字段仍然变化快，适合保留 JSON。
  - `projects.model_config`：项目模型快照，本轮不和 settings 体系一起重构。
  - `projects.shots`：Phase 6.8 已删除旧字段，新逻辑只读结构化表。

## 修改内容

- 修改 `src/lib/db/schema.ts`
  - 新增 `storyboardShots`
  - 新增 `shotCharacterRefs`
  - 新增 `shotCharacterNames`
  - `characters` 新增三个人形/兽形/化形 prompt 列。
- 新增 `src/lib/db/shots.ts`
  - `listProjectShots`
  - `replaceProjectShots`
  - `findProjectShot`
- 修改 `src/app/api/projects/[token]/route.ts`
  - GET 组装结构化 `shots` 数组。
  - PATCH 保存分镜写入新表。
  - DELETE 清理分镜相关表。
- 修改出图相关 API
  - `generate-shots`
  - `generate`
  - `generate-panel`
  - `preview-panel-prompts`
  - `panels/[id]/regenerate`
- 新增 migrations：
  - `drizzle/0004_flimsy_whiplash.sql`
  - `drizzle/0005_flimsy_the_watchers.sql`

## 验证结果

- `npx tsc --noEmit`：通过。
- `npx vitest run`：通过。
- 定向 eslint：通过。
- 本地 DB 已回填，白狐项目分镜可从新表读到角色名和参考绑定。

## 下个 AI 请注意

- 前端现在直接接收 API 返回的 `shots` 数组。
- `projects.shots` 已删除，不要再写 fallback 到旧字段。
- 如果后续要进一步结构化，优先考虑 `projects.model_config` 与 `settings` 的关系，而不是拆 `attributes`。

# 2026-04-23 - Codex - Phase 6.8：旧 JSON 字段清理

## 本轮目标

用户确认可以清理旧字段后，删除 `projects.shots` 和 `characters.form_prompts` 这两个过渡字段。

## 修改内容

- 修改 `src/lib/db/schema.ts`
  - 移除 `projects.shots`
  - 移除 `characters.formPrompts`
- 修改 `src/lib/db/shots.ts`
  - 移除 `parseLegacyShots`
  - `listProjectShots` 只读结构化表。
- 修改项目和分镜 API
  - 项目 PATCH 保存分镜只写结构化表，不再同步旧 JSON。
  - 分镜拆解只写结构化表。
- 修改 `src/lib/db/serializers.ts`
  - `serializeCharacter` 不再解析旧 `form_prompts` JSON。
- 修改前端项目页
  - `data.shots` 只按数组读取。
- 新增 migration
  - `drizzle/0006_puzzling_gunslinger.sql`

## 验证结果

- `npx tsc --noEmit`：通过。
- `npx vitest run`：通过。
- 定向 eslint：通过。
- 本地 DB 已 drop column，`projects` 无 `shots`，`characters` 无 `form_prompts`。

## 下个 AI 请注意

- 历史 migration/meta 中仍会出现 `form_prompts` 和 `projects.shots`，这是迁移历史，不要手动删除。
- 运行到最新 migration 后，真实 schema 不包含这两个旧字段。
