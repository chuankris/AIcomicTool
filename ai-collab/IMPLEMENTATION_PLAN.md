# 创作工作台升级实施计划

最后更新：2026-04-22

## 总目标

把当前“AI 漫剧生成器”从可跑通的基础流程，升级为更稳定的创作工作台：

1. Step 1 作为剧本、角色、背景、参考图的前期设定台。
2. Step 2 采用两段式：先确认分镜脚本，再单格/批量出图。
3. 生成图片时利用组合式风格词库、角色参考图、背景参考图、画幅/安全区和单格反馈。
4. 专业导演层能力先进入地基文档，后续根据真实使用逐步加入。

本计划先聚焦地基能力，不先大改 UI。

## 实施原则

- 先数据和 prompt 能力，后 UI。
- 保持现有主流程可用，避免一次性重写。
- 优先修复已发现问题：背景被当成角色生成 prompt。
- 尽量复用现有 schema 的 JSON 字段，减少早期数据库迁移。
- 每阶段都必须可验证：TypeScript 检查、Vitest、关键人工检查。
- 每阶段完成后更新 `ai-collab/HANDOFF.md`。

## 阶段拆解

### Phase 0：计划与任务边界

状态：完成

目标：

- 写清实施计划。
- 明确第一轮代码改动范围。
- 避免 UI、DB、生成链路同时大改。

产出：

- `ai-collab/IMPLEMENTATION_PLAN.md`

验收：

- 用户确认计划后再开始代码改动。

### Phase 1：风格词库与 prompt 地基

状态：完成

目标：

- 建立组合式风格词库。
- 支持“基础画风 + 视觉题材 + 画面气质”的 prompt 合成。
- 保持旧 `style: string` 调用兼容。

建议文件：

- 新增：`src/lib/ai/style-presets.ts`
- 修改：`src/lib/ai/prompt-builder.ts`
- 修改/新增：`src/lib/ai/prompt-builder.test.ts`
- 视需要修改：`src/types/index.ts`

第一轮范围：

- 定义基础类型：
  - `StylePreset`
  - `VisualStyleConfig`
  - `StylePresetGroup`
- 定义初始词库：
  - 基础画风：日漫、韩漫、美漫、国风、厚涂漫画、写实漫画、黑白漫画、Q版漫画
  - 视觉题材：机甲科幻、末日废土、赛博朋克、性感魅惑、怪谈民俗、武侠江湖、校园青春
  - 画面气质：电影感、压迫感、冷色调、高级感、浪漫、热血、阴郁
- 提供方法：
  - `resolveStylePrompt(style: string | VisualStyleConfig): string`
  - `getStylePreset(id: string)`
  - `composeVisualStylePrompt(config: VisualStyleConfig)`

验收：

- `韩漫 + 赛博朋克 + 电影感` 能合成稳定中文 prompt。
- “性感魅惑”使用成熟时尚、高级感、非露骨表达。
- 旧调用 `buildPanelPrompt({ style: '韩漫' })` 不破坏。
- `npx tsc --noEmit` 通过。
- `npx vitest run` 通过。

### Phase 2：角色与背景 prompt 分离

状态：完成

目标：

- 修复背景场景复用角色 prompt 的问题。
- 背景 prompt 不再出现“正面全身”“角色参考图”等角色词。

建议文件：

- 修改：`src/lib/ai/prompt-builder.ts`
- 修改：`src/app/api/projects/[token]/extract-characters/route.ts`
- 修改/新增：`src/lib/ai/prompt-builder.test.ts`
- 视需要修改：`src/types/index.ts`

第一轮范围：

- 新增：
  - `buildBackgroundPrompt(attrs, style)`
  - `buildReferencePrompt({ type, attributes, style })`
- 角色继续走：
  - `buildCharacterPrompt`
- 背景属性可先复用 `attributes` JSON，不改 DB。
- `extract-characters` 中 `type === 'background'` 时使用背景 prompt。

验收：

- 背景 prompt 包含地点、时间、光线、关键道具、氛围、场景参考图。
- 背景 prompt 不包含“正面全身”“角色参考图”。
- 角色 prompt 仍保持角色参考图表达。
- 现有角色提取流程不报错。
- `npx tsc --noEmit` 通过。
- `npx vitest run` 通过。

### Phase 3：Step 1 数据地基

状态：完成

目标：

- 扩展角色/背景 attributes 的结构，不急于新增 DB 字段。
- 支持角色关系、剧情功能、声音气质、固定服装、关键道具。
- 支持背景场景用途、复用镜头、时间/光线/氛围。

建议文件：

- 修改：`src/types/index.ts`
- 修改：`src/app/api/projects/[token]/extract-characters/route.ts`
- 修改：`src/app/api/ai/refine-character/route.ts`
- 修改：相关测试

建议结构：

角色 attributes 可扩展：

```ts
relationships?: string[]
storyRole?: string
voiceProfile?: {
  tone?: string
  speed?: string
  lineStyle?: string
}
fixedOutfit?: string
keyProps?: string[]
doNotChange?: string[]
```

背景 attributes 可扩展：

```ts
locationType?: string
timeOfDay?: string
lighting?: string
keyProps?: string[]
atmosphere?: string
storyUsage?: string
reusableShots?: string[]
```

验收：

- 不需要新增迁移也能存储新结构。
- AI 输出可以降级：缺字段时不报错。
- 前端旧卡片仍能展示基础信息。

### Phase 4：Step 1 UI 小步升级

状态：待 Phase 3 后

目标：

- 剧本优化先预览再采用。
- AI 提取结果先进入建议区。
- 角色和背景分开展示。
- 背景卡片展示背景 prompt 和场景图状态。

建议文件：

- 修改：`src/components/project/ScriptEditor.tsx`
- 修改：`src/components/project/CharacterManager.tsx`
- 可能新增：
  - `src/components/project/ExtractedProposalList.tsx`
  - `src/components/project/BackgroundCard.tsx`

验收：

- 手动添加角色仍可用。
- AI 提取的背景不会混在角色列表里。
- 用户确认后才正式加入角色/背景。
- 剧本优化不会直接覆盖用户原文。

### Phase 5：Step 2 出图数据地基

状态：待 Step 1 地基后

目标：

- 分镜 shots 携带更多导演参数。
- 出图 prompt 可以合成全局风格、角色参考、背景参考、关键道具、单格反馈、画幅/安全区。

建议文件：

- 修改：`src/types/index.ts`
- 修改：`src/components/project/ShotPanelEditor.tsx`
- 修改：`src/app/api/projects/[token]/generate/route.ts`
- 修改：`src/app/api/panels/[id]/regenerate/route.ts`
- 修改：`src/lib/ai/prompt-builder.ts`

Shot 可扩展：

```ts
durationSec?: number
subtitlePosition?: 'bottom' | 'middle-bottom' | 'none'
keyProps?: string[]
characterRefs?: Array<{ characterId: number; strength?: number }>
backgroundRef?: { backgroundId: number; strength?: number }
localFeedback?: string
```

验收：

- 没有参考图时降级为纯文字 prompt。
- 有角色参考图时优先使用角色锁定词和 referenceImageUrl。
- 单格反馈只影响该格重生成。

### Phase 6：Step 2 UI 升级

状态：待 Phase 5 后

目标：

- 落地两段式 Step 2。
- 支持“生成此格”和批量“开始出图”。
- 支持顶部生成设置条。
- 展示每格参考绑定和导演参数。

建议文件：

- 修改：`src/components/project/ShotPanelEditor.tsx`
- 可能新增：
  - `src/components/project/VisualStylePicker.tsx`
  - `src/components/project/ShotStrategyPanel.tsx`
  - `src/components/project/PanelGenerationSettings.tsx`

验收：

- 进入 Step 2 不自动出图。
- 未出图时可以编辑分镜和生成设置。
- 单格生成可用。
- 批量开始出图可用。
- 已生成图不会因全局风格变化自动覆盖。

### Phase 7：导演检查层

状态：后续

目标：

- 加入 Step 1 进入分镜前检查。
- 加入 Step 2 批量出图前确认。
- 先用规则/静态检查，后续再接 AI 诊断。

参考文档：

- `docs/director-foundation-checklist.md`

验收：

- Step 1 能提示参考图缺失、关键道具缺失、声音未设等风险。
- Step 2 批量生成前显示数量、画幅、参考图、预计消耗和锁定提示。

## 第一轮代码任务建议

第一轮只做 Phase 1 + Phase 2。

任务名：

> 建立风格词库并拆分角色/背景 prompt

允许修改：

- `src/lib/ai/style-presets.ts`
- `src/lib/ai/prompt-builder.ts`
- `src/lib/ai/prompt-builder.test.ts`
- `src/types/index.ts`
- `src/app/api/projects/[token]/extract-characters/route.ts`

不要修改：

- `src/app/project/[token]/page.tsx`
- `src/components/project/CharacterManager.tsx`
- `src/components/project/ShotPanelEditor.tsx`
- `src/lib/db/schema.ts`
- `drizzle/`

验收命令：

```bash
npx tsc --noEmit
npx vitest run
```

人工验收：

- 背景 prompt 不再出现角色参考图词。
- 风格组合 prompt 可读、可控、不过度露骨。
- 旧项目仍能走现有生成路径。

## 风险点

- AI 输出结构不稳定：第一轮先不改模型输出 schema，避免扩大范围。
- 数据库迁移风险：第一轮不改 schema。
- UI 重构风险：第一轮不动核心 UI。
- 即梦 API 参考图参数真实性：第一轮只改 prompt 构建和类型地基，不改变图片 API 行为。

## 当前状态

- Phase 0：完成。
- Phase 1/2：完成。
- Phase 3：完成，等待用户验收。
- Phase 4：待用户验收后再推进。

## Phase 1/2 完成记录

完成时间：2026-04-22

改动摘要：

- 新增 `src/lib/ai/style-presets.ts`，提供组合式风格词库和风格 prompt 解析。
- 更新 `src/lib/ai/prompt-builder.ts`，支持 `StyleInput`，并新增背景 prompt 构建。
- 更新 `src/app/api/projects/[token]/extract-characters/route.ts`，背景类型走背景 prompt，角色类型走角色 prompt。
- 更新 `src/types/index.ts`，为背景属性预留轻量字段。
- 更新 `src/lib/ai/prompt-builder.test.ts`，覆盖组合风格、性感魅惑安全表达、背景 prompt 和 reference prompt 路由。

验证结果：

- `npx tsc --noEmit`：通过。
- `npx vitest run src/lib/ai/prompt-builder.test.ts`：通过，8 个测试。
- `npx vitest run`：通过，8 个测试文件，21 个测试。

## Phase 3 完成记录

完成时间：2026-04-22

改动摘要：

- 更新 `src/types/index.ts`，扩展 `CharacterAttributes`：
  - 角色字段：`relationships`、`storyRole`、`voiceProfile`、`fixedOutfit`、`keyProps`、`doNotChange`。
  - 背景字段继续使用 Phase 1/2 预留的 `locationType`、`timeOfDay`、`lighting`、`keyProps`、`atmosphere`、`storyUsage`、`reusableShots`。
- 更新 `src/app/api/ai/refine-character/route.ts`：
  - 提示词从单纯角色属性扩展为“角色或背景场景前期设定”。
  - 根据 `type` 使用 `buildReferencePrompt` 生成角色或背景 prompt。
- 更新 `src/app/api/projects/[token]/extract-characters/route.ts`：
  - 二次结构化时将 `type` 传给模型。
  - 提示词支持角色关系、剧情功能、声音、固定服装、关键道具、背景用途等字段。
- 更新 `src/lib/ai/character-extractor.ts`：
  - 角色属性提取支持 Phase 3 新字段。
- 更新 `src/app/api/characters/route.ts` 和 `src/app/api/characters/[id]/route.ts`：
  - 正式创建/更新角色或背景时也使用 `buildReferencePrompt`。
  - 避免 background 在保存或更新时重新走角色 prompt。
- 更新测试：
  - `src/lib/ai/prompt-builder.test.ts`
  - `src/lib/ai/character-extractor.test.ts`

验证结果：

- `npx vitest run src/lib/ai/prompt-builder.test.ts src/lib/ai/character-extractor.test.ts`：通过，2 个测试文件，11 个测试。
- `npx tsc --noEmit`：通过。
- `npx vitest run`：通过，8 个测试文件，22 个测试。
- `npx eslint src/components/project/ScriptEditor.tsx src/components/project/CharacterManager.tsx`：通过。
- `npm run lint`：未全局通过，失败点来自本轮外既有文件，Phase 4 组件定向 lint 已通过。

范围说明：

- 未改数据库 schema。
- 未改 drizzle。
- 未改 Step 1/Step 2 UI。
- 新字段通过现有 `attributes` JSON 存储。
## Phase 6 完成记录

完成时间：2026-04-22

改动摘要：

- 新增 `src/app/api/projects/[token]/generate-panel/route.ts`
  - 支持未生成分镜单格出图。
  - 复用 Phase 5 prompt/参考图逻辑。
- 修改 `src/app/api/projects/[token]/generate/route.ts`
  - 批量出图跳过已存在 panel。
- 修改 `src/app/project/[token]/page.tsx`
  - 支持新增 panel 回填到当前页面状态。
- 修改 `src/components/project/ShotPanelEditor.tsx`
  - 新增顶部出图控制台。
  - 支持全局分辨率、字幕位置、底部安全区。
  - 支持单格生成、角色参考、背景参考、关键道具、预计时长、局部反馈。

验证结果：

- `npx tsc --noEmit`：通过。
- `npx vitest run`：通过，8 个测试文件，24 个测试。
- Phase 6 相关文件定向 eslint：通过。

范围说明：

- 未修改数据库 schema。
- 未修改 drizzle。
- 单格生成当前同步等待即梦返回，后续如需更强体验可改成异步状态/轮询。

## Phase 6 开始记录

开始时间：2026-04-22

目标：

- 将 Phase 5 的出图数据地基暴露到 Step 2 UI。
- 支持未生成分镜的“生成此格”。
- 支持顶部生成设置条：画幅、分辨率、字幕安全区。
- 支持单格参考绑定：角色参考、背景参考、关键道具、局部反馈。
- 批量出图跳过已生成/已存在 panel，避免单格试生成后重复插入。

范围：

- 可新增单格生成 API。
- 可修改 `ShotPanelEditor` 和项目页 panel 状态同步。
- 不改数据库 schema，不新增 drizzle 迁移。

## Phase 5 完成记录

完成时间：2026-04-22

改动摘要：

- `src/types/index.ts`
  - `Shot` 新增导演和出图字段：时长、字幕位置、关键道具、角色参考、背景参考、单格反馈、画幅、分辨率和安全区。
- `src/lib/ai/prompt-builder.ts`
  - 增强 `buildPanelPrompt`，支持角色锁定、背景参考、关键道具、安全区和单格反馈。
  - 新增分镜角色/背景/参考图解析辅助函数。
- `src/app/api/projects/[token]/generate-shots/route.ts`
  - 分镜拆解提示词输出 Phase 5 字段。
  - 缺失字段自动默认化。
- `src/app/api/projects/[token]/generate/route.ts`
  - 批量出图使用增强 prompt 和参考图选择。
- `src/app/api/panels/[id]/regenerate/route.ts`
  - 单格重生成复用增强 prompt/参考图选择。

验证结果：

- `npx tsc --noEmit`：通过。
- `npx vitest run src/lib/ai/prompt-builder.test.ts`：通过。
- `npx vitest run`：通过，8 个测试文件，24 个测试。
- Phase 5 相关文件定向 eslint：通过。

范围说明：

- 未修改数据库 schema。
- 未修改 drizzle。
- 未做 Phase 6 UI 大改。
- 即梦客户端当前仍只支持单张主参考图，多参考图先通过 prompt 锁定和降级策略实现。

## Phase 4 完成记录

完成时间：2026-04-22

改动摘要：

- `src/components/project/ScriptEditor.tsx`
  - 剧本优化结果进入预览面板。
  - 用户点击“采用到编辑区”后才覆盖编辑区。
  - 采用优化稿后仍需用户主动保存。
- `src/components/project/CharacterManager.tsx`
  - AI 提取结果进入建议区。
  - 角色建议和背景场景建议分开展示。
  - 已确认角色和已确认背景场景分开展示。
  - 背景卡片显示背景 Prompt 和参考图状态。

验证结果：

- `npx tsc --noEmit`：通过。
- `npx vitest run`：通过，8 个测试文件，22 个测试。

范围说明：

- 未修改数据库 schema。
- 未修改 drizzle。
- 未修改 Step 2 出图链路。
- 下一阶段建议进入 Phase 5：Step 2 出图数据地基。
# Phase 6.6：角色身份与形态锁定（已完成）

完成时间：2026-04-23

目标：

- 解决多形态角色在分镜出图中漂移的问题，尤其是“白狐少女”被生成成普通狐狸。
- 把“角色默认形态”和“允许切换的形态”落到 DB，而不是只靠一次性 prompt 猜测。

实现：

- `characters` 增加 `identity_lock/default_form/form_prompts`。
- `buildPanelPrompt` 读取角色身份锁定、当前形态词和外观锁定词。
- 分镜文字中出现明确动物形态关键词时，允许从默认人形切换到动物形态。
- 分镜文字中出现化形关键词时，使用化形提示词。
- 当前白狐项目角色 id=8 已写入：
  - 默认形态：`human`
  - 人形：白狐少女 / 人形九尾狐妖 / 非动物狐狸
  - 兽形：白狐真身 / 四足 / 非人形
  - 化形：从白狐真身化为人形

验收方式：

- 在 Step 2 点击“刷新生成词/预览生成词”后，普通白狐出场应看到人形狐妖少女相关提示。
- “一只受伤的白狐”这类回忆镜头应看到动物白狐形态提示。
- 如果某格有旧的 `promptOverride`，需要重新编辑或清空后才能吃到新的系统 prompt。
# Phase 6.7：JSON 状态结构化入库（已完成）

完成时间：2026-04-23

目标：

- 检查当前写在 JSON 中但已经适合入库的业务状态。
- 优先把分镜工作流状态和固定形态 prompt 从 JSON 迁入 DB。

完成：

- `projects.shots` 迁入结构化分镜表：
  - `storyboard_shots`
  - `shot_character_refs`
  - `shot_character_names`
- `characters.form_prompts` 迁入固定列：
  - `human_form_prompt`
  - `animal_form_prompt`
  - `transforming_form_prompt`
- 新增 `src/lib/db/shots.ts` 作为分镜读写唯一入口。
- 项目 GET/PATCH、分镜拆解、出图、prompt 预览、重生成已接入新表。
- Phase 6.8 已删除 `projects.shots` 短期镜像/回退字段。

暂不迁移：

- `characters.attributes`：保留 JSON，适合 AI 弹性字段。
- `projects.model_config`：保留 JSON，后续可和 settings 体系一起重构。

验证：

- `npx tsc --noEmit`
- `npx vitest run`
- 相关文件定向 eslint

# Phase 6.8：旧 JSON 字段清理（已完成）

完成时间：2026-04-23

完成：

- 删除 `projects.shots` schema 字段。
- 删除 `characters.form_prompts` schema 字段。
- 删除 `projects.shots` fallback/mirror 逻辑。
- 删除 `characters.form_prompts` serializer fallback。
- 新增 drop-column migration：`drizzle/0006_puzzling_gunslinger.sql`。

验证：

- `npx tsc --noEmit`
- `npx vitest run`
- 相关文件定向 eslint
