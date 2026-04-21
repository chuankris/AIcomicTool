'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ModelSetting } from '@/types'

const PROVIDERS = [
  { id: 'claude', label: 'Claude', baseURL: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-6' },
  { id: 'openai', label: 'GPT-4o', baseURL: 'https://api.openai.com/v1', model: 'gpt-4o' },
  { id: 'gemini', label: 'Gemini', baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-1.5-pro' },
  { id: 'custom', label: '自定义', baseURL: '', model: '' },
] as const

const PROVIDER_LABELS: Record<string, string> = {
  claude: 'Claude', openai: 'OpenAI', gemini: 'Gemini', custom: '自定义',
}

const EMPTY_FORM = { name: '', provider: 'claude', baseURL: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-6', apiKey: '' }

interface JimengDisplay {
  accessKeyId: string
  secretAccessKeyMasked: string
}

export default function SettingsPage() {
  const [configs, setConfigs] = useState<ModelSetting[]>([])
  const [jimeng, setJimeng] = useState<JimengDisplay | null>(null)
  const [showAiForm, setShowAiForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null) // null = 新建，数字 = 编辑
  const [showJimengForm, setShowJimengForm] = useState(false)
  const [aiForm, setAiForm] = useState({ ...EMPTY_FORM })
  const [jimengForm, setJimengForm] = useState({ accessKeyId: '', secretAccessKey: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setConfigs).catch(() => {})
    fetch('/api/jimeng-config').then(r => r.json()).then(setJimeng).catch(() => {})
  }, [])

  function handleProviderChange(providerId: string) {
    const preset = PROVIDERS.find(p => p.id === providerId)
    if (!preset) return
    setAiForm(f => ({ ...f, provider: preset.id, baseURL: preset.baseURL, model: preset.model }))
  }

  function openNewForm() {
    setEditingId(null)
    setAiForm({ ...EMPTY_FORM })
    setError(null)
    setShowAiForm(true)
  }

  function openEditForm(c: ModelSetting) {
    setEditingId(c.id)
    setAiForm({ name: c.name, provider: c.provider, baseURL: c.baseURL, model: c.model, apiKey: c.apiKey })
    setError(null)
    setShowAiForm(true)
  }

  function closeAiForm() {
    setShowAiForm(false)
    setEditingId(null)
    setError(null)
  }

  async function saveAiConfig() {
    if (!aiForm.name.trim()) { setError('名称必填'); return }
    if (!aiForm.apiKey.trim()) { setError('API Key 必填'); return }
    setSaving(true); setError(null)
    try {
      if (editingId !== null) {
        // 编辑已有配置
        const res = await fetch(`/api/settings/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(aiForm),
        })
        if (!res.ok) throw new Error('保存失败')
        const updated = await res.json()
        setConfigs(prev => prev.map(c => c.id === editingId ? updated : c))
      } else {
        // 新建
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(aiForm),
        })
        if (!res.ok) throw new Error('保存失败')
        const newItem = await res.json()
        setConfigs(prev => [newItem, ...prev])
      }
      closeAiForm()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function deleteConfig(id: number) {
    if (!confirm('确认删除此配置？')) return
    await fetch(`/api/settings/${id}`, { method: 'DELETE' })
    setConfigs(prev => prev.filter(c => c.id !== id))
  }

  async function saveJimengConfig() {
    if (!jimengForm.accessKeyId.trim() || !jimengForm.secretAccessKey.trim()) {
      setError('两个字段均必填'); return
    }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/jimeng-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jimengForm),
      })
      if (!res.ok) throw new Error('保存失败')
      setJimeng({ accessKeyId: jimengForm.accessKeyId, secretAccessKeyMasked: jimengForm.secretAccessKey.slice(0, 4) + '****' })
      setShowJimengForm(false)
      setJimengForm({ accessKeyId: '', secretAccessKey: '' })
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-gray-400 hover:text-white text-sm">← 返回</Link>
        <h1 className="text-lg font-bold text-purple-400">配置管理</h1>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-10">
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* AI 模型配置 */}
        <section>
          <h2 className="text-base font-semibold mb-1">AI 模型配置</h2>
          <p className="text-xs text-gray-500 mb-4">用于角色润色、剧本解析等文本生成</p>

          <div className="space-y-2 mb-3">
            {configs.length === 0 && !showAiForm && (
              <p className="text-sm text-gray-500">暂无配置</p>
            )}
            {configs.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {PROVIDER_LABELS[c.provider] ?? c.provider} · {c.model} · {c.apiKey.slice(0, 6)}***
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditForm(c)}
                    className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded px-2 py-1">
                    编辑
                  </button>
                  <button onClick={() => deleteConfig(c.id)}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-900 rounded px-2 py-1">
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>

          {showAiForm ? (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
              <div className="text-sm font-medium text-gray-300 mb-1">
                {editingId !== null ? '编辑配置' : '添加配置'}
              </div>
              <div>
                <Label>配置名称</Label>
                <Input placeholder="如：我的 Claude Key" value={aiForm.name}
                  onChange={e => setAiForm(f => ({ ...f, name: e.target.value }))}
                  className="bg-gray-800 border-gray-700 mt-1" />
              </div>
              <div>
                <Label>模型</Label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {PROVIDERS.map(p => (
                    <button key={p.id} onClick={() => handleProviderChange(p.id)}
                      className={`py-1.5 rounded border text-xs transition-colors ${
                        aiForm.provider === p.id
                          ? 'border-purple-500 bg-purple-900/40 text-purple-300'
                          : 'border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              {(aiForm.provider === 'custom' || aiForm.provider === 'claude') && (
                <>
                  <div>
                    <Label>Base URL</Label>
                    <Input placeholder="https://api.deepseek.com/v1" value={aiForm.baseURL}
                      onChange={e => setAiForm(f => ({ ...f, baseURL: e.target.value }))}
                      className="bg-gray-800 border-gray-700 mt-1" />
                  </div>
                  <div>
                    <Label>Model Name</Label>
                    <Input placeholder="deepseek-chat" value={aiForm.model}
                      onChange={e => setAiForm(f => ({ ...f, model: e.target.value }))}
                      className="bg-gray-800 border-gray-700 mt-1" />
                  </div>
                </>
              )}
              {aiForm.provider !== 'custom' && aiForm.provider !== 'claude' && (
                <div>
                  <Label>Model Name</Label>
                  <Input value={aiForm.model}
                    onChange={e => setAiForm(f => ({ ...f, model: e.target.value }))}
                    className="bg-gray-800 border-gray-700 mt-1" />
                </div>
              )}
              <div>
                <Label>API Key</Label>
                <Input type="password" placeholder="sk-..." value={aiForm.apiKey}
                  onChange={e => setAiForm(f => ({ ...f, apiKey: e.target.value }))}
                  className="bg-gray-800 border-gray-700 mt-1" />
                <p className="text-xs text-gray-500 mt-1">明文存储在本地 SQLite，仅用于生成请求</p>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="border-gray-700 flex-1" onClick={closeAiForm}>取消</Button>
                <Button className="bg-purple-600 hover:bg-purple-700 flex-1" onClick={saveAiConfig} disabled={saving}>
                  {saving ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="border-gray-700 w-full" onClick={openNewForm}>
              ＋ 添加 AI 配置
            </Button>
          )}
        </section>

        {/* 即梦配置 */}
        <section>
          <h2 className="text-base font-semibold mb-1">即梦图像生成配置</h2>
          <p className="text-xs text-gray-500 mb-4">
            火山引擎访问凭证，用于生成漫画分镜和角色预览图。
            <a href="https://console.volcengine.com/iam/keymanage" target="_blank" rel="noopener noreferrer"
              className="text-purple-400 ml-1 hover:underline">
              去火山引擎控制台获取 →
            </a>
          </p>

          {jimeng && !showJimengForm ? (
            <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">已配置</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Access Key ID：{jimeng.accessKeyId.slice(0, 8)}***
                </div>
              </div>
              <button onClick={() => setShowJimengForm(true)}
                className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded px-2 py-1">
                修改
              </button>
            </div>
          ) : null}

          {(!jimeng || showJimengForm) && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
              <div>
                <Label>Access Key ID</Label>
                <Input placeholder="AKLTxxxxxxxxxxxxxxxx" value={jimengForm.accessKeyId}
                  onChange={e => setJimengForm(f => ({ ...f, accessKeyId: e.target.value }))}
                  className="bg-gray-800 border-gray-700 mt-1" />
              </div>
              <div>
                <Label>Secret Access Key</Label>
                <Input type="password" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={jimengForm.secretAccessKey}
                  onChange={e => setJimengForm(f => ({ ...f, secretAccessKey: e.target.value }))}
                  className="bg-gray-800 border-gray-700 mt-1" />
              </div>
              <div className="flex gap-2 pt-1">
                {showJimengForm && (
                  <Button variant="outline" className="border-gray-700 flex-1" onClick={() => { setShowJimengForm(false); setError(null) }}>取消</Button>
                )}
                <Button className="bg-purple-600 hover:bg-purple-700 flex-1" onClick={saveJimengConfig} disabled={saving}>
                  {saving ? '保存中...' : '保存凭证'}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
