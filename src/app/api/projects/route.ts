import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, settings } from '@/lib/db/schema'
import { randomUUID } from 'crypto'
import { desc, eq } from 'drizzle-orm'
import type { ModelConfig } from '@/types'

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
