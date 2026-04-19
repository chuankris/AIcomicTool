import crypto from 'crypto'

interface SignParams {
  method: string
  uri: string
  body: string
  accessKey: string
  secretKey: string
  service: string
  region: string
}

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest()
}

function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

export function buildSignedHeaders(params: SignParams): Record<string, string> {
  const { method, uri, body, accessKey, secretKey, service, region } = params
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const datetime = now.toISOString().replace(/[:-]/g, '').slice(0, 15) + 'Z'

  const host = 'visual.volcengineapi.com'
  const contentType = 'application/json'
  const bodyHash = sha256Hex(body)

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-date:${datetime}\n`
  const signedHeaders = 'content-type;host;x-date'
  const canonicalRequest = [method, uri, '', canonicalHeaders, signedHeaders, bodyHash].join('\n')

  const credentialScope = `${date}/${region}/${service}/request`
  const stringToSign = ['HMAC-SHA256', datetime, credentialScope, sha256Hex(canonicalRequest)].join('\n')

  const signingKey = hmac(hmac(hmac(hmac(`volc${secretKey}`, date), region), service), 'request')
  const signature = hmac(signingKey, stringToSign).toString('hex')

  const authorization = `HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  return {
    'Content-Type': contentType,
    'Host': host,
    'X-Date': datetime,
    'Authorization': authorization,
  }
}
