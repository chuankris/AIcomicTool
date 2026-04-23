export type StylePresetGroup = 'base' | 'genre' | 'mood'

export interface StylePreset {
  id: string
  label: string
  group: StylePresetGroup
  prompt: string
  negative?: string
  aliases?: string[]
}

export interface VisualStyleConfig {
  baseStyle?: string
  genreTags?: string[]
  moodTags?: string[]
  customPrompt?: string
  safetyLevel?: 'general' | 'mature-but-safe'
}

export type StyleInput = string | VisualStyleConfig

export const STYLE_PRESETS: StylePreset[] = [
  { id: 'manga_jp', label: '日漫', group: 'base', prompt: '日漫风格，清晰线稿，漫画分镜感，Manga 2.0 Pro风格', aliases: ['日本漫画'] },
  { id: 'manga_kr', label: '韩漫', group: 'base', prompt: '韩漫风格，精致线条，细腻上色', aliases: ['韩国漫画'] },
  { id: 'manga_us', label: '美漫', group: 'base', prompt: '美漫风格，粗犷线条，强对比阴影', aliases: ['欧美漫画'] },
  { id: 'chinese_ink', label: '国风', group: 'base', prompt: '国风水墨漫画，工笔风格，东方美学' },
  { id: 'painterly_comic', label: '厚涂漫画', group: 'base', prompt: '厚涂漫画风格，强体积感，丰富笔触' },
  { id: 'realistic_comic', label: '写实漫画', group: 'base', prompt: '写实漫画风格，真实比例，电影级光影' },
  { id: 'black_white_comic', label: '黑白漫画', group: 'base', prompt: '黑白漫画风格，高反差网点，清晰墨线' },
  { id: 'chibi_comic', label: 'Q版漫画', group: 'base', prompt: 'Q版漫画风格，可爱比例，柔和色彩' },

  { id: 'mecha_scifi', label: '机甲科幻', group: 'genre', prompt: '机甲科幻世界观，巨型机械装甲，金属结构，工业细节，高科技界面' },
  { id: 'wasteland', label: '末日废土', group: 'genre', prompt: '末日废土世界观，破败城市，沙尘天空，废弃车辆，锈蚀金属，荒凉压迫感' },
  { id: 'cyberpunk', label: '赛博朋克', group: 'genre', prompt: '赛博朋克都市，霓虹灯牌，雨夜街道，高楼阴影，义体科技，紫蓝粉高对比光影' },
  { id: 'seductive_fashion', label: '性感魅惑', group: 'genre', prompt: '成熟气质，修身时装，精致妆容，魅惑氛围，高级时尚感，非露骨表达', negative: '未成年人性感化，露骨色情，低俗姿势' },
  { id: 'folk_horror', label: '怪谈民俗', group: 'genre', prompt: '怪谈民俗氛围，旧街巷，纸符，冷雾，东方悬疑感' },
  { id: 'wuxia', label: '武侠江湖', group: 'genre', prompt: '武侠江湖世界观，古代建筑，衣袂翻飞，刀剑与风尘' },
  { id: 'campus_youth', label: '校园青春', group: 'genre', prompt: '校园青春题材，教室走廊，校服，干净日常光线，青春情绪' },

  { id: 'cinematic', label: '电影感', group: 'mood', prompt: '电影感构图，层次光影，画面张力强' },
  { id: 'oppressive', label: '压迫感', group: 'mood', prompt: '低角度压迫感，强对比阴影，紧张氛围' },
  { id: 'cool_tone', label: '冷色调', group: 'mood', prompt: '冷色调，蓝紫光影，克制情绪' },
  { id: 'premium', label: '高级感', group: 'mood', prompt: '高级感，干净画面，精致材质，克制构图' },
  { id: 'romantic', label: '浪漫', group: 'mood', prompt: '浪漫氛围，柔和光线，细腻情绪' },
  { id: 'hot_blooded', label: '热血', group: 'mood', prompt: '热血氛围，动态构图，强烈动作张力' },
  { id: 'gloomy', label: '阴郁', group: 'mood', prompt: '阴郁氛围，低饱和色彩，压低光线' },
]

export function getStylePreset(idOrLabel: string): StylePreset | undefined {
  const normalized = idOrLabel.trim()
  return STYLE_PRESETS.find(p =>
    p.id === normalized ||
    p.label === normalized ||
    p.aliases?.includes(normalized)
  )
}

export function composeVisualStylePrompt(config: VisualStyleConfig): string {
  const ids = [
    config.baseStyle,
    ...(config.genreTags ?? []),
    ...(config.moodTags ?? []),
  ].filter((v): v is string => Boolean(v?.trim()))

  const parts = ids.map(id => getStylePreset(id)?.prompt ?? id.trim())
  if (config.customPrompt?.trim()) parts.push(config.customPrompt.trim())
  if (config.safetyLevel === 'mature-but-safe') {
    parts.push('成熟表达，高级审美，非露骨，避免未成年人性感化')
  }

  return uniqueParts(parts).join('，')
}

export function resolveStylePrompt(style: StyleInput): string {
  if (typeof style !== 'string') return composeVisualStylePrompt(style)

  const trimmed = style.trim()
  if (!trimmed) return ''

  const direct = getStylePreset(trimmed)
  if (direct) return direct.prompt

  const tokens = trimmed
    .split(/[\/、,，|·]+/)
    .map(token => token.trim())
    .filter(Boolean)

  if (tokens.length > 1) {
    return uniqueParts(tokens.map(token => getStylePreset(token)?.prompt ?? token)).join('，')
  }

  return `${trimmed}风格`
}

function uniqueParts(parts: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const part of parts) {
    const value = part.trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    result.push(value)
  }
  return result
}
