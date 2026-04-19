import { describe, it, expect } from 'vitest'
import { buildSignedHeaders } from './sign'

describe('buildSignedHeaders', () => {
  it('returns required header fields', () => {
    const headers = buildSignedHeaders({
      method: 'POST',
      uri: '/v1/test',
      body: '{}',
      accessKey: 'test-ak',
      secretKey: 'test-sk',
      service: 'cv',
      region: 'cn-north-1',
    })
    expect(headers).toHaveProperty('Authorization')
    expect(headers).toHaveProperty('X-Date')
    expect(headers['Authorization']).toMatch(/^HMAC-SHA256 Credential=test-ak\//)
    expect(headers['Content-Type']).toBe('application/json')
  })
})
