// src/app/api/projects/[token]/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, characters, panels } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { parseScript } from '@/lib/ai/script-parser'
import {
  buildPanelPrompt,
  resolvePanelBackground,
  resolvePanelCharacters,
  resolvePanelReferenceImage,
} from '@/lib/ai/prompt-builder'
import { generateImage } from '@/lib/jimeng/client'
import { getJimengCredentials } from '@/lib/jimeng/credentials'
import { formatGenerationError } from '@/lib/errors'
import { serializeCharacter } from '@/lib/db/serializers'
import { listProjectShots } from '@/lib/db/shots'
import type { ModelConfig, Character, Shot } from '@/types'

const CONCURRENCY = 1

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

    const modelConfig: ModelConfig = JSON.parse(project.modelConfig)

    const creds = await getJimengCredentials()

    const chars: Character[] = (await db.select().from(characters).where(eq(characters.projectId, project.id)))
      .map(serializeCharacter)

    // 1. 解析剧本
    const shotList: Shot[] = await listProjectShots(project)

    const parsedPanels: Shot[] = shotList.length > 0
      ? shotList
      : (await parseScript(project.script, project.style, modelConfig)).map(p => ({
          index: p.index,
          sceneDesc: p.sceneDesc,
          characters: p.characters,
          dialogue: p.dialogue,
          emotion: p.emotion,
          composition: p.composition,
        }))

    const existingPanels = await db.select().from(panels).where(eq(panels.projectId, project.id))
    const existingIndexes = new Set(existingPanels.map(panel => panel.index))
    const missingPanels = parsedPanels.filter(panel => !existingIndexes.has(panel.index))

    if (missingPanels.length === 0) {
      return NextResponse.json({ message: 'All panels already exist' }, { status: 200 })
    }

    await db.update(projects).set({ status: 'generating' }).where(eq(projects.token, token))

    // 2. 写入 panels 表（状态 pending）
    const insertedPanels = await db.insert(panels).values(
      missingPanels.map(p => ({
        projectId: project.id,
        index: p.index,
        sceneDesc: p.sceneDesc,
        dialogue: p.dialogue,
        prompt: '',
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
        const panelChars = resolvePanelCharacters(chars, parsed ?? {})
        const panelBackground = resolvePanelBackground(chars, parsed ?? {})
        const systemPrompt = buildPanelPrompt({
          characters: panelChars,
          background: panelBackground,
          sceneDesc: panel.sceneDesc,
          emotion: parsed?.emotion ?? '',
          composition: parsed?.composition ?? '',
          style: project.style,
          shot: parsed,
        })
        const prompt = parsed?.promptOverride?.trim() || systemPrompt
        const reference = resolvePanelReferenceImage({
          characters: panelChars,
          background: panelBackground,
          shot: parsed,
        })
        const { imageUrl } = await generateImage({
          prompt,
          style: project.style,
          referenceImageUrl: reference.referenceImageUrl,
          referenceStrength: reference.referenceStrength,
          width: parsed?.resolution?.width,
          height: parsed?.resolution?.height,
          accessKeyId: creds.accessKeyId,
          secretAccessKey: creds.secretAccessKey,
        })
        await db.update(panels).set({ imageUrl, prompt, status: 'done' }).where(eq(panels.id, panel.id))
      } catch (err) {
        console.error(`[generate] panel #${panel.index} failed:`, err)
        await db.update(panels)
          .set({ status: 'failed', reviewFeedback: formatGenerationError(err) })
          .where(eq(panels.id, panel.id))
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
