import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

vi.stubEnv('JIMENG_ACCESS_KEY', 'test-ak')
vi.stubEnv('JIMENG_SECRET_KEY', 'test-sk')

describe('jimeng client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls API with correct method and returns imageUrl', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { image_urls: ['https://example.com/img.png'] } }),
    })

    const { generateImage } = await import('./client')
    const result = await generateImage({ prompt: '测试角色', style: '日漫' })

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('visual.volcengineapi.com')
    expect(options.method).toBe('POST')
    expect(result.imageUrl).toBe('https://example.com/img.png')
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 400, text: async () => 'bad request' })
    const { generateImage } = await import('./client')
    await expect(generateImage({ prompt: 'x', style: '日漫' })).rejects.toThrow('即梦 API error 400')
  })
})
