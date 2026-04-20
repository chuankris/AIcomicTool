import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { randomUUID } from 'crypto'
import type { ModelConfig } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { script, style, modelConfig } = body as {
      script: string
      style: string
      modelConfig: ModelConfig
    }

    if (!script?.trim()) return NextResponse.json({ error: 'script is required' }, { status: 400 })
    if (!style?.trim()) return NextResponse.json({ error: 'style is required' }, { status: 400 })
    if (!modelConfig?.apiKey) return NextResponse.json({ error: 'modelConfig.apiKey is required' }, { status: 400 })

    const token = randomUUID()
    const [project] = await db.insert(projects).values({
      token,
      script: script.trim(),
      style,
      modelConfig: JSON.stringify(modelConfig),
      status: 'pending',
      createdAt: Date.now(),
    }).returning()

    return NextResponse.json({ token: project.token, id: project.id }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
