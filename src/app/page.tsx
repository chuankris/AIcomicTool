'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ProjectSummary {
  id: number
  token: string
  name: string | null
  style: string
  status: string
  createdAt: number
}

interface ModelSetting {
  id: number
  name: string
  provider: string
}

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  draft:      { label: '草稿',   class: 'bg-gray-800 text-gray-400' },
  pending:    { label: '待生成', class: 'bg-gray-800 text-gray-400' },
  generating: { label: '生成中', class: 'bg-yellow-900/40 text-yellow-400' },
  reviewing:  { label: '待审核', class: 'bg-blue-900/40 text-blue-400' },
  done:       { label: '完成',   class: 'bg-green-900/40 text-green-400' },
  failed:     { label: '失败',   class: 'bg-red-900/40 text-red-400' },
}

const STYLES = ['日漫', '韩漫', '美漫', '国风']

export default function HomePage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [settings, setSettings] = useState<ModelSetting[]>([])

  // 新建 modal
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', style: '日漫', settingId: 0 })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 重命名 modal
  const [renameTarget, setRenameTarget] = useState<ProjectSummary | null>(null)
  const [renameName, setRenameName] = useState('')
  const [renameStyle, setRenameStyle] = useState('日漫')
  const [renaming, setRenaming] = useState(false)

  useEffect(() => {
    loadProjects()
    fetch('/api/settings').then(r => r.json()).then(rows => {
      if (Array.isArray(rows)) {
        setSettings(rows)
        if (rows.length > 0) setForm(f => ({ ...f, settingId: rows[0].id }))
      }
    }).catch(() => {})
  }, [])

  function loadProjects() {
    fetch('/api/projects').then(r => r.json()).then(rows => {
      if (Array.isArray(rows)) setProjects(rows)
    }).catch(() => {})
  }

  async function createProject() {
    if (!form.settingId) { setError('请先在设置页添加 AI 配置'); return }
    setCreating(true); setError(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name || undefined, style: form.style, settingId: form.settingId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '创建失败')
      }
      const { token } = await res.json()
      router.push(`/project/${token}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败')
      setCreating(false)
    }
  }

  async function deleteProject(e: React.MouseEvent, token: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('确认删除该项目？项目下的角色和分镜也会一并删除。')) return
    await fetch(`/api/projects/${token}`, { method: 'DELETE' })
    setProjects(prev => prev.filter(p => p.token !== token))
  }

  function openRename(e: React.MouseEvent, p: ProjectSummary) {
    e.preventDefault()
    e.stopPropagation()
    setRenameTarget(p)
    setRenameName(p.name ?? '')
    setRenameStyle(p.style)
  }

  async function saveRename() {
    if (!renameTarget) return
    setRenaming(true)
    try {
      await fetch(`/api/projects/${renameTarget.token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameName || null, style: renameStyle }),
      })
      setProjects(prev => prev.map(p =>
        p.token === renameTarget.token
          ? { ...p, name: renameName || null, style: renameStyle }
          : p
      ))
      setRenameTarget(null)
    } finally {
      setRenaming(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-purple-400">漫剧生成器</h1>
        <Link href="/settings" className="text-sm text-gray-400 hover:text-gray-200">⚙️ 配置管理</Link>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold">我的项目</h2>
            <p className="text-xs text-gray-500 mt-0.5">每个项目包含角色、剧本和生成的分镜</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors">
            ＋ 新建项目
          </button>
        </div>

        {settings.length === 0 && (
          <div className="bg-orange-900/20 border border-orange-900/40 rounded-lg px-4 py-3 mb-4">
            <p className="text-sm text-orange-300">
              还没有 AI 配置，
              <Link href="/settings" className="underline ml-1">去设置页添加</Link>
              后才能新建项目。
            </p>
          </div>
        )}

        <div className="space-y-2">
          {projects.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <div className="text-4xl mb-3">✏️</div>
              <p className="text-sm">还没有项目，新建一个开始创作</p>
            </div>
          ) : (
            projects.map(p => {
              const s = STATUS_MAP[p.status] ?? { label: p.status, class: 'bg-gray-800 text-gray-400' }
              return (
                <div key={p.token} className="relative group">
                  <Link href={`/project/${p.token}`}
                    className="flex items-center justify-between bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-lg px-4 py-3 transition-colors pr-24">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{p.name || '未命名项目'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${s.class}`}>{s.label}</span>
                      </div>
                      <div className="text-xs text-gray-500">{p.style} · {new Date(p.createdAt).toLocaleDateString('zh-CN')}</div>
                    </div>
                  </Link>
                  {/* 操作按钮 */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => openRename(e, p)}
                      className="px-2 py-1 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded bg-gray-900">
                      修改
                    </button>
                    <button onClick={e => deleteProject(e, p.token)}
                      className="px-2 py-1 text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 rounded bg-gray-900">
                      删除
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 新建项目 Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setError(null) } }}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-[420px] max-w-[90vw]">
            <h3 className="text-base font-semibold mb-4">新建项目</h3>
            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">项目名称（可选）</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="如：校园青春短剧"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">漫画风格</label>
                <div className="grid grid-cols-4 gap-2">
                  {STYLES.map(s => (
                    <button key={s} onClick={() => setForm(f => ({ ...f, style: s }))}
                      className={`py-2 rounded-lg border text-sm transition-colors ${
                        form.style === s
                          ? 'border-purple-500 bg-purple-900/40 text-purple-300'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">AI 配置</label>
                {settings.length === 0 ? (
                  <p className="text-xs text-orange-300">
                    请先<Link href="/settings" className="underline mx-1">去设置页</Link>添加 AI 配置
                  </p>
                ) : (
                  <select value={form.settingId}
                    onChange={e => setForm(f => ({ ...f, settingId: parseInt(e.target.value) }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500">
                    {settings.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setShowModal(false); setError(null) }}
                  className="flex-1 py-2 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-gray-200">
                  取消
                </button>
                <button onClick={createProject} disabled={creating || !form.settingId}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-lg text-sm text-white font-medium">
                  {creating ? '创建中...' : '创建项目'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 修改项目 Modal */}
      {renameTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={e => { if (e.target === e.currentTarget) setRenameTarget(null) }}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-[380px] max-w-[90vw]">
            <h3 className="text-base font-semibold mb-4">修改项目</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">项目名称</label>
                <input value={renameName} onChange={e => setRenameName(e.target.value)}
                  placeholder="未命名项目"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">漫画风格</label>
                <div className="grid grid-cols-4 gap-2">
                  {STYLES.map(s => (
                    <button key={s} onClick={() => setRenameStyle(s)}
                      className={`py-2 rounded-lg border text-sm transition-colors ${
                        renameStyle === s
                          ? 'border-purple-500 bg-purple-900/40 text-purple-300'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setRenameTarget(null)}
                  className="flex-1 py-2 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-gray-200">
                  取消
                </button>
                <button onClick={saveRename} disabled={renaming}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-lg text-sm text-white font-medium">
                  {renaming ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
