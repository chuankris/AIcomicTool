'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { PanelCard } from '@/components/project/PanelCard'
import type { ProjectWithDetails } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ProjectPage() {
  const { token } = useParams<{ token: string }>()
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

  function toggleSelect(id: number) {
    setSelectedPanels(prev => {
      if (id in prev) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: '' }
    })
  }

  function setFeedback(id: number, text: string) {
    setSelectedPanels(prev => ({ ...prev, [id]: text }))
  }

  async function submitReview() {
    const reviews = Object.entries(selectedPanels)
      .filter(([, feedback]) => feedback.trim())
      .map(([panelId, feedback]) => ({ panelId: parseInt(panelId), feedback }))
    if (!reviews.length) return

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch(`/api/projects/${token}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews }),
      })
      if (!res.ok) throw new Error('提交审核失败，请重试')
      setSelectedPanels({})
      setReviewMode(false)
      mutate()
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
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      加载中...
    </div>
  )

  const panels = project.panels ?? []
  const allSettled = panels.length > 0 && panels.every(p => p.status === 'done' || p.status === 'failed')
  const selectedIds = Object.keys(selectedPanels).map(Number)
  const hasFilledFeedback = Object.values(selectedPanels).some(f => f.trim())

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-purple-400">漫剧生成器</h1>
        <div className="flex items-center gap-3">
          {allSettled && !reviewMode && (
            <button onClick={() => setReviewMode(true)}
              className="px-4 py-2 border border-yellow-600 text-yellow-400 rounded-lg text-sm hover:bg-yellow-900/20">
              标记修改
            </button>
          )}
          {reviewMode && (
            <>
              <span className="text-sm text-gray-400">已选 {selectedIds.length} 格</span>
              <button onClick={() => { setReviewMode(false); setSelectedPanels({}) }}
                className="px-4 py-2 border border-gray-700 rounded-lg text-sm">取消</button>
              <button onClick={submitReview} disabled={isSubmitting || !hasFilledFeedback}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-lg text-sm">
                {isSubmitting ? '提交中...' : '提交审核'}
              </button>
            </>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            project.status === 'generating' ? 'bg-yellow-900/40 text-yellow-400' :
            project.status === 'reviewing' ? 'bg-blue-900/40 text-blue-400' :
            project.status === 'done' ? 'bg-green-900/40 text-green-400' :
            project.status === 'failed' ? 'bg-red-900/40 text-red-400' :
            'bg-gray-800 text-gray-400'
          }`}>
            {project.status === 'generating' ? '生成中' :
             project.status === 'reviewing' ? '待审核' :
             project.status === 'done' ? '完成' :
             project.status === 'failed' ? '生成失败' : project.status}
          </span>
          {project.panels && (
            <span className="text-sm text-gray-500">
              {project.panels.filter(p => p.status === 'done').length} / {project.panels.length} 格完成
            </span>
          )}
        </div>

        {submitError && <p className="text-red-400 text-sm mb-4">{submitError}</p>}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {project.panels?.map(panel => (
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
      </div>
    </div>
  )
}
