import { db } from '@/lib/db'
import { jimengConfig } from '@/lib/db/schema'

export async function getJimengCredentials(): Promise<{ accessKeyId: string; secretAccessKey: string }> {
  const [config] = await db.select().from(jimengConfig)
  if (!config) throw new Error('即梦凭证未配置，请先在设置页配置 Access Key')
  return { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
}
