import { asc, eq } from 'drizzle-orm'
import type { Shot } from '@/types'
import { db } from '@/lib/db'
import { shotCharacterNames, shotCharacterRefs, storyboardShots } from '@/lib/db/schema'
import { serializeShot } from '@/lib/db/serializers'

function toStrength(value?: number) {
  return value === undefined ? null : Math.round(value * 100)
}

export async function listProjectShots(project: { id: number }): Promise<Shot[]> {
  const shotRows = await db.select().from(storyboardShots)
    .where(eq(storyboardShots.projectId, project.id))
    .orderBy(asc(storyboardShots.index))

  const refs = await db.select().from(shotCharacterRefs)
    .where(eq(shotCharacterRefs.projectId, project.id))
  const names = await db.select().from(shotCharacterNames)
    .where(eq(shotCharacterNames.projectId, project.id))

  return shotRows.map(row => {
    const rowRefs = refs.filter(ref => ref.shotId === row.id)
    const rowNames = names
      .filter(name => name.shotId === row.id)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(item => item.name)
    return serializeShot(
      row,
      rowRefs,
      rowNames,
    )
  })
}

export async function replaceProjectShots(projectId: number, shots: Shot[]) {
  await db.delete(shotCharacterNames).where(eq(shotCharacterNames.projectId, projectId))
  await db.delete(shotCharacterRefs).where(eq(shotCharacterRefs.projectId, projectId))
  await db.delete(storyboardShots).where(eq(storyboardShots.projectId, projectId))

  for (const shot of shots) {
    const [created] = await db.insert(storyboardShots).values({
      projectId,
      index: shot.index,
      sceneDesc: shot.sceneDesc,
      dialogue: shot.dialogue,
      emotion: shot.emotion,
      composition: shot.composition,
      promptOverride: shot.promptOverride ?? null,
      durationSec: shot.durationSec ?? 3,
      subtitlePosition: shot.subtitlePosition ?? (shot.dialogue ? 'bottom' : 'none'),
      localFeedback: shot.localFeedback ?? '',
      aspectRatio: shot.aspectRatio ?? '9:16',
      resolutionWidth: shot.resolution?.width ?? null,
      resolutionHeight: shot.resolution?.height ?? null,
      safeAreaTop: shot.safeArea?.top ?? null,
      safeAreaBottom: shot.safeArea?.bottom ?? null,
      safeAreaLeft: shot.safeArea?.left ?? null,
      safeAreaRight: shot.safeArea?.right ?? null,
      keyProps: JSON.stringify(shot.keyProps ?? []),
      backgroundId: shot.backgroundRef?.backgroundId ?? null,
      backgroundStrength: toStrength(shot.backgroundRef?.strength),
    }).returning()

    if (shot.characterRefs?.length) {
      await db.insert(shotCharacterRefs).values(shot.characterRefs.map(ref => ({
        projectId,
        shotId: created.id,
        characterId: ref.characterId,
        strength: toStrength(ref.strength),
      })))
    }
    if (shot.characters.length) {
      await db.insert(shotCharacterNames).values(shot.characters.map((name, orderIndex) => ({
        projectId,
        shotId: created.id,
        name,
        orderIndex,
      })))
    }
  }
}

export async function findProjectShot(project: { id: number }, index: number) {
  return (await listProjectShots(project)).find(shot => shot.index === index) ?? null
}
