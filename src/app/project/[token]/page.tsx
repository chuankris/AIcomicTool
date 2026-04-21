'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Stepper from '@/components/project/Stepper'
import StepFooter from '@/components/project/StepFooter'
import { CharacterManager } from '@/components/project/CharacterManager'
import { ScriptEditor } from '@/components/project/ScriptEditor'
import ShotListEditor from '@/components/project/ShotListEditor'
import { PanelCard } from '@/components/project/PanelCard'
import type { Panel, Shot, ImageModel, ProjectWithDetails, Character } from '@/types'

export default function ProjectPage() {
  const { token } = useParams<{ token: string }>()
  const [project, setProject] = useState<ProjectWithDetails | null>(null)
  const [step, setStep] = useState(0)
  const [furthest, setFurthest] = useState(0)
  const [shots, setShots] = useState<Shot[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [reviewMode, setReviewMode] = useState(false)
  const [selectedPanels, setSelectedPanels] = useState<Set<number>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/projects/${token}`)
      .then(r => r.json())
      .then((data: ProjectWithDetails) => {
        setProject(data)
        setCharacters(data.characters ?? [])
        setStep(data.currentStep ?? 0)
        setFurthest(data.furthestStep ?? 0)
        setShots(data.shots ? (() => { try { return JSON.parse(data.shots) } catch { return [] } })() : [])
        setLoading(false)
        if (data.status === 'generating') startPolling()
      })
      .catch(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Poll panels during generation
  let pollInterval: ReturnType<typeof setInterval> | null = null
  function startPolling() {
    if (pollInterval) return
    pollInterval = setInterval(() => {
      fetch(`/api/projects/${token}`)
        .then(r => r.json())
        .then((data: ProjectWithDetails) => {
          setProject(data)
          if (data.status !== 'generating') {
            clearInterval(pollInterval!)
            pollInterval = null
            setGenerating(false)
          }
        })
        .catch(() => {})
    }, 2000)
  }

  function goToStep(n: number) {
    const newFurthest = Math.max(furthest, n)
    setStep(n)
    setFurthest(newFurthest)
    fetch(`/api/projects/${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentStep: n, furthestStep: newFurthest }),
    })
  }

  async function startGeneration() {
    if (!project) return
    setGenerating(true)
    try {
      await fetch(`/api/projects/${token}/generate`, { method: 'POST' })
      startPolling()
    } catch {
      setGenerating(false)
    }
  }

  function togglePanelSelect(id: number) {
    setSelectedPanels(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function batchRegenerate() {
    const ids = Array.from(selectedPanels)
    for (const id of ids) {
      await fetch(`/api/panels/${id}/regenerate`, { method: 'POST' })
    }
    setSelectedPanels(new Set())
    setReviewMode(false)
    fetch(`/api/projects/${token}`).then(r => r.json()).then(setProject)
  }

  async function handlePanelModelChange(id: number, model: ImageModel) {
    await fetch(`/api/panels/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageModel: model }),
    })
    setProject(prev => prev ? {
      ...prev,
      panels: prev.panels.map(p => p.id === id ? { ...p, imageModel: model } : p)
    } : prev)
  }

  async function handlePanelRegenerate(id: number) {
    setProject(prev => prev ? {
      ...prev,
      panels: prev.panels.map(p => p.id === id ? { ...p, status: 'generating' as Panel['status'] } : p)
    } : prev)
    await fetch(`/api/panels/${id}/regenerate`, { method: 'POST' })
    const data = await fetch(`/api/projects/${token}`).then(r => r.json())
    setProject(data)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="mb-4">项目不存在</p>
          <Link href="/" className="text-violet-400 hover:underline">← 返回首页</Link>
        </div>
      </div>
    )
  }

  const STATUS_LABELS: Record<string, string> = {
    draft: '草稿', generating: '生成中', reviewing: '待审核', done: '完成', failed: '失败'
  }
  const STATUS_CLASSES: Record<string, string> = {
    draft: 'bg-gray-800 text-gray-400',
    generating: 'bg-yellow-900/40 text-yellow-400',
    reviewing: 'bg-blue-900/40 text-blue-400',
    done: 'bg-green-900/40 text-green-400',
    failed: 'bg-red-900/40 text-red-400',
  }

  const panels = project.panels ?? []
  const doneCount = panels.filter(p => p.status === 'done').length

  const nextDisabled: Record<number, boolean> = {
    0: false,
    1: false,
    2: shots.length === 0,
    3: false,
    4: false,
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">←</Link>
          <h1 className="text-sm font-medium text-gray-200">{project.name || '未命名项目'}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLASSES[project.status] ?? 'bg-gray-800 text-gray-400'}`}>
            {STATUS_LABELS[project.status] ?? project.status}
          </span>
        </div>
        {step === 3 && (
          <div className="flex items-center gap-2">
            {reviewMode ? (
              <>
                <span className="text-xs text-gray-500">{selectedPanels.size} 格已选</span>
                <button
                  onClick={batchRegenerate}
                  disabled={selectedPanels.size === 0}
                  className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-700 disabled:opacity-40 rounded-lg transition-colors"
                >
                  批量重生成
                </button>
                <button
                  onClick={() => { setReviewMode(false); setSelectedPanels(new Set()) }}
                  className="px-3 py-1.5 text-xs border border-gray-700 hover:border-gray-500 rounded-lg transition-colors text-gray-400"
                >
                  取消
                </button>
              </>
            ) : (
              <>
                {project.status === 'draft' && (
                  <button
                    onClick={startGeneration}
                    disabled={generating || panels.length > 0}
                    className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-700 disabled:opacity-40 rounded-lg font-medium transition-colors"
                  >
                    {generating ? '生成中...' : '✨ 开始生成'}
                  </button>
                )}
                {panels.length > 0 && (
                  <button
                    onClick={() => setReviewMode(true)}
                    className="px-3 py-1.5 text-xs border border-gray-700 hover:border-gray-500 rounded-lg transition-colors text-gray-400"
                  >
                    标记修改
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </header>

      {/* Stepper */}
      <Stepper currentStep={step} furthestStep={furthest} onStepClick={goToStep} />

      {/* Main content */}
      <div className="flex-1 overflow-auto max-w-3xl w-full mx-auto px-6 py-6">
        {step === 0 && (
          <ScriptEditor
            token={token}
            initialScript={project.script}
            onSave={(s: string) => setProject(prev => prev ? { ...prev, script: s } : prev)}
          />
        )}
        {step === 1 && (
          <CharacterManager
            token={token}
            characters={characters}
            onCharactersChange={setCharacters}
          />
        )}
        {step === 2 && (
          <ShotListEditor
            projectToken={token}
            initialShots={shots}
            onShotsChange={setShots}
          />
        )}
        {step === 3 && (
          <div>
            {panels.length === 0 && !generating ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="text-4xl">🎬</div>
                <p className="text-sm text-gray-500">点击右上角「✨ 开始生成」生成分镜图像</p>
              </div>
            ) : (
              <>
                {panels.length > 0 && (
                  <p className="text-xs text-gray-500 mb-4">{doneCount} / {panels.length} 格完成</p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {panels.map(panel => (
                    <PanelCard
                      key={panel.id}
                      panel={panel}
                      reviewMode={reviewMode}
                      isSelected={selectedPanels.has(panel.id)}
                      onToggleSelect={togglePanelSelect}
                      onRegenerate={handlePanelRegenerate}
                      onModelChange={handlePanelModelChange}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {step === 4 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="text-4xl">⏳</div>
            <p className="text-sm text-gray-400 font-medium">配音 & 导出</p>
            <p className="text-xs text-gray-600">该功能即将上线，敬请期待</p>
          </div>
        )}
      </div>

      {/* Step footer */}
      <StepFooter
        step={step}
        totalSteps={5}
        onPrev={() => goToStep(step - 1)}
        onNext={() => goToStep(step + 1)}
        nextDisabled={nextDisabled[step]}
        hint={step === 2 && shots.length === 0 ? '请先生成分镜脚本' : undefined}
      />
    </div>
  )
}
