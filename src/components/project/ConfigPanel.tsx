'use client'
import { useState, useEffect } from 'react'
import type { ModelSetting } from '@/types'

const STYLES = ['日漫', '韩漫', '美漫', '国风']

const PROVIDER_LABELS: Record<string, string> = {
  claude: 'Claude', openai: 'OpenAI', gemini: 'Gemini', custom: '自定义',
}

interface Props {
  token: string
  initialStyle: string
  onStyleChange: (style: string) => void
}

export function ConfigPanel({ token, initialStyle, onStyleChange }: Props) {
  const [style, setStyle] = useState(initialStyle)
  const [configs, setConfigs] = useState<ModelSetting[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setConfigs).catch(() => {})
  }, [])

  async function handleSave() {
    setIsSaving(true); setError(null)
    try {
      const res = await fetch(`/api/projects/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style }),
      })
      if (!res.ok) throw new Error('保存失败')
      onStyleChange(style)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div>
        <h2 className="text-sm font-semibold mb-1">漫画风格</h2>
        <p className="text-xs text-gray-500 mb-3">决定生成图片的整体美术风格</p>
        <div className="grid grid-cols-4 gap-3">
          {STYLES.map(s => (
            <button key={s} onClick={() => { setStyle(s); setSaved(false) }}
              className={`py-3 rounded-lg border text-sm font-medium transition-colors ${
                style === s
                  ? 'border-purple-500 bg-purple-900/40 text-purple-300'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-1">AI 模型配置</h2>
        <p className="text-xs text-gray-500 mb-3">
          创建项目时已选定。需要更换请到
          <a href="/settings" className="text-purple-400 hover:underline ml-1">设置页</a>
          添加新配置后重新创建项目。
        </p>
        {configs.length > 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
            <div className="text-xs text-gray-500">当前已配置的 AI 模型</div>
            <div className="mt-2 space-y-1">
              {configs.map(c => (
                <div key={c.id} className="text-xs text-gray-300">
                  {PROVIDER_LABELS[c.provider] ?? c.provider} · {c.name}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 border border-orange-900/50 rounded-lg px-4 py-3">
            <p className="text-xs text-orange-300">
              未检测到 AI 配置，请先
              <a href="/settings" className="underline ml-1">去设置页配置</a>
            </p>
          </div>
        )}
      </div>

      <button onClick={handleSave} disabled={isSaving}
        className="px-6 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg text-white disabled:opacity-40">
        {isSaving ? '保存中...' : saved ? '✓ 已保存' : '保存配置'}
      </button>
    </div>
  )
}
