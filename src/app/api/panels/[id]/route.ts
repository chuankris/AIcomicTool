import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { panels } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  try {
    const body = await req.json()
    const { imageModel, reviewFeedback, prompt } = body as { imageModel?: string; reviewFeedback?: string; prompt?: string }
    const updates: Record<string, unknown> = {}
    if (imageModel !== undefined) updates.imageModel = imageModel
    if (reviewFeedback !== undefined) updates.reviewFeedback = reviewFeedback
    if (prompt !== undefined) updates.prompt = prompt
    if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    const updated = await db.update(panels).set(updates).where(eq(panels.id, numId)).returning()
    if (!updated.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(updated[0])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
