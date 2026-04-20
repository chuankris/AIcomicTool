'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { CharacterManager } from '@/components/project/CharacterManager'
import { ScriptEditor } from '@/components/project/ScriptEditor'
import { ConfigPanel } from '@/components/project/ConfigPanel'
import { PanelCard } from '@/components/project/PanelCard'
import type { ProjectWithDetails, Character } from '@/types'

type Tab = 'chars' | 'script' | 'config' | 'panels'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  draft:      { label: '草稿',   class: 'bg-gray-800 text-gray-400' },
  pending:    { label: '待生成', class: 'bg-gray-800 text-gray-400' },
  generating: { label: '⏳ 生成中', class: 'bg-yellow-900/40 text-yellow-400' },
  reviewing:  { label: '✅ 待审核', class: 'bg-blue-900/40 text-blue-400' },
  done:       { label: '🎉 完成', class: 'bg-green-900/40 text-green-400' },
  failed:     { label: '生成失败', class: 'bg-red-900/40 text-red-400' },
}

export default function ProjectPage() {
  const { token } = useParams<{ token: string }>()
  const [activeTab, setActiveTab] = useState<Tab>('chars')
  const [characters, setCharacters] = useState<Character[]>([])
  const [script, setScript] = useState('')
  const [style, setStyle] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const [selectedPanels, setSelectedPanels] = useState<Record<number, string>>({})
  const [reviewMode, setReviewMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { data: project, mutate, error: fetchError } = useSWR<ProjectWithDetails>(
    `/api/projects/${token}`,
    fetcher,
    {
      refreshInterval: (data) => {
        if (!data) return 3000
        const hasActive = data.panels?.some(p => p.status === 'generating' || p.status === 'pending')
        return hasActive ? 3000 : 0
      },
    }
  )

  useEffect(() => {
    if (project) {
      setCharacters(project.characters ?? [])
      setScript(project.script ?? '')
      setStyle(project.style ?? '日漫')
      if (project.status === 'generating' || project.status === 'reviewing' || project.status === 'done') {
        setActiveTab('panels')
      }
    }
  }, [project?.token])

  const canGenerate = script.trim().length > 0 && project?.status === 'draft'

  async function handleGenerate() {
    setIsGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch(`/api/projects/${token}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '生成失败')
      }
      setActiveTab('panels')
      mutate()
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : '启动生成失败')
    } finally {
      setIsGenerating(false)
    }
  }

  function toggleSelect(id: number) {
    setSelectedPanels(prev => {
      if (id in prev) { const next = { ...prev }; delete next[id]; return next }
      return { ...prev, [id]: '' }
    })
  }
  function setFeedback(id: number, text: string) {
    setSelectedPanels(prev => ({ ...prev, [id]: text }))
  }
  const hasFilledFeedback = Object.values(selectedPanels).some(f => f.trim())

  async function submitReview() {
    const reviews = Object.entries(selectedPanels)
      .filter(([, f]) => f.trim())
      .map(([panelId, feedback]) => ({ panelId: parseInt(panelId), feedback }))
    if (!reviews.length) return
    setIsSubmitting(true); setSubmitError(null)
    try {
      const res = await fetch(`/api/projects/${token}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews }),
      })
      if (!res.ok) throw new Error('提交审核失败，请重试')
      setSelectedPanels({}); setReviewMode(false); mutate()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '提交失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (fetchError) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <p className="text-red-400">加载失败，请刷新页面重试</p>
    </div>
  )
  if (!project) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">加载中...</div>
  )

  const statusInfo = STATUS_MAP[project.status] ?? { label: project.status, class: 'bg-gray-800 text-gray-400' }
  const panels = project.panels ?? []
  const allSettled = panels.length > 0 && panels.every(p => p.status === 'done' || p.status === 'failed')
  const selectedIds = Object.keys(selectedPanels).map(Number)

  const TABS: { id: Tab; label: string }[] = [
    { id: 'chars', label: '角色设定' },
    { id: 'script', label: '剧本' },
    { id: 'config', label: '配置' },
    { id: 'panels', label: `分镜${panels.length > 0 ? ` (${panels.length})` : ''}` },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← 项目列表</Link>
          <span className="text-gray-700">|</span>
          <span className="text-sm font-medium">{project.name ?? '未命名项目'}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.class}`}>{statusInfo.label}</span>
        </div>
        <div className="flex items-center gap-3">
          {generateError && <p className="text-red-400 text-xs">{generateError}</p>}
          {canGenerate && (
            <button onClick={handleGenerate} disabled={isGenerating}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-lg text-sm font-medium transition-colors">
              {isGenerating ? '启动中...' : '✨ 开始生成'}
            </button>
          )}
          {activeTab === 'panels' && allSettled && !reviewMode && (
            <button onClick={() => setReviewMode(true)}
              className="px-4 py-2 border border-yellow-600 text-yellow-400 rounded-lg text-sm hover:bg-yellow-900/20">
              标记修改
            </button>
          )}
          {activeTab === 'panels' && reviewMode && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">已选 {selectedIds.length} 格</span>
              <button onClick={() => { setReviewMode(false); setSelectedPanels({}) }}
                className="px-3 py-1.5 border border-gray-700 rounded-lg text-sm">取消</button>
              <button onClick={submitReview} disabled={isSubmitting || !hasFilledFeedback}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-lg text-sm">
                {isSubmitting ? '提交中...' : '提交审核'}
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex border-b border-gray-800 flex-shrink-0">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 text-sm transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-purple-400 border-purple-500 font-medium'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">

          {activeTab === 'chars' && (
            <CharacterManager
              token={token}
              characters={characters}
              onCharactersChange={setCharacters}
            />
          )}

          {activeTab === 'script' && (
            <ScriptEditor
              token={token}
              initialScript={script}
              onSave={setScript}
            />
          )}

          {activeTab === 'config' && (
            <ConfigPanel
              token={token}
              initialStyle={style}
              onStyleChange={setStyle}
            />
          )}

          {activeTab === 'panels' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                {panels.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {panels.filter(p => p.status === 'done').length} / {panels.length} 格完成
                  </span>
                )}
              </div>
              {submitError && <p className="text-red-400 text-sm mb-3">{submitError}</p>}
              {panels.length === 0 ? (
                <div className="text-center py-16 text-gray-600">
                  <div className="text-3xl mb-3">🎬</div>
                  <p className="text-sm">还没有分镜</p>
                  {project.status === 'draft' && (
                    <p className="text-xs mt-2">填写剧本后点击「开始生成」</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {panels.map(panel => (
                    <div key={panel.id}>
                      <PanelCard
                        panel={panel}
                        isSelected={panel.id in selectedPanels}
                        onToggleSelect={toggleSelect}
                        reviewMode={reviewMode}
                      />
                      {reviewMode && panel.id in selectedPanels && (
                        <textarea
                          placeholder="描述问题（如：头发颜色不对）"
                          value={selectedPanels[panel.id]}
                          onChange={e => setFeedback(panel.id, e.target.value)}
                          className="w-full mt-2 bg-gray-900 border border-red-700/50 rounded p-2 text-xs text-gray-200 resize-none h-16 focus:outline-none focus:border-red-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
