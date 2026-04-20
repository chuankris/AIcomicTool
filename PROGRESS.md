# AI 漫剧生成平台 — 进度总览

> GitHub: https://github.com/chuankris/AIcomicTool
> 计划文档: `docs/superpowers/plans/2026-04-19-ai-manga-platform-plan-a.md`

---

## 项目简介

个人创作者工具，输入故事剧本，AI 自动完成：
1. 角色设定解析（自然语言 → 结构化属性 → 即梦母图）
2. 剧本拆解为分镜列表
3. 批量生成分镜图（即梦 API，参考图保持角色一致性）
4. 批量审核修改（标记问题格 → AI 修改 prompt → 重新生图）

**无需登录，免费使用，用户自带 AI 模型 Key。**

---

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16.2.4（App Router） |
| 数据库 | SQLite + Drizzle ORM（better-sqlite3） |
| 图像生成 | 即梦 API（火山引擎，HMAC-SHA256 签名） |
| AI 模型 | OpenAI SDK 兼容层（Claude / GPT / Gemini / 自定义） |
| 前端状态 | SWR 轮询 |
| 样式 | Tailwind CSS + shadcn/ui |
| 测试 | Vitest（8 文件，16 个测试） |
| 会话 | UUID token 存 localStorage（无登录） |

---

## 当前状态：Plan A 已完成 ✅

### 已实现功能

**后端 API**
- `POST /api/projects` — 创建项目，生成 UUID token
- `GET /api/projects/[token]` — 获取项目详情（含角色、分镜，不返回 API Key）
- `POST /api/projects/[token]/generate` — 启动生成流水线（202 异步）
  - 提取角色属性 + 生成母图
  - AI 解析剧本 → 分镜列表
  - 并发生图（上限 3 格，避免 API 限流）
  - 全部完成后更新项目状态为 `reviewing`
- `POST /api/projects/[token]/review` — 批量审核（202 异步）
  - AI 根据反馈修改 prompt
  - 重新生图
- `POST /api/characters` — 创建角色（生成母图）
- `PATCH /api/characters/[id]` — 更新角色属性并重新生图

**核心库**
- `src/lib/db/` — SQLite 单例 + Drizzle schema（projects / characters / panels 三张表）
- `src/lib/jimeng/sign.ts` — 火山引擎 HMAC-SHA256 签名
- `src/lib/jimeng/client.ts` — 即梦文生图 API（支持参考图，默认 70% 强度）
- `src/lib/ai/model-client.ts` — 统一 AI 客户端（Claude/GPT/Gemini/自定义 endpoint）
- `src/lib/ai/prompt-builder.ts` — 即梦 prompt 构建器（【】关键词格式，角色/分镜两种模式）
- `src/lib/ai/script-parser.ts` — 剧本 → 分镜列表（AI 解析，提取台词/情绪/构图/角色）
- `src/lib/ai/review-parser.ts` — 审核反馈 → prompt 修改（保留【】关键词）
- `src/lib/ai/character-extractor.ts` — 自然语言描述 → 结构化角色属性

**前端页面**
- `/` — 首页，介绍 + 开始创作入口
- `/create` — 三步向导
  - Step 1：角色设定（可选）+ 剧本输入
  - Step 2：漫画风格选择 + AI 模型配置
  - Step 3：确认信息 + 触发生成
- `/project/[token]` — 项目页
  - 分镜网格展示（9:16 竖屏比例）
  - SWR 轮询（生成中 3s 间隔，完成后停止）
  - 项目状态徽章（pending / generating / reviewing / done / failed）
  - 批量审核模式：点击标记问题格 → 填写反馈 → 提交重新生成

### 数据模型

```
projects: id, token, script, style, modelConfig(JSON), status, videoUrl, createdAt
characters: id, projectId, name, description, attributes(JSON), prompt, referenceImageUrl, type
panels: id, projectId, index, sceneDesc, dialogue, prompt, imageUrl, audioUrl,
        reviewFeedback, revision, status
```

### 项目状态流转

```
pending → generating → reviewing → done
                    ↘ failed
```

---

## 待完成：Plan B（视频合成）

### 目标
将审核通过的分镜图组合成竖屏漫剧 MP4 视频，支持下载。

### 需要实现

| 功能 | 技术方案 | 状态 |
|---|---|---|
| 每格分镜 TTS 配音 | 火山引擎 TTS API | ⬜ 未开始 |
| 图片+音频合成视频 | FFmpeg slideshow | ⬜ 未开始 |
| 视频下载入口 | 项目页新增下载按钮 | ⬜ 未开始 |

### 技术细节（已设计）

**TTS（火山引擎）**
- 接口：`tts.volcengineapi.com`，同样用 HMAC-SHA256 签名
- 每格分镜的 `dialogue` 字段作为合成文本
- 生成 MP3，存到 `panels.audioUrl`

**FFmpeg 视频合成**
- 每格分镜：图片显示时长 = 音频时长（或固定 3s）
- 输出：720×1280 竖屏 MP4，H.264 编码
- 存路径写入 `projects.videoUrl`

**新增 API**
- `POST /api/projects/[token]/export` — 触发 TTS + 视频合成（异步）

**前端**
- 项目页状态增加 `exporting` / `exported`
- 完成后显示下载按钮

### 环境依赖
- FFmpeg 需安装并加入 PATH
  - Windows: `winget install ffmpeg`
  - 验证: `ffmpeg -version`

---

## 下一步行动

### 推荐：先测试 Plan A

需要准备：
1. **即梦 API Key**：火山引擎控制台 → 访问控制 → Access Key（需要 Access Key ID + Secret Access Key）
2. **AI 模型 Key**：Claude / OpenAI / Gemini 任选其一

测试步骤：
```bash
cd manga-platform
npm run dev
# 访问 http://localhost:3000
```

走一遍完整流程：输入剧本 → 配置 Key → 等待生图 → 审核一格 → 提交重新生成

### 如果 Plan A 测试通过 → 开始 Plan B
- 申请火山引擎 TTS 服务权限
- 安装 FFmpeg
- 启动 Plan B 设计 + 实现

---

## 目录结构

```
manga-platform/
  src/
    app/
      page.tsx                          # 首页
      create/page.tsx                   # 三步向导
      project/[token]/page.tsx          # 项目页
      api/
        projects/route.ts               # POST /api/projects
        projects/[token]/route.ts       # GET /api/projects/[token]
        projects/[token]/generate/      # POST 启动生成
        projects/[token]/review/        # POST 提交审核
        characters/route.ts             # POST /api/characters
        characters/[id]/route.ts        # PATCH /api/characters/[id]
    lib/
      db/index.ts + schema.ts           # SQLite + Drizzle
      ai/
        model-client.ts                 # 统一 AI 客户端
        prompt-builder.ts               # 即梦 prompt 构建
        script-parser.ts                # 剧本解析
        review-parser.ts                # 审核反馈处理
        character-extractor.ts          # 角色属性提取
    jimeng/
        client.ts                       # 即梦 API
        sign.ts                         # 火山引擎签名
    components/
      create/
        WizardLayout.tsx
        Step1Characters.tsx
        Step2StyleModel.tsx
      project/
        PanelCard.tsx
  drizzle/                              # DB 迁移文件
  docs/superpowers/                     # 设计文档 + 计划文档
```

---

*最后更新：2026-04-20*
