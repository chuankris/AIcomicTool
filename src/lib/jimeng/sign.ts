import crypto from 'crypto'

interface SignParams {
  method: string
  uri: string
  query?: string  // e.g. "Action=CVProcess&Version=2022-08-31"
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
  const { method, uri, query = '', body, accessKey, secretKey, service, region } = params
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const datetime = now.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[:-]/g, '')

  const host = 'visual.volcengineapi.com'
  const bodyHash = sha256Hex(body)

  // Per official SDK: content-type is NOT signed; sign host, x-content-sha256, x-date
  const canonicalHeaders = `host:${host}\nx-content-sha256:${bodyHash}\nx-date:${datetime}\n`
  const signedHeaders = 'host;x-content-sha256;x-date'
  const canonicalRequest = [method, uri, query, canonicalHeaders, signedHeaders, bodyHash].join('\n')

  const credentialScope = `${date}/${region}/${service}/request`
  const stringToSign = ['HMAC-SHA256', datetime, credentialScope, sha256Hex(canonicalRequest)].join('\n')

  // Per official SDK: no "volc" prefix, kDatePrefix = ""
  const signingKey = hmac(hmac(hmac(hmac(secretKey, date), region), service), 'request')
  const signature = hmac(signingKey, stringToSign).toString('hex')

  const authorization = `HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  return {
    'Content-Type': 'application/json',
    'Host': host,
    'X-Date': datetime,
    'X-Content-Sha256': bodyHash,
    'Authorization': authorization,
  }
}
