// Note: API params below need verification against actual 即梦 docs
// Docs: https://www.volcengine.com/docs/85273/overview
import { buildSignedHeaders } from './sign'

const BASE_URL = 'https://visual.volcengineapi.com'
const SERVICE = 'cv'
const REGION = 'cn-north-1'

export interface GenerateImageParams {
  prompt: string
  style: string
  referenceImageUrl?: string
  referenceStrength?: number
  width?: number
  height?: number
}

export interface GenerateImageResult {
  imageUrl: string
}

export async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  const ACCESS_KEY = process.env.JIMENG_ACCESS_KEY!
  const SECRET_KEY = process.env.JIMENG_SECRET_KEY!

  const { prompt, style, referenceImageUrl, referenceStrength = 0.7, width = 720, height = 1280 } = params

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
    accessKey: ACCESS_KEY,
    secretKey: SECRET_KEY,
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
