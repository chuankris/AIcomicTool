// src/app/api/projects/[token]/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, characters, panels } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { parseScript } from '@/lib/ai/script-parser'
import { buildPanelPrompt } from '@/lib/ai/prompt-builder'
import { generateImage } from '@/lib/jimeng/client'
import { getJimengCredentials } from '@/lib/jimeng/credentials'
import type { ModelConfig, Character, Shot } from '@/types'

const CONCURRENCY = 3

async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = []
  let index = 0
  async function worker() {
    while (index < tasks.length) {
      const i = index++
      results[i] = await tasks[i]()
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  return results
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  try {
    const [project] = await db.select().from(projects).where(eq(projects.token, token))
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (project.status !== 'draft') {
      return NextResponse.json({ error: 'Project already started' }, { status: 409 })
    }

    await db.update(projects).set({ status: 'generating' }).where(eq(projects.token, token))

    const modelConfig: ModelConfig = JSON.parse(project.modelConfig)

    const creds = await getJimengCredentials()

    const chars: Character[] = (await db.select().from(characters).where(eq(characters.projectId, project.id)))
      .map(c => ({ ...c, attributes: JSON.parse(c.attributes), type: c.type as Character['type'] }))

    // 1. 解析剧本
    const shotList: Shot[] = project.shots ? (() => {
      try { return JSON.parse(project.shots) } catch { return [] }
    })() : []

    const parsedPanels = shotList.length > 0
      ? shotList.map(s => ({
          index: s.index,
          sceneDesc: s.sceneDesc,
          characters: s.characters,
          dialogue: s.dialogue,
          emotion: s.emotion,
          composition: s.composition,
          prompt: '',
        }))
      : await parseScript(project.script, project.style, modelConfig)

    // 2. 写入 panels 表（状态 pending）
    const insertedPanels = await db.insert(panels).values(
      parsedPanels.map(p => ({
        projectId: project.id,
        index: p.index,
        sceneDesc: p.sceneDesc,
        dialogue: p.dialogue,
        prompt: p.prompt,
        status: 'pending' as const,
        imageModel: project.imageModel || 'jimeng',
      }))
    ).returning()

    // 3. 并发生成（上限 3）
    const parsedByIndex = new Map(parsedPanels.map(p => [p.index, p]))
    const tasks = insertedPanels.map(panel => async () => {
      await db.update(panels).set({ status: 'generating' }).where(eq(panels.id, panel.id))
      try {
        const parsed = parsedByIndex.get(panel.index)
        const panelChars = chars.filter(c => parsed?.characters.includes(c.name) ?? false)
        const prompt = buildPanelPrompt({
          characters: panelChars,
          sceneDesc: panel.sceneDesc,
          emotion: parsed?.emotion ?? '',
          composition: parsed?.composition ?? '',
          style: project.style,
        })
        const referenceImageUrl = panelChars[0]?.referenceImageUrl ?? undefined
        const { imageUrl } = await generateImage({
          prompt,
          style: project.style,
          referenceImageUrl,
          accessKeyId: creds.accessKeyId,
          secretAccessKey: creds.secretAccessKey,
        })
        await db.update(panels).set({ imageUrl, prompt, status: 'done' }).where(eq(panels.id, panel.id))
      } catch (err) {
        console.error(`[generate] panel #${panel.index} failed:`, err)
        await db.update(panels).set({ status: 'failed' }).where(eq(panels.id, panel.id))
      }
    })

    // 异步执行，立即返回 202
    runWithConcurrency(tasks, CONCURRENCY).then(async () => {
      const allPanels = await db.select().from(panels).where(eq(panels.projectId, project.id))
      const allSettled = allPanels.every(p => p.status === 'done' || p.status === 'failed')
      if (allSettled) {
        const anyDone = allPanels.some(p => p.status === 'done')
        const nextStatus = anyDone ? 'reviewing' : 'failed'
        await db.update(projects).set({ status: nextStatus }).where(eq(projects.id, project.id))
      }
    }).catch(async () => {
      await db.update(projects).set({ status: 'failed' }).where(eq(projects.id, project.id))
    })

    return NextResponse.json({ message: 'Generation started' }, { status: 202 })
  } catch (e) {
    console.error('[generate] fatal error for token', token, e)
    await db.update(projects).set({ status: 'failed' }).where(eq(projects.token, token))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
