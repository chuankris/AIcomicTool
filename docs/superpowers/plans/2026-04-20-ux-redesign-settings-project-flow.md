# UX 重设计：设置页 + 项目列表 + 项目多 Tab 流程 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构整体 UX：首页改为项目列表，新建项目立刻落库后进入多 Tab 项目详情页（角色AI润色 + 剧本AI优化 + 配置 + 分镜），独立设置页管理 AI 模型配置和即梦凭证。

**Architecture:** 新增 `settings`（AI模型配置）和 `jimeng_config`（即梦凭证）两张表；即梦 client 改为接收凭证参数而非读环境变量；项目详情页重构为四 Tab 布局；删除旧向导流程。所有异步路由继续使用 Next.js 16 `await params` 模式。

**Tech Stack:** Next.js 16 App Router, TypeScript, Drizzle ORM + better-sqlite3, Tailwind CSS, shadcn/ui, SWR, drizzle-kit

---

## 文件结构

```
新建：
  src/app/api/settings/route.ts              GET + POST /api/settings
  src/app/api/settings/[id]/route.ts         DELETE /api/settings/[id]
  src/app/api/jimeng-config/route.ts         GET + PUT /api/jimeng-config
  src/app/api/ai/refine-character/route.ts   POST (纯AI调用，返回attributes+prompt)
  src/app/api/ai/optimize-script/route.ts   POST (纯AI调用，返回优化剧本)
  src/app/settings/page.tsx                  设置页（AI配置CRUD + 即梦凭证）
  src/components/project/CharacterManager.tsx 角色管理+AI润色循环组件
  src/components/project/ScriptEditor.tsx    剧本输入+AI优化组件
  src/components/project/ConfigPanel.tsx     风格+AI配置选择组件

修改：
  src/lib/db/schema.ts                       追加 settings/jimeng_config 表，projects 加 name 列
  src/types/index.ts                         追加 ModelSetting / JimengConfig 类型
  src/lib/jimeng/client.ts                   generateImage 改为接收 accessKey/secretKey 参数
  src/app/api/projects/route.ts              GET(列表) + POST(接收settingId+name，允许空script)
  src/app/api/projects/[token]/route.ts      追加 PATCH（更新script/style）
  src/app/api/projects/[token]/generate/route.ts  移除characterDescriptions处理，改用DB凭证
  src/app/api/characters/route.ts            generateImage 调用改为从DB取即梦凭证
  src/app/api/characters/[id]/route.ts       同上
  src/app/page.tsx                           改为项目列表页
  src/app/project/[token]/page.tsx           重构为四Tab布局

删除：
  src/app/create/page.tsx
  src/components/create/WizardLayout.tsx
  src/components/create/Step1Characters.tsx
  src/components/create/Step2StyleModel.tsx
```

---

## Task 1: Schema + 类型 + 迁移

**Files:**
- Modify: `src/lib/db/schema.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: 更新 schema.ts**

完整替换 `src/lib/db/schema.ts`：

```typescript
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'

export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  token: text('token').notNull().unique(),
  name: text('name'),
  script: text('script').notNull().default(''),
  style: text('style').notNull().default('日漫'),
  modelConfig: text('model_config').notNull().default('{}'),
  status: text('status').notNull().default('draft'),
  videoUrl: text('video_url'),
  createdAt: integer('created_at').notNull(),
})

export const characters = sqliteTable('characters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  attributes: text('attributes').notNull().default('{}'),
  prompt: text('prompt').notNull().default(''),
  referenceImageUrl: text('reference_image_url'),
  type: text('type').notNull().default('character'),
})

export const panels = sqliteTable('panels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull(),
  index: integer('index').notNull(),
  sceneDesc: text('scene_desc').notNull(),
  dialogue: text('dialogue').notNull().default(''),
  prompt: text('prompt').notNull(),
  imageUrl: text('image_url'),
  audioUrl: text('audio_url'),
  reviewFeedback: text('review_feedback'),
  revision: integer('revision').notNull().default(0),
  status: text('status').notNull().default('pending'),
})

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  provider: text('provider').notNull(),
  baseURL: text('base_url').notNull(),
  model: text('model').notNull(),
  apiKey: text('api_key').notNull(),
  createdAt: integer('created_at').notNull(),
})

export const jimengConfig = sqliteTable('jimeng_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accessKeyId: text('access_key_id').notNull(),
  secretAccessKey: text('secret_access_key').notNull(),
  updatedAt: integer('updated_at').notNull(),
})
```

- [ ] **Step 2: 追加类型到 src/types/index.ts**

在文件末尾追加：

```typescript
export interface ModelSetting {
  id: number
  name: string
  provider: 'claude' | 'openai' | 'gemini' | 'custom'
  baseURL: string
  model: string
  apiKey: string
  createdAt: number
}

export interface JimengConfig {
  id: number
  accessKeyId: string
  secretAccessKey: string
  updatedAt: number
}
```

同时将 `ProjectStatus` 更新，加入 `'draft'`：

```typescript
export type ProjectStatus = 'draft' | 'pending' | 'generating' | 'reviewing' | 'done' | 'failed'
```

- [ ] **Step 3: 生成迁移 SQL**

```bash
cd manga-platform
npx drizzle-kit generate
```

预期：生成 `drizzle/0001_*.sql`，内容包含 `ALTER TABLE projects ADD COLUMN name TEXT`，以及 `CREATE TABLE settings` 和 `CREATE TABLE jimeng_config`。

- [ ] **Step 4: 应用迁移**

```bash
npx drizzle-kit migrate
```

预期：无报错，`manga.db` 中出现 `settings` 和 `jimeng_config` 表，`projects` 表有 `name` 列。

- [ ] **Step 5: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | head -20
```

预期：无报错。

- [ ] **Step 6: 提交**

```bash
git add src/lib/db/schema.ts src/types/index.ts drizzle/
git commit -m "feat: add settings and jimeng_config tables, add name to projects"
```

---

## Task 2: Settings API（AI 模型配置 CRUD）

**Files:**
- Create: `src/app/api/settings/route.ts`
- Create: `src/app/api/settings/[id]/route.ts`

- [ ] **Step 1: 创建 src/app/api/settings/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import type { ModelSetting } from '@/types'

export async function GET() {
  try {
    const rows = await db.select().from(settings).orderBy(desc(settings.createdAt))
    return NextResponse.json(rows)
  } catch (e) {
    console.error('[settings GET]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, provider, baseURL, model, apiKey } = body as Partial<ModelSetting>

    if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    if (!provider?.trim()) return NextResponse.json({ error: 'provider is required' }, { status: 400 })
    if (!apiKey?.trim()) return NextResponse.json({ error: 'apiKey is required' }, { status: 400 })
    if (!model?.trim()) return NextResponse.json({ error: 'model is required' }, { status: 400 })
    if (!baseURL?.trim()) return NextResponse.json({ error: 'baseURL is required' }, { status: 400 })

    const [row] = await db.insert(settings).values({
      name: name.trim(),
      provider,
      baseURL,
      model,
      apiKey,
      createdAt: Date.now(),
    }).returning()

    return NextResponse.json(row, { status: 201 })
  } catch (e) {
    console.error('[settings POST]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 创建 src/app/api/settings/[id]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const deleted = await db.delete(settings).where(eq(settings.id, numId)).returning()
    if (!deleted.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[settings DELETE]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | head -20
```

预期：无报错。

- [ ] **Step 4: 提交**

```bash
git add src/app/api/settings/
git commit -m "feat: add settings API for AI model config CRUD"
```

---

## Task 3: Jimeng Config API

**Files:**
- Create: `src/app/api/jimeng-config/route.ts`

- [ ] **Step 1: 创建 src/app/api/jimeng-config/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jimengConfig } from '@/lib/db/schema'

export async function GET() {
  try {
    const [row] = await db.select().from(jimengConfig)
    if (!row) return NextResponse.json(null)
    // 不返回完整 secretAccessKey，只返回掩码
    return NextResponse.json({
      id: row.id,
      accessKeyId: row.accessKeyId,
      secretAccessKeyMasked: row.secretAccessKey.slice(0, 4) + '****',
      updatedAt: row.updatedAt,
    })
  } catch (e) {
    console.error('[jimeng-config GET]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { accessKeyId, secretAccessKey } = body as { accessKeyId?: string; secretAccessKey?: string }

    if (!accessKeyId?.trim()) return NextResponse.json({ error: 'accessKeyId is required' }, { status: 400 })
    if (!secretAccessKey?.trim()) return NextResponse.json({ error: 'secretAccessKey is required' }, { status: 400 })

    const [existing] = await db.select().from(jimengConfig)
    if (existing) {
      await db.update(jimengConfig).set({
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        updatedAt: Date.now(),
      })
    } else {
      await db.insert(jimengConfig).values({
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        updatedAt: Date.now(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[jimeng-config PUT]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 创建读取即梦凭证的共享 helper**

新建 `src/lib/jimeng/credentials.ts`：

```typescript
import { db } from '@/lib/db'
import { jimengConfig } from '@/lib/db/schema'

export async function getJimengCredentials(): Promise<{ accessKeyId: string; secretAccessKey: string }> {
  const [config] = await db.select().from(jimengConfig)
  if (!config) throw new Error('即梦凭证未配置，请先在设置页配置 Access Key')
  return { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
}
```

- [ ] **Step 3: 提交**

```bash
git add src/app/api/jimeng-config/ src/lib/jimeng/credentials.ts
git commit -m "feat: add jimeng config API and credentials helper"
```

---

## Task 4: 更新即梦 Client 接收凭证参数

**Files:**
- Modify: `src/lib/jimeng/client.ts`

- [ ] **Step 1: 更新 generateImage 接受凭证参数**

完整替换 `src/lib/jimeng/client.ts`：

```typescript
// Note: API params below need verification against actual 即梦 docs
// Docs: https://www.volcengine.com/docs/85273/overview
import { buildSignedHeaders } from './sign'

const BASE_URL = 'https://visual.volcengineapi.com'
const SERVICE = 'cv'
const REGION = 'cn-north-1'

export interface GenerateImageParams {
  prompt: string
  style: string
  referenceImageUrl?: string | null
  referenceStrength?: number
  width?: number
  height?: number
  accessKeyId: string
  secretAccessKey: string
}

export interface GenerateImageResult {
  imageUrl: string
}

export async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  const {
    prompt, style, referenceImageUrl, referenceStrength = 0.7,
    width = 720, height = 1280, accessKeyId, secretAccessKey,
  } = params

  const body = JSON.stringify({
    req_key: 'jimeng_high_aes_general_v21_L',
    prompt: `${prompt}，${style}风格`,
    width,
    height,
    use_sr: true,
    return_url: true,
    ...(referenceImageUrl ? {
      ref_img: referenceImageUrl,
      ref_strength: referenceStrength,
    } : {}),
  })

  const uri = '/v1/cv/t2i'
  const headers = buildSignedHeaders({
    method: 'POST',
    uri,
    body,
    accessKey: accessKeyId,
    secretKey: secretAccessKey,
    service: SERVICE,
    region: REGION,
  })

  const response = await fetch(`${BASE_URL}${uri}`, { method: 'POST', headers, body })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`即梦 API error ${response.status}: ${text}`)
  }

  const data = await response.json()
  const imageUrl: string = data?.data?.image_urls?.[0] ?? data?.data?.binary_data_base64?.[0]
  if (!imageUrl) throw new Error('即梦 API 返回无图片数据')

  return { imageUrl }
}
```

- [ ] **Step 2: 更新 characters/route.ts 使用 DB 凭证**

修改 `src/app/api/characters/route.ts`，在 `generateImage` 调用前加凭证获取：

在文件顶部 import 中追加：
```typescript
import { getJimengCredentials } from '@/lib/jimeng/credentials'
```

找到 `generateImage` 调用，改为：
```typescript
const { accessKeyId, secretAccessKey } = await getJimengCredentials()
const { imageUrl: referenceImageUrl } = await generateImage({
  prompt,
  style: project.style,
  accessKeyId,
  secretAccessKey,
})
```

- [ ] **Step 3: 更新 characters/[id]/route.ts 使用 DB 凭证**

同 Step 2，在 `src/app/api/characters/[id]/route.ts` 的 `generateImage` 调用前加：

```typescript
import { getJimengCredentials } from '@/lib/jimeng/credentials'
// ...
const { accessKeyId, secretAccessKey } = await getJimengCredentials()
const { imageUrl: referenceImageUrl } = await generateImage({
  prompt,
  style: project.style,
  accessKeyId,
  secretAccessKey,
})
```

- [ ] **Step 4: 更新 generate/route.ts 使用 DB 凭证**

在 `src/app/api/projects/[token]/generate/route.ts` 中：

顶部追加：
```typescript
import { getJimengCredentials } from '@/lib/jimeng/credentials'
```

找到所有 `generateImage({ prompt, style: project.style, referenceImageUrl })` 调用，改为：
```typescript
const { accessKeyId, secretAccessKey } = await getJimengCredentials()
// ...（在 tasks 闭包内，从 project 级别获取一次即可）
```

具体做法：在 `const tasks = insertedPanels.map(...)` 之前获取凭证一次：
```typescript
const creds = await getJimengCredentials()
const tasks = insertedPanels.map(panel => async () => {
  // ...
  const { imageUrl } = await generateImage({
    prompt,
    style: project.style,
    referenceImageUrl,
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
  })
  // ...
})
```

- [ ] **Step 5: 更新 review/route.ts 使用 DB 凭证**

在 `src/app/api/projects/[token]/review/route.ts` 的 `generateImage` 调用前加凭证：

```typescript
import { getJimengCredentials } from '@/lib/jimeng/credentials'
// ...
const creds = await getJimengCredentials()
// 在 Promise.all 内每个 panel 的 generateImage 调用改为：
const { imageUrl } = await generateImage({
  prompt: newPrompt,
  style: project.style,
  referenceImageUrl,
  accessKeyId: creds.accessKeyId,
  secretAccessKey: creds.secretAccessKey,
})
```

- [ ] **Step 6: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | head -30
```

预期：无报错。

- [ ] **Step 7: 提交**

```bash
git add src/lib/jimeng/client.ts src/lib/jimeng/credentials.ts src/app/api/characters/ src/app/api/projects/
git commit -m "feat: update jimeng client to accept credentials params, fetch from DB"
```

---

## Task 5: 设置页 UI

**Files:**
- Create: `src/app/settings/page.tsx`

- [ ] **Step 1: 创建设置页**

```tsx
// src/app/settings/page.tsx
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ModelSetting } from '@/types'

const PROVIDERS = [
  { id: 'claude', label: 'Claude', baseURL: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-6' },
  { id: 'openai', label: 'GPT-4o', baseURL: 'https://api.openai.com/v1', model: 'gpt-4o' },
  { id: 'gemini', label: 'Gemini', baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-1.5-pro' },
  { id: 'custom', label: '自定义', baseURL: '', model: '' },
] as const

const PROVIDER_LABELS: Record<string, string> = {
  claude: 'Claude', openai: 'OpenAI', gemini: 'Gemini', custom: '自定义',
}

interface JimengDisplay {
  accessKeyId: string
  secretAccessKeyMasked: string
}

export default function SettingsPage() {
  const [configs, setConfigs] = useState<ModelSetting[]>([])
  const [jimeng, setJimeng] = useState<JimengDisplay | null>(null)
  const [showAiForm, setShowAiForm] = useState(false)
  const [showJimengForm, setShowJimengForm] = useState(false)
  const [aiForm, setAiForm] = useState({ name: '', provider: 'claude', baseURL: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-6', apiKey: '' })
  const [jimengForm, setJimengForm] = useState({ accessKeyId: '', secretAccessKey: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setConfigs).catch(() => {})
    fetch('/api/jimeng-config').then(r => r.json()).then(setJimeng).catch(() => {})
  }, [])

  function handleProviderChange(providerId: string) {
    const preset = PROVIDERS.find(p => p.id === providerId)
    if (!preset) return
    setAiForm(f => ({ ...f, provider: preset.id, baseURL: preset.baseURL, model: preset.model }))
  }

  async function saveAiConfig() {
    if (!aiForm.name.trim() || !aiForm.apiKey.trim()) { setError('名称和 API Key 必填'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiForm),
      })
      if (!res.ok) throw new Error('保存失败')
      const newItem = await res.json()
      setConfigs(prev => [newItem, ...prev])
      setShowAiForm(false)
      setAiForm({ name: '', provider: 'claude', baseURL: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-6', apiKey: '' })
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function deleteConfig(id: number) {
    if (!confirm('确认删除此配置？')) return
    await fetch(`/api/settings/${id}`, { method: 'DELETE' })
    setConfigs(prev => prev.filter(c => c.id !== id))
  }

  async function saveJimengConfig() {
    if (!jimengForm.accessKeyId.trim() || !jimengForm.secretAccessKey.trim()) {
      setError('两个字段均必填'); return
    }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/jimeng-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jimengForm),
      })
      if (!res.ok) throw new Error('保存失败')
      setJimeng({ accessKeyId: jimengForm.accessKeyId, secretAccessKeyMasked: jimengForm.secretAccessKey.slice(0, 4) + '****' })
      setShowJimengForm(false)
      setJimengForm({ accessKeyId: '', secretAccessKey: '' })
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-gray-400 hover:text-white text-sm">← 返回</Link>
        <h1 className="text-lg font-bold text-purple-400">配置管理</h1>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-10">
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* AI 模型配置 */}
        <section>
          <h2 className="text-base font-semibold mb-1">AI 模型配置</h2>
          <p className="text-xs text-gray-500 mb-4">用于角色润色、剧本解析等文本生成</p>

          <div className="space-y-2 mb-3">
            {configs.length === 0 && !showAiForm && (
              <p className="text-sm text-gray-500">暂无配置</p>
            )}
            {configs.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {PROVIDER_LABELS[c.provider] ?? c.provider} · {c.model} · {c.apiKey.slice(0, 6)}***
                  </div>
                </div>
                <button onClick={() => deleteConfig(c.id)}
                  className="text-xs text-red-400 hover:text-red-300 border border-red-900 rounded px-2 py-1">
                  删除
                </button>
              </div>
            ))}
          </div>

          {showAiForm ? (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
              <div>
                <Label>配置名称</Label>
                <Input placeholder="如：我的 Claude Key" value={aiForm.name}
                  onChange={e => setAiForm(f => ({ ...f, name: e.target.value }))}
                  className="bg-gray-800 border-gray-700 mt-1" />
              </div>
              <div>
                <Label>模型</Label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {PROVIDERS.map(p => (
                    <button key={p.id} onClick={() => handleProviderChange(p.id)}
                      className={`py-1.5 rounded border text-xs transition-colors ${
                        aiForm.provider === p.id
                          ? 'border-purple-500 bg-purple-900/40 text-purple-300'
                          : 'border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              {aiForm.provider === 'custom' && (
                <>
                  <div>
                    <Label>Base URL</Label>
                    <Input placeholder="http://localhost:11434/v1" value={aiForm.baseURL}
                      onChange={e => setAiForm(f => ({ ...f, baseURL: e.target.value }))}
                      className="bg-gray-800 border-gray-700 mt-1" />
                  </div>
                  <div>
                    <Label>Model Name</Label>
                    <Input placeholder="llama3" value={aiForm.model}
                      onChange={e => setAiForm(f => ({ ...f, model: e.target.value }))}
                      className="bg-gray-800 border-gray-700 mt-1" />
                  </div>
                </>
              )}
              <div>
                <Label>API Key</Label>
                <Input type="password" placeholder="sk-..." value={aiForm.apiKey}
                  onChange={e => setAiForm(f => ({ ...f, apiKey: e.target.value }))}
                  className="bg-gray-800 border-gray-700 mt-1" />
                <p className="text-xs text-gray-500 mt-1">仅用于生成请求，不会显示给其他用户</p>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="border-gray-700 flex-1" onClick={() => { setShowAiForm(false); setError(null) }}>取消</Button>
                <Button className="bg-purple-600 hover:bg-purple-700 flex-1" onClick={saveAiConfig} disabled={saving}>
                  {saving ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="border-gray-700 w-full" onClick={() => setShowAiForm(true)}>
              ＋ 添加 AI 配置
            </Button>
          )}
        </section>

        {/* 即梦配置 */}
        <section>
          <h2 className="text-base font-semibold mb-1">即梦图像生成配置</h2>
          <p className="text-xs text-gray-500 mb-4">
            火山引擎访问凭证，用于生成漫画分镜和角色预览图。
            <a href="https://console.volcengine.com/iam/keymanage" target="_blank" rel="noopener noreferrer"
              className="text-purple-400 ml-1 hover:underline">
              去火山引擎控制台获取 →
            </a>
          </p>

          {jimeng && !showJimengForm ? (
            <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">已配置</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Access Key ID：{jimeng.accessKeyId.slice(0, 8)}***
                </div>
              </div>
              <button onClick={() => setShowJimengForm(true)}
                className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded px-2 py-1">
                修改
              </button>
            </div>
          ) : null}

          {(!jimeng || showJimengForm) && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
              <div>
                <Label>Access Key ID</Label>
                <Input placeholder="AKLTxxxxxxxxxxxxxxxx" value={jimengForm.accessKeyId}
                  onChange={e => setJimengForm(f => ({ ...f, accessKeyId: e.target.value }))}
                  className="bg-gray-800 border-gray-700 mt-1" />
              </div>
              <div>
                <Label>Secret Access Key</Label>
                <Input type="password" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={jimengForm.secretAccessKey}
                  onChange={e => setJimengForm(f => ({ ...f, secretAccessKey: e.target.value }))}
                  className="bg-gray-800 border-gray-700 mt-1" />
              </div>
              <div className="flex gap-2 pt-1">
                {showJimengForm && (
                  <Button variant="outline" className="border-gray-700 flex-1" onClick={() => { setShowJimengForm(false); setError(null) }}>取消</Button>
                )}
                <Button className="bg-purple-600 hover:bg-purple-700 flex-1" onClick={saveJimengConfig} disabled={saving}>
                  {saving ? '保存中...' : '保存凭证'}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: 提交**

```bash
git add src/app/settings/
git commit -m "feat: add settings page with AI config CRUD and jimeng credentials"
```

---

## Task 6: 更新 POST /api/projects + 新增 GET（列表）和 PATCH（更新）

**Files:**
- Modify: `src/app/api/projects/route.ts`
- Modify: `src/app/api/projects/[token]/route.ts`

- [ ] **Step 1: 替换 src/app/api/projects/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, settings, characters, panels } from '@/lib/db/schema'
import { randomUUID } from 'crypto'
import { desc, eq, sql } from 'drizzle-orm'
import type { ModelConfig } from '@/types'

// GET /api/projects — 返回项目列表（不含 modelConfig）
export async function GET() {
  try {
    const rows = await db.select({
      id: projects.id,
      token: projects.token,
      name: projects.name,
      style: projects.style,
      status: projects.status,
      createdAt: projects.createdAt,
    }).from(projects).orderBy(desc(projects.createdAt))
    return NextResponse.json(rows)
  } catch (e) {
    console.error('[projects GET]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/projects — 创建项目（接收 settingId + name + style）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { settingId, name, style } = body as { settingId: number; name?: string; style: string }

    if (!settingId || typeof settingId !== 'number') {
      return NextResponse.json({ error: 'settingId is required' }, { status: 400 })
    }
    if (!style?.trim()) return NextResponse.json({ error: 'style is required' }, { status: 400 })

    const [setting] = await db.select().from(settings).where(eq(settings.id, settingId))
    if (!setting) return NextResponse.json({ error: 'Setting not found' }, { status: 400 })

    const modelConfig: ModelConfig = {
      provider: setting.provider as ModelConfig['provider'],
      baseURL: setting.baseURL,
      apiKey: setting.apiKey,
      model: setting.model,
    }

    const token = randomUUID()
    const [project] = await db.insert(projects).values({
      token,
      name: name?.trim() || null,
      script: '',
      style,
      modelConfig: JSON.stringify(modelConfig),
      status: 'draft',
      createdAt: Date.now(),
    }).returning()

    return NextResponse.json({ token: project.token, id: project.id }, { status: 201 })
  } catch (e) {
    console.error('[projects POST]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 在 src/app/api/projects/[token]/route.ts 追加 PATCH**

读取现有文件后，在文件末尾追加：

```typescript
// PATCH /api/projects/[token] — 更新 script / style / name
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  try {
    const [project] = await db.select().from(projects).where(eq(projects.token, token))
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const { script, style, name } = body as { script?: string; style?: string; name?: string }

    const updates: Record<string, unknown> = {}
    if (script !== undefined) updates.script = script
    if (style !== undefined) updates.style = style
    if (name !== undefined) updates.name = name

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    await db.update(projects).set(updates).where(eq(projects.token, token))
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[projects PATCH]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

同时在文件顶部，确保 `projects` 已在 import 中（通常已有，检查即可）。

- [ ] **Step 3: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: 提交**

```bash
git add src/app/api/projects/
git commit -m "feat: update projects API - list endpoint, settingId-based creation, PATCH update"
```

---

## Task 7: AI Refine Character API

**Files:**
- Create: `src/app/api/ai/refine-character/route.ts`

- [ ] **Step 1: 创建 refine-character 路由**

```typescript
// src/app/api/ai/refine-character/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { callModel } from '@/lib/ai/model-client'
import { buildCharacterPrompt } from '@/lib/ai/prompt-builder'
import type { ModelConfig, CharacterAttributes } from '@/types'

const REFINE_SYSTEM_PROMPT = `你是漫画角色设计师。将用户对角色的自然语言描述拆解为结构化属性，以 JSON 返回。

字段说明：
- age: 年龄描述（如"17岁"）
- gender: 性别（"男生"/"女生"）
- hairColor: 发色（如"黑色"、"棕色"、"金色"）
- hairStyle: 发型（如"直发"、"卷发"、"短发"、"双马尾"）
- outfit: 服装（如"白色校服"、"黑色西装"）
- personality: 性格气质（如"内向"、"活泼"、"冷酷"）
- expressionTendency: 表情倾向（如"微笑"、"严肃"、"忧郁"）

只返回 JSON，字段可以为空字符串，不要添加解释。`

const REFINE_WITH_FEEDBACK_PROMPT = `你是漫画角色设计师。根据用户反馈调整角色属性，以 JSON 返回更新后的属性。
原则：只调整用户指出的问题，其他属性保持不变。只返回 JSON，不要添加解释。`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, name, description, type, feedback, currentAttributes } = body as {
      token: string
      name: string
      description: string
      type: string
      feedback?: string
      currentAttributes?: CharacterAttributes
    }

    if (!token || !description?.trim()) {
      return NextResponse.json({ error: 'token and description are required' }, { status: 400 })
    }

    const [project] = await db.select().from(projects).where(eq(projects.token, token))
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const modelConfig: ModelConfig = JSON.parse(project.modelConfig)

    let attributes: CharacterAttributes
    if (feedback && currentAttributes) {
      // 带反馈的重新润色
      const userMessage = `角色名：${name}
原描述：${description}
当前属性：${JSON.stringify(currentAttributes)}
用户反馈：${feedback}
请根据反馈调整属性。`
      const raw = await callModel(modelConfig, REFINE_WITH_FEEDBACK_PROMPT, userMessage)
      const match = raw.match(/\{[\s\S]*\}/)
      attributes = match ? (JSON.parse(match[0]) as CharacterAttributes) : currentAttributes
    } else {
      // 初次润色
      const raw = await callModel(modelConfig, REFINE_SYSTEM_PROMPT, `角色名：${name}，描述：${description}`)
      const match = raw.match(/\{[\s\S]*\}/)
      attributes = match ? (JSON.parse(match[0]) as CharacterAttributes) : {}
    }

    const prompt = buildCharacterPrompt(attributes, project.style)
    return NextResponse.json({ attributes, prompt })
  } catch (e) {
    console.error('[ai/refine-character]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: 提交**

```bash
git add src/app/api/ai/
git commit -m "feat: add AI refine-character endpoint"
```

---

## Task 8: AI Optimize Script API

**Files:**
- Create: `src/app/api/ai/optimize-script/route.ts`

- [ ] **Step 1: 创建 optimize-script 路由**

```typescript
// src/app/api/ai/optimize-script/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { callModel } from '@/lib/ai/model-client'
import type { ModelConfig } from '@/types'

const SYSTEM_PROMPT = `你是漫画剧本编辑。将用户的故事文本优化为标准漫画剧本格式：
- 每个主要场景开头加【场景：简短描述】
- 对话格式：角色名：（动作/表情）台词
- 适当补充角色的情绪和肢体动作描述，使画面感更强
- 保持原有故事内容和情节不变
只返回优化后的剧本文本，不要添加任何解释或标题。`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, script } = body as { token: string; script: string }

    if (!token || !script?.trim()) {
      return NextResponse.json({ error: 'token and script are required' }, { status: 400 })
    }

    const [project] = await db.select().from(projects).where(eq(projects.token, token))
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const modelConfig: ModelConfig = JSON.parse(project.modelConfig)
    const optimizedScript = await callModel(
      modelConfig,
      SYSTEM_PROMPT,
      `请优化以下漫画剧本，风格为${project.style}：\n\n${script}`,
    )

    return NextResponse.json({ optimizedScript })
  } catch (e) {
    console.error('[ai/optimize-script]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/app/api/ai/optimize-script/
git commit -m "feat: add AI optimize-script endpoint"
```

---

## Task 9: CharacterManager 组件

**Files:**
- Create: `src/components/project/CharacterManager.tsx`

这是角色管理的核心组件，包含 AI 润色循环。

- [ ] **Step 1: 创建 CharacterManager.tsx**

```tsx
// src/components/project/CharacterManager.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Character, CharacterAttributes } from '@/types'

type CharType = 'character' | 'background'
type RefineState = 'idle' | 'refining' | 'reviewing' | 'generating'

interface RefineResult {
  attributes: CharacterAttributes
  prompt: string
}

interface Props {
  token: string
  characters: Character[]
  onCharactersChange: (chars: Character[]) => void
}

export function CharacterManager({ token, characters, onCharactersChange }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [charType, setCharType] = useState<CharType>('character')
  const [refineState, setRefineState] = useState<RefineState>('idle')
  const [refineResult, setRefineResult] = useState<RefineResult | null>(null)
  const [feedback, setFeedback] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRefine(withFeedback = false) {
    if (!name.trim() || !description.trim()) { setError('请填写名称和描述'); return }
    setError(null)
    setRefineState('refining')
    try {
      const body: Record<string, unknown> = { token, name, description, type: charType }
      if (withFeedback && feedback.trim() && refineResult) {
        body.feedback = feedback
        body.currentAttributes = refineResult.attributes
      }
      const res = await fetch('/api/ai/refine-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('润色失败')
      const data = await res.json()
      setRefineResult(data)
      setShowFeedback(false)
      setFeedback('')
      setRefineState('reviewing')
    } catch (e) {
      setError(e instanceof Error ? e.message : '润色失败，请重试')
      setRefineState('idle')
    }
  }

  async function handleApprove() {
    if (!refineResult) return
    setRefineState('generating')
    setError(null)
    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectToken: token,
          name,
          description,
          attributes: refineResult.attributes,
          prompt: refineResult.prompt,
          type: charType,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '保存失败')
      }
      const newChar = await res.json()
      onCharactersChange([...characters, { ...newChar, attributes: refineResult.attributes }])
      // 重置表单
      setName(''); setDescription(''); setRefineResult(null); setRefineState('idle')
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成预览图失败，请重试')
      setRefineState('reviewing')
    }
  }

  function resetForm() {
    setName(''); setDescription(''); setRefineResult(null)
    setRefineState('idle'); setShowFeedback(false); setFeedback(''); setError(null)
  }

  function removeChar(id: number) {
    fetch(`/api/characters/${id}`, { method: 'DELETE' }).catch(() => {})
    onCharactersChange(characters.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* 已有角色列表 */}
      {characters.length > 0 && (
        <div className="space-y-2">
          {characters.map(char => (
            <div key={char.id} className="flex gap-3 bg-gray-900 border border-gray-800 rounded-lg p-3">
              {char.referenceImageUrl ? (
                <img src={char.referenceImageUrl} alt={char.name}
                  className="w-16 h-20 object-cover rounded flex-shrink-0" />
              ) : (
                <div className="w-16 h-20 bg-gray-800 rounded flex-shrink-0 flex items-center justify-center text-gray-600 text-xs">
                  无图
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{char.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300">
                    {char.type === 'background' ? '背景' : '角色'}
                  </span>
                  <span className="text-xs text-green-400">✓ 已通过</span>
                </div>
                <div className="text-xs text-gray-400 mb-1">{char.description}</div>
                <div className="text-xs text-purple-300 bg-indigo-950 border border-purple-900/40 rounded p-1.5 leading-relaxed">
                  {char.prompt}
                </div>
              </div>
              <button onClick={() => removeChar(char.id)} className="text-gray-600 hover:text-red-400 text-xs self-start">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* 添加表单区域 */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="text-sm font-medium mb-3">
          {refineState === 'idle' ? '添加角色 / 背景场景' :
           refineState === 'refining' ? 'AI 润色中...' :
           refineState === 'reviewing' ? '审核润色结果' : '生成预览图中...'}
        </div>

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        {/* 输入阶段 */}
        {refineState === 'idle' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button onClick={() => setCharType('character')}
                className={`px-3 py-1 rounded text-xs border transition-colors ${charType === 'character' ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-700 text-gray-400'}`}>
                角色
              </button>
              <button onClick={() => setCharType('background')}
                className={`px-3 py-1 rounded text-xs border transition-colors ${charType === 'background' ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-700 text-gray-400'}`}>
                背景场景
              </button>
            </div>
            <div>
              <Label>名称</Label>
              <Input value={name} onChange={e => setName(e.target.value)}
                placeholder={charType === 'character' ? '如：小明' : '如：教室'}
                className="bg-gray-800 border-gray-700 mt-1" />
            </div>
            <div>
              <Label>描述</Label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder={charType === 'character'
                  ? '如：17岁内向的黑发男高中生，穿着深色校服，略显忧郁'
                  : '如：明亮的高中教室，午后阳光透过窗户斜射入内，空气宁静'}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-purple-500 mt-1" />
            </div>
            <Button onClick={() => handleRefine(false)}
              disabled={!name.trim() || !description.trim()}
              className="w-full bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600">
              ✨ AI 润色
            </Button>
          </div>
        )}

        {/* 润色中 */}
        {refineState === 'refining' && (
          <div className="flex items-center gap-3 py-4">
            <div className="w-4 h-4 border-2 border-purple-700 border-t-purple-300 rounded-full animate-spin" />
            <span className="text-sm text-gray-400">AI 正在生成关键词...</span>
          </div>
        )}

        {/* 审核阶段 */}
        {refineState === 'reviewing' && refineResult && (
          <div className="space-y-3">
            {/* 属性标签 */}
            <div>
              <div className="text-xs text-gray-500 mb-1.5">识别到的属性</div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(refineResult.attributes).map(([k, v]) => v ? (
                  <span key={k} className="text-xs px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-gray-300">
                    {v}
                  </span>
                ) : null)}
              </div>
            </div>
            {/* 生成的 Prompt */}
            <div>
              <div className="text-xs text-gray-500 mb-1.5">即梦 Prompt（将用于生图）</div>
              <div className="bg-indigo-950 border border-purple-900/40 rounded-lg p-3 text-xs text-purple-200 leading-relaxed">
                {refineResult.prompt}
              </div>
            </div>
            {/* 操作按钮 */}
            <div className="flex gap-2">
              <button onClick={() => setShowFeedback(true)}
                className="flex-1 py-2 text-xs border border-gray-700 rounded-lg text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-colors">
                ✕ 哪里不对
              </button>
              <button onClick={handleApprove}
                className="flex-1 py-2 text-xs bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors">
                ✓ 通过，生成预览图
              </button>
            </div>
            {/* 反馈输入 */}
            {showFeedback && (
              <div className="border-t border-gray-800 pt-3 space-y-2">
                <Label>哪里需要调整？</Label>
                <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
                  placeholder="如：头发应该是黑色，不是棕色；年龄改成17岁"
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-gray-200 resize-none focus:outline-none focus:border-purple-500" />
                <div className="flex gap-2">
                  <button onClick={() => { setShowFeedback(false); setFeedback('') }}
                    className="flex-1 py-1.5 text-xs border border-gray-700 rounded-lg text-gray-400 hover:text-gray-200">
                    取消
                  </button>
                  <button onClick={() => handleRefine(true)} disabled={!feedback.trim()}
                    className="flex-1 py-1.5 text-xs bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 rounded-lg text-white disabled:opacity-40">
                    ✨ 重新润色
                  </button>
                </div>
              </div>
            )}
            <button onClick={resetForm} className="w-full text-xs text-gray-600 hover:text-gray-400 pt-1">
              取消，重新输入
            </button>
          </div>
        )}

        {/* 生成预览图中 */}
        {refineState === 'generating' && (
          <div className="flex items-center gap-3 py-4">
            <div className="w-4 h-4 border-2 border-purple-700 border-t-purple-300 rounded-full animate-spin" />
            <div>
              <div className="text-sm text-gray-300">正在生成角色预览图...</div>
              <div className="text-xs text-gray-500 mt-0.5">调用即梦 API，约需 10-20 秒</div>
            </div>
          </div>
        )}
      </div>

      {refineState === 'idle' && (
        <p className="text-xs text-gray-600 text-center">角色设定可选，添加后 AI 将保持角色形象一致</p>
      )}
    </div>
  )
}
```

注意：`POST /api/characters` 目前接收 `projectToken`。需要检查 `src/app/api/characters/route.ts` 是否用 `projectToken` 而非 `projectId`。如果是 `projectId`，需要在 CharacterManager 的 `handleApprove` 中改为传 `projectToken` 并在 API 路由中先查项目。

- [ ] **Step 2: 检查 characters/route.ts 的字段名并对齐**

读取 `src/app/api/characters/route.ts`，确认请求体使用 `projectToken` 字段（若当前是 `projectId`，需要更新 API 接受 token 并查出 id）。

如果 characters API 接受 `projectId`，在 CharacterManager 的 API 调用中改为先不传 projectToken，而是让 API 路由接受 `projectToken` 并查询 projectId：

更新 `src/app/api/characters/route.ts` 的 POST handler，在现有的接受方式基础上，支持 `projectToken` 字段：

```typescript
// 在 POST handler 中，将 projectId 查找改为：
const { projectToken, name, description, attributes, prompt, type } = body as {
  projectToken: string
  name: string
  description: string
  attributes: CharacterAttributes
  prompt: string
  type: string
}

const [project] = await db.select().from(projects).where(eq(projects.token, projectToken))
if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

// 然后用 project.id 插入 character
```

- [ ] **Step 3: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: 提交**

```bash
git add src/components/project/CharacterManager.tsx src/app/api/characters/
git commit -m "feat: add CharacterManager component with AI refinement loop"
```

---

## Task 10: ScriptEditor 组件

**Files:**
- Create: `src/components/project/ScriptEditor.tsx`

- [ ] **Step 1: 创建 ScriptEditor.tsx**

```tsx
// src/components/project/ScriptEditor.tsx
'use client'
import { useState, useCallback } from 'react'

interface Props {
  token: string
  initialScript: string
  onSave: (script: string) => void
}

export function ScriptEditor({ token, initialScript, onSave }: Props) {
  const [script, setScript] = useState(initialScript)
  const [optimizedScript, setOptimizedScript] = useState<string | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleOptimize() {
    if (!script.trim()) { setError('请先输入剧本内容'); return }
    setError(null)
    setIsOptimizing(true)
    setOptimizedScript(null)
    try {
      const res = await fetch('/api/ai/optimize-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, script }),
      })
      if (!res.ok) throw new Error('优化失败')
      const data = await res.json()
      setOptimizedScript(data.optimizedScript)
    } catch (e) {
      setError(e instanceof Error ? e.message : '优化失败，请重试')
    } finally {
      setIsOptimizing(false)
    }
  }

  function acceptOptimized() {
    if (optimizedScript) {
      setScript(optimizedScript)
      setOptimizedScript(null)
    }
  }

  async function handleSave() {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script }),
      })
      if (!res.ok) throw new Error('保存失败')
      onSave(script)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold mb-1">故事剧本</h2>
        <p className="text-xs text-gray-500 mb-3">
          支持多角色对话，格式：角色名：（动作）台词。点击「AI 优化」自动补充场景描述和动作细节。
        </p>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex gap-4 items-start">
        {/* 主编辑区 */}
        <div className="flex-1">
          <textarea
            value={script}
            onChange={e => { setScript(e.target.value); setSaved(false) }}
            placeholder={`小明走进教室，看到小红坐在窗边。\n小明：你今天来得真早。\n小红：（微笑）昨晚没睡好，来这里待着。\n小明：（坐下）要不要一起吃早饭？`}
            rows={16}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm text-gray-200 resize-none focus:outline-none focus:border-purple-500 leading-relaxed"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-600">{script.length} 字</span>
            <div className="flex gap-2">
              <button onClick={handleOptimize} disabled={isOptimizing || !script.trim()}
                className="px-3 py-1.5 text-xs bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 rounded-lg text-white disabled:opacity-40 flex items-center gap-1.5">
                {isOptimizing ? (
                  <><div className="w-3 h-3 border border-purple-300 border-t-transparent rounded-full animate-spin" />优化中...</>
                ) : '✨ AI 优化'}
              </button>
              <button onClick={handleSave} disabled={isSaving}
                className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 rounded-lg text-white disabled:opacity-40">
                {isSaving ? '保存中...' : saved ? '✓ 已保存' : '保存'}
              </button>
            </div>
          </div>
        </div>

        {/* AI 优化结果面板 */}
        {(isOptimizing || optimizedScript) && (
          <div className="w-72 flex-shrink-0">
            <div className="bg-gray-900 border border-purple-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                {isOptimizing ? (
                  <><div className="w-3 h-3 border border-purple-300 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-gray-400">AI 优化中...</span></>
                ) : (
                  <span className="text-xs font-medium text-purple-300">✨ 优化版本</span>
                )}
              </div>
              {optimizedScript && (
                <>
                  <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto bg-indigo-950 border border-purple-900/30 rounded p-2 mb-3">
                    {optimizedScript}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setOptimizedScript(null)}
                      className="flex-1 py-1.5 text-xs border border-gray-700 rounded-lg text-gray-400 hover:text-gray-200">
                      忽略
                    </button>
                    <button onClick={acceptOptimized}
                      className="flex-1 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 rounded-lg text-white">
                      ✓ 采用
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: 提交**

```bash
git add src/components/project/ScriptEditor.tsx
git commit -m "feat: add ScriptEditor component with AI optimization panel"
```

---

## Task 11: ConfigPanel 组件

**Files:**
- Create: `src/components/project/ConfigPanel.tsx`

- [ ] **Step 1: 创建 ConfigPanel.tsx**

```tsx
// src/components/project/ConfigPanel.tsx
'use client'
import { useState, useEffect } from 'react'
import type { ModelSetting } from '@/types'

const STYLES = ['日漫', '韩漫', '美漫', '国风']

const PROVIDER_LABELS: Record<string, string> = {
  claude: 'Claude', openai: 'OpenAI', gemini: 'Gemini', custom: '自定义',
}

interface Props {
  token: string
  initialStyle: string
  onStyleChange: (style: string) => void
}

export function ConfigPanel({ token, initialStyle, onStyleChange }: Props) {
  const [style, setStyle] = useState(initialStyle)
  const [configs, setConfigs] = useState<ModelSetting[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setConfigs).catch(() => {})
  }, [])

  async function handleStyleChange(newStyle: string) {
    setStyle(newStyle)
    setSaved(false)
  }

  async function handleSave() {
    setIsSaving(true); setError(null)
    try {
      const res = await fetch(`/api/projects/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style }),
      })
      if (!res.ok) throw new Error('保存失败')
      onStyleChange(style)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {error && <p className="text-red-400 text-xs">{error}</p>}

      {/* 风格选择 */}
      <div>
        <h2 className="text-sm font-semibold mb-1">漫画风格</h2>
        <p className="text-xs text-gray-500 mb-3">决定生成图片的整体美术风格</p>
        <div className="grid grid-cols-4 gap-3">
          {STYLES.map(s => (
            <button key={s} onClick={() => handleStyleChange(s)}
              className={`py-3 rounded-lg border text-sm font-medium transition-colors ${
                style === s
                  ? 'border-purple-500 bg-purple-900/40 text-purple-300'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* AI 配置（只读展示，不可在此修改） */}
      <div>
        <h2 className="text-sm font-semibold mb-1">AI 模型配置</h2>
        <p className="text-xs text-gray-500 mb-3">
          创建项目时已选定。需要更换请到
          <a href="/settings" className="text-purple-400 hover:underline ml-1">设置页</a>
          添加新配置后重新创建项目。
        </p>
        {configs.length > 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
            <div className="text-xs text-gray-500">当前已配置的 AI 模型</div>
            <div className="mt-2 space-y-1">
              {configs.map(c => (
                <div key={c.id} className="text-xs text-gray-300">
                  {PROVIDER_LABELS[c.provider] ?? c.provider} · {c.name}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 border border-orange-900/50 rounded-lg px-4 py-3">
            <p className="text-xs text-orange-300">
              未检测到 AI 配置，请先
              <a href="/settings" className="underline ml-1">去设置页配置</a>
            </p>
          </div>
        )}
      </div>

      <button onClick={handleSave} disabled={isSaving}
        className="px-6 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg text-white disabled:opacity-40">
        {isSaving ? '保存中...' : saved ? '✓ 已保存' : '保存配置'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/project/ConfigPanel.tsx
git commit -m "feat: add ConfigPanel component for style and config management"
```

---

## Task 12: 首页 → 项目列表

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: 替换 src/app/page.tsx**

```tsx
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ProjectSummary {
  id: number
  token: string
  name: string | null
  style: string
  status: string
  createdAt: number
}

interface ModelSetting {
  id: number
  name: string
  provider: string
}

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  draft:      { label: '草稿',   class: 'bg-gray-800 text-gray-400' },
  pending:    { label: '待生成', class: 'bg-gray-800 text-gray-400' },
  generating: { label: '生成中', class: 'bg-yellow-900/40 text-yellow-400' },
  reviewing:  { label: '待审核', class: 'bg-blue-900/40 text-blue-400' },
  done:       { label: '完成',   class: 'bg-green-900/40 text-green-400' },
  failed:     { label: '失败',   class: 'bg-red-900/40 text-red-400' },
}

export default function HomePage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [settings, setSettings] = useState<ModelSetting[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', style: '日漫', settingId: 0 })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(rows => {
      if (Array.isArray(rows)) setProjects(rows)
    }).catch(() => {})
    fetch('/api/settings').then(r => r.json()).then(rows => {
      if (Array.isArray(rows)) {
        setSettings(rows)
        if (rows.length > 0) setForm(f => ({ ...f, settingId: rows[0].id }))
      }
    }).catch(() => {})
  }, [])

  async function createProject() {
    if (!form.settingId) { setError('请先在设置页添加 AI 配置'); return }
    setCreating(true); setError(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name || undefined, style: form.style, settingId: form.settingId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '创建失败')
      }
      const { token } = await res.json()
      router.push(`/project/${token}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败')
      setCreating(false)
    }
  }

  const STYLES = ['日漫', '韩漫', '美漫', '国风']

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-purple-400">漫剧生成器</h1>
        <Link href="/settings" className="text-sm text-gray-400 hover:text-gray-200">⚙️ 配置管理</Link>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold">我的项目</h2>
            <p className="text-xs text-gray-500 mt-0.5">每个项目包含角色、剧本和生成的分镜</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors">
            ＋ 新建项目
          </button>
        </div>

        {/* 无配置提示 */}
        {settings.length === 0 && (
          <div className="bg-orange-900/20 border border-orange-900/40 rounded-lg px-4 py-3 mb-4">
            <p className="text-sm text-orange-300">
              还没有 AI 配置，
              <Link href="/settings" className="underline ml-1">去设置页添加</Link>
              后才能新建项目。
            </p>
          </div>
        )}

        {/* 项目列表 */}
        <div className="space-y-2">
          {projects.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <div className="text-4xl mb-3">✏️</div>
              <p className="text-sm">还没有项目，新建一个开始创作</p>
            </div>
          ) : (
            projects.map(p => {
              const s = STATUS_MAP[p.status] ?? { label: p.status, class: 'bg-gray-800 text-gray-400' }
              return (
                <Link key={p.token} href={`/project/${p.token}`}
                  className="flex items-center justify-between bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-lg px-4 py-3 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{p.name || '未命名项目'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.class}`}>{s.label}</span>
                    </div>
                    <div className="text-xs text-gray-500">{p.style}</div>
                  </div>
                  <div className="text-xs text-gray-600">
                    {new Date(p.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>

      {/* 新建项目 Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-[420px] max-w-[90vw]">
            <h3 className="text-base font-semibold mb-4">新建项目</h3>
            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">项目名称（可选）</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="如：校园青春短剧"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">漫画风格</label>
                <div className="grid grid-cols-4 gap-2">
                  {STYLES.map(s => (
                    <button key={s} onClick={() => setForm(f => ({ ...f, style: s }))}
                      className={`py-2 rounded-lg border text-sm transition-colors ${
                        form.style === s
                          ? 'border-purple-500 bg-purple-900/40 text-purple-300'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">AI 配置</label>
                {settings.length === 0 ? (
                  <p className="text-xs text-orange-300">
                    请先<Link href="/settings" className="underline mx-1">去设置页</Link>添加 AI 配置
                  </p>
                ) : (
                  <select value={form.settingId}
                    onChange={e => setForm(f => ({ ...f, settingId: parseInt(e.target.value) }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500">
                    {settings.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setShowModal(false); setError(null) }}
                  className="flex-1 py-2 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-gray-200">
                  取消
                </button>
                <button onClick={createProject} disabled={creating || !form.settingId}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-lg text-sm text-white font-medium">
                  {creating ? '创建中...' : '创建项目'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: 提交**

```bash
git add src/app/page.tsx
git commit -m "feat: replace home page with project list and new project modal"
```

---

## Task 13: 项目详情页重构（四 Tab 布局）

**Files:**
- Modify: `src/app/project/[token]/page.tsx`

这是最大的改动，将现有的单页重构为四 Tab 布局，整合 CharacterManager、ScriptEditor、ConfigPanel 和现有分镜+审核功能。

- [ ] **Step 1: 完整替换 src/app/project/[token]/page.tsx**

```tsx
'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { CharacterManager } from '@/components/project/CharacterManager'
import { ScriptEditor } from '@/components/project/ScriptEditor'
import { ConfigPanel } from '@/components/project/ConfigPanel'
import { PanelCard } from '@/components/project/PanelCard'
import type { ProjectWithDetails, Character } from '@/types'

type Tab = 'chars' | 'script' | 'config' | 'panels'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  draft:      { label: '草稿',   class: 'bg-gray-800 text-gray-400' },
  pending:    { label: '待生成', class: 'bg-gray-800 text-gray-400' },
  generating: { label: '⏳ 生成中', class: 'bg-yellow-900/40 text-yellow-400' },
  reviewing:  { label: '✅ 待审核', class: 'bg-blue-900/40 text-blue-400' },
  done:       { label: '🎉 完成', class: 'bg-green-900/40 text-green-400' },
  failed:     { label: '生成失败', class: 'bg-red-900/40 text-red-400' },
}

export default function ProjectPage() {
  const { token } = useParams<{ token: string }>()
  const [activeTab, setActiveTab] = useState<Tab>('chars')
  const [characters, setCharacters] = useState<Character[]>([])
  const [script, setScript] = useState('')
  const [style, setStyle] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  // 审核状态
  const [selectedPanels, setSelectedPanels] = useState<Record<number, string>>({})
  const [reviewMode, setReviewMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { data: project, mutate, error: fetchError } = useSWR<ProjectWithDetails>(
    `/api/projects/${token}`,
    fetcher,
    {
      refreshInterval: (data) => {
        if (!data) return 3000
        const hasActive = data.panels?.some(p => p.status === 'generating' || p.status === 'pending')
        return hasActive ? 3000 : 0
      },
    }
  )

  // 初始化本地状态
  useEffect(() => {
    if (project) {
      setCharacters(project.characters ?? [])
      setScript(project.script ?? '')
      setStyle(project.style ?? '日漫')
      // 生成中或已完成，自动切到分镜 tab
      if (project.status === 'generating' || project.status === 'reviewing' || project.status === 'done') {
        setActiveTab('panels')
      }
    }
  }, [project?.token]) // 只在首次加载时初始化

  const canGenerate = script.trim().length > 0 && project?.status === 'draft'

  async function handleGenerate() {
    setIsGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch(`/api/projects/${token}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '生成失败')
      }
      setActiveTab('panels')
      mutate()
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : '启动生成失败')
    } finally {
      setIsGenerating(false)
    }
  }

  // 审核相关
  function toggleSelect(id: number) {
    setSelectedPanels(prev => {
      if (id in prev) { const next = { ...prev }; delete next[id]; return next }
      return { ...prev, [id]: '' }
    })
  }
  function setFeedback(id: number, text: string) {
    setSelectedPanels(prev => ({ ...prev, [id]: text }))
  }
  const hasFilledFeedback = Object.values(selectedPanels).some(f => f.trim())

  async function submitReview() {
    const reviews = Object.entries(selectedPanels)
      .filter(([, f]) => f.trim())
      .map(([panelId, feedback]) => ({ panelId: parseInt(panelId), feedback }))
    if (!reviews.length) return
    setIsSubmitting(true); setSubmitError(null)
    try {
      const res = await fetch(`/api/projects/${token}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews }),
      })
      if (!res.ok) throw new Error('提交审核失败，请重试')
      setSelectedPanels({}); setReviewMode(false); mutate()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '提交失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (fetchError) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <p className="text-red-400">加载失败，请刷新页面重试</p>
    </div>
  )
  if (!project) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">加载中...</div>
  )

  const statusInfo = STATUS_MAP[project.status] ?? { label: project.status, class: 'bg-gray-800 text-gray-400' }
  const panels = project.panels ?? []
  const allSettled = panels.length > 0 && panels.every(p => p.status === 'done' || p.status === 'failed')
  const selectedIds = Object.keys(selectedPanels).map(Number)

  const TABS: { id: Tab; label: string }[] = [
    { id: 'chars', label: '角色设定' },
    { id: 'script', label: '剧本' },
    { id: 'config', label: '配置' },
    { id: 'panels', label: `分镜${panels.length > 0 ? ` (${panels.length})` : ''}` },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← 项目列表</Link>
          <span className="text-gray-700">|</span>
          <span className="text-sm font-medium">{project.name ?? '未命名项目'}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.class}`}>{statusInfo.label}</span>
        </div>
        {generateError && <p className="text-red-400 text-xs">{generateError}</p>}
        {canGenerate && (
          <button onClick={handleGenerate} disabled={isGenerating}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-lg text-sm font-medium transition-colors">
            {isGenerating ? '启动中...' : '✨ 开始生成'}
          </button>
        )}
        {/* 审核操作 */}
        {activeTab === 'panels' && allSettled && !reviewMode && (
          <button onClick={() => setReviewMode(true)}
            className="px-4 py-2 border border-yellow-600 text-yellow-400 rounded-lg text-sm hover:bg-yellow-900/20">
            标记修改
          </button>
        )}
        {activeTab === 'panels' && reviewMode && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">已选 {selectedIds.length} 格</span>
            <button onClick={() => { setReviewMode(false); setSelectedPanels({}) }}
              className="px-3 py-1.5 border border-gray-700 rounded-lg text-sm">取消</button>
            <button onClick={submitReview} disabled={isSubmitting || !hasFilledFeedback}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-lg text-sm">
              {isSubmitting ? '提交中...' : '提交审核'}
            </button>
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 flex-shrink-0">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 text-sm transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-purple-400 border-purple-500 font-medium'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">

          {activeTab === 'chars' && (
            <CharacterManager
              token={token}
              characters={characters}
              onCharactersChange={setCharacters}
            />
          )}

          {activeTab === 'script' && (
            <ScriptEditor
              token={token}
              initialScript={script}
              onSave={setScript}
            />
          )}

          {activeTab === 'config' && (
            <ConfigPanel
              token={token}
              initialStyle={style}
              onStyleChange={setStyle}
            />
          )}

          {activeTab === 'panels' && (
            <div>
              {/* 状态栏 */}
              <div className="flex items-center gap-3 mb-4">
                {panels.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {panels.filter(p => p.status === 'done').length} / {panels.length} 格完成
                  </span>
                )}
              </div>
              {submitError && <p className="text-red-400 text-sm mb-3">{submitError}</p>}
              {panels.length === 0 ? (
                <div className="text-center py-16 text-gray-600">
                  <div className="text-3xl mb-3">🎬</div>
                  <p className="text-sm">还没有分镜</p>
                  {project.status === 'draft' && (
                    <p className="text-xs mt-2">填写剧本后点击「开始生成」</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {panels.map(panel => (
                    <div key={panel.id}>
                      <PanelCard
                        panel={panel}
                        isSelected={panel.id in selectedPanels}
                        onToggleSelect={toggleSelect}
                        reviewMode={reviewMode}
                      />
                      {reviewMode && panel.id in selectedPanels && (
                        <textarea
                          placeholder="描述问题（如：头发颜色不对）"
                          value={selectedPanels[panel.id]}
                          onChange={e => setFeedback(panel.id, e.target.value)}
                          className="w-full mt-2 bg-gray-900 border border-red-700/50 rounded p-2 text-xs text-gray-200 resize-none h-16 focus:outline-none focus:border-red-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: 提交**

```bash
git add src/app/project/[token]/page.tsx
git commit -m "feat: redesign project page to multi-tab layout with character/script/config/panels"
```

---

## Task 14: 更新 Generate Route（移除 characterDescriptions 处理）

**Files:**
- Modify: `src/app/api/projects/[token]/generate/route.ts`

角色现在在项目创建时从 CharacterManager 直接存入 DB，generate 不再需要处理 characterDescriptions。

- [ ] **Step 1: 读取现有 generate/route.ts**

读取 `src/app/api/projects/[token]/generate/route.ts`，找到以下处理 `characterDescriptions` 的代码块并删除（约 20 行）：

```typescript
// 删除：以下整块代码（含 body 解析、for loop、chars 重载）
const body = await req.json().catch(() => ({}))
const characterDescriptions = ...
for (const charDesc of characterDescriptions) {
  ...
}
// 删除到此处
```

保留：
- `parseScript` 调用（剧本解析）
- `panels` 批量插入
- `runWithConcurrency` 并发生图
- 状态更新逻辑

- [ ] **Step 2: 确保 generate route 使用 DB 凭证**

检查文件顶部是否已有 `import { getJimengCredentials } from '@/lib/jimeng/credentials'`（Task 4 已加），以及 `generateImage` 调用已传入 `creds.accessKeyId` 和 `creds.secretAccessKey`。

- [ ] **Step 3: 同时更新 project status 检查**

原来检查 `project.status !== 'pending'`，现在应改为 `project.status !== 'draft'`（项目从 'draft' 开始生成）：

```typescript
if (project.status !== 'draft') {
  return NextResponse.json({ error: 'Project already started' }, { status: 409 })
}
```

- [ ] **Step 4: 同时更新 status 更新**

Generate 开始时 `status` 从 `'pending'` 改为从 `'draft'` → `'generating'`（不影响实际 SQL，只是描述改变了）。

- [ ] **Step 5: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: 提交**

```bash
git add src/app/api/projects/[token]/generate/
git commit -m "feat: simplify generate route - remove characterDescriptions processing"
```

---

## Task 15: 清理旧向导文件

**Files:**
- Delete: `src/app/create/page.tsx`
- Delete: `src/components/create/WizardLayout.tsx`
- Delete: `src/components/create/Step1Characters.tsx`
- Delete: `src/components/create/Step2StyleModel.tsx`

- [ ] **Step 1: 删除旧文件**

```bash
rm src/app/create/page.tsx
rm src/components/create/WizardLayout.tsx
rm src/components/create/Step1Characters.tsx
rm src/components/create/Step2StyleModel.tsx
rmdir src/app/create
rmdir src/components/create
```

- [ ] **Step 2: 也删除 character-extractor（功能已内联到 refine-character API）**

注意：`src/lib/ai/character-extractor.ts` 和对应测试文件现在功能已被 `POST /api/ai/refine-character` 取代（内部调用了 `callModel` + `buildCharacterPrompt`）。但保留这个文件没有害处，且测试还在。所以跳过删除，保持向后兼容。

- [ ] **Step 3: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: 运行所有测试**

```bash
npx vitest run
```

预期：所有现有测试通过（旧向导组件没有测试，AI lib 的测试继续通过）。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "chore: remove old wizard components and create page"
```

---

## Task 16: 端到端验证

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

- [ ] **Step 2: 验证设置页流程**

访问 `http://localhost:3000/settings`：
- 添加一个 AI 配置（填写名称、选 Claude、填 API Key）→ 出现在列表
- 填写即梦配置（Access Key ID + Secret Access Key）→ 显示已配置
- 删除 AI 配置 → 从列表消失

- [ ] **Step 3: 验证项目创建流程**

访问 `http://localhost:3000`：
- 点「新建项目」→ 弹窗出现，能选择已配置的 AI 配置
- 填写名称、选风格 → 点「创建项目」→ 跳转到 `/project/[token]`

- [ ] **Step 4: 验证角色 Tab**

在项目页角色 Tab：
- 填写角色名称和描述 → 点「AI 润色」→ loading → 显示属性+Prompt
- 点「哪里不对」→ 填写反馈 → 点「重新润色」→ 再次显示结果
- 点「通过，生成预览图」→ loading → 角色卡显示（有图或无图取决于即梦配置）

- [ ] **Step 5: 验证剧本 Tab**

在项目页剧本 Tab：
- 输入剧本 → 点「AI 优化」→ 右边显示优化版本
- 点「采用」→ 剧本内容更新
- 点「保存」→ 成功提示

- [ ] **Step 6: 验证生成流程**

Header 的「开始生成」按钮（只有 draft 状态 + 有剧本时可点）：
- 点击 → 跳转分镜 Tab → 显示生成中状态
- 等待生成完成（需要真实 API Key）

- [ ] **Step 7: TypeScript 检查**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 8: 运行所有测试**

```bash
npx vitest run
```

- [ ] **Step 9: 最终提交 + 推送**

```bash
git add -A
git commit -m "feat: complete UX redesign - settings page, project list, multi-tab project flow"
git push
```

---

## 自检：Spec 覆盖确认

| 需求 | 对应 Task |
|---|---|
| 设置页 AI 配置 CRUD | Task 2 + Task 5 |
| 即梦凭证配置 | Task 3 + Task 5 |
| 即梦 client 从 DB 读凭证 | Task 4 |
| 首页 → 项目列表 | Task 12 |
| 新建项目 modal（settingId + 风格）| Task 6 + Task 12 |
| 项目立刻落库 + 跳转项目页 | Task 6 |
| 项目详情四 Tab 布局 | Task 13 |
| 角色 AI 润色循环（输入→润色→审核→重润→通过）| Task 7 + Task 9 |
| 角色通过后立刻生图 | Task 9 |
| 剧本 Tab + AI 优化按钮 | Task 8 + Task 10 |
| 配置 Tab（风格选择）| Task 11 |
| 分镜 Tab（生成+审核，现有功能保留）| Task 13 |
| generate route 移除 characterDescriptions | Task 14 |
| 旧向导清理 | Task 15 |
