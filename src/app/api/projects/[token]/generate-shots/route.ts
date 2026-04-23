import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { characters, projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { callModel } from '@/lib/ai/model-client'
import { bindShotReferences } from '@/lib/ai/prompt-builder'
import { serializeCharacter } from '@/lib/db/serializers'
import { replaceProjectShots } from '@/lib/db/shots'
import type { Character, ModelConfig, Shot } from '@/types'

const SYSTEM_PROMPT = `你是漫画短视频分镜导演。将用户提供的剧本拆解为分镜列表。
每格分镜返回一个 JSON 对象，所有分镜组成一个 JSON 数组。

字段说明：
- index: 从 1 开始的序号
- sceneDesc: 场景描述，中文，包含地点、动作和视觉重点
- characters: 出场角色名数组，没有则为空数组
- dialogue: 台词，没有则为空字符串
- emotion: 主要情绪，如 平静、紧张、喜悦、悲伤、愤怒
- composition: 镜头构图，如 全景、中景、近景、特写、俯视、仰视
- durationSec: 预计时长，数字，通常 2-5 秒
- subtitlePosition: 字幕位置，只能是 bottom、middle-bottom 或 none
- keyProps: 当前分镜必须保持的关键道具数组
- localFeedback: 空字符串，供后续单格反馈使用
- aspectRatio: 默认 9:16
- safeArea: 字幕和短视频安全区，如 {"bottom":18}

只返回 JSON 数组，不要返回解释、markdown 或代码块。`

function normalizeShot(input: Partial<Shot>, index: number): Shot {
  return {
    index: Number(input.index ?? index + 1),
    sceneDesc: input.sceneDesc ?? '',
    characters: Array.isArray(input.characters) ? input.characters : [],
    dialogue: input.dialogue ?? '',
    emotion: input.emotion ?? '',
    composition: input.composition ?? '',
    durationSec: input.durationSec ?? 3,
    subtitlePosition: input.subtitlePosition ?? (input.dialogue ? 'bottom' : 'none'),
    keyProps: Array.isArray(input.keyProps) ? input.keyProps : [],
    localFeedback: input.localFeedback ?? '',
    aspectRatio: input.aspectRatio ?? '9:16',
    safeArea: input.safeArea ?? (input.dialogue ? { bottom: 18 } : undefined),
  }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params

    const [project] = await db.select().from(projects).where(eq(projects.token, token))
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    if (!project.script?.trim()) {
      return NextResponse.json({ error: '请先填写剧本' }, { status: 400 })
    }

    const modelConfig: ModelConfig = JSON.parse(project.modelConfig)
    const raw = await callModel(modelConfig, SYSTEM_PROMPT, project.script)
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI 返回格式错误，无法解析分镜' }, { status: 502 })
    }

    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) {
      return NextResponse.json({ error: 'AI 返回格式错误，分镜不是数组' }, { status: 502 })
    }

    const chars: Character[] = (await db.select().from(characters).where(eq(characters.projectId, project.id)))
      .map(serializeCharacter)
    const shots: Shot[] = parsed
      .map((item, index) => normalizeShot(item, index))
      .map(shot => bindShotReferences(chars, shot))

    await replaceProjectShots(project.id, shots)

    return NextResponse.json({ shots })
  } catch (e) {
    console.error('[projects/generate-shots]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
