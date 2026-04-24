'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Stepper from '@/components/project/Stepper'
import StepFooter from '@/components/project/StepFooter'
import { CharacterManager } from '@/components/project/CharacterManager'
import { ScriptEditor } from '@/components/project/ScriptEditor'
import ShotPanelEditor from '@/components/project/ShotPanelEditor'
import type { Panel, Shot, ProjectWithDetails, Character } from '@/types'

const TOTAL_STEPS = 3

export default function ProjectPage() {
  const { token } = useParams<{ token: string }>()
  const [project, setProject] = useState<ProjectWithDetails | null>(null)
  const [step, setStep] = useState(0)
  const [furthest, setFurthest] = useState(0)
  const [shots, setShots] = useState<Shot[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [script, setScript] = useState('')

  useEffect(() => {
    fetch(`/api/projects/${token}`)
      .then(r => r.json())
      .then((data: ProjectWithDetails) => {
        setProject(data)
        setCharacters(data.characters ?? [])
        const s = Math.min(data.currentStep ?? 0, TOTAL_STEPS - 1)
        const f = Math.min(data.furthestStep ?? 0, TOTAL_STEPS - 1)
        setStep(s)
        setFurthest(f)
        setScript(data.script ?? '')
        setShots(data.shots ?? [])
        setLoading(false)
        if (data.status === 'generating') {
          setGenerating(true)
          startPolling()
        }
      })
      .catch(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

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

  function handlePanelUpdate(updated: Panel) {
    setProject(prev => prev ? {
      ...prev,
      panels: prev.panels.some(p => p.id === updated.id)
        ? prev.panels.map(p => p.id === updated.id ? updated : p)
        : [...prev.panels, updated].sort((a, b) => a.index - b.index),
    } : prev)
  }

  async function handlePanelRegenerate(id: number) {
    setProject(prev => prev ? {
      ...prev,
      panels: prev.panels.map(p => p.id === id ? { ...p, status: 'generating' as Panel['status'] } : p),
    } : prev)
    await fetch(`/api/panels/${id}/regenerate`, { method: 'POST' })
    const data: ProjectWithDetails = await fetch(`/api/projects/${token}`).then(r => r.json())
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
    draft: '草稿', generating: '生成中', reviewing: '待审核', done: '完成', failed: '失败',
  }
  const STATUS_CLASSES: Record<string, string> = {
    draft: 'bg-gray-800 text-gray-400',
    generating: 'bg-yellow-900/40 text-yellow-400',
    reviewing: 'bg-blue-900/40 text-blue-400',
    done: 'bg-green-900/40 text-green-400',
    failed: 'bg-red-900/40 text-red-400',
  }

  const panels = project.panels ?? []

  const nextDisabled: Record<number, boolean> = {
    0: false,
    1: false,
    2: false,
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 px-6 py-3 flex items-center gap-3 shrink-0">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">←</Link>
        <h1 className="text-sm font-medium text-gray-200">{project.name || '未命名项目'}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLASSES[project.status] ?? 'bg-gray-800 text-gray-400'}`}>
          {STATUS_LABELS[project.status] ?? project.status}
        </span>
      </header>

      <Stepper currentStep={step} furthestStep={furthest} onStepClick={goToStep} />

      <div className="flex-1 overflow-auto max-w-3xl w-full mx-auto px-6 py-6">
        {/* Step 0: 剧本 & 角色 */}
        {step === 0 && (
          <div className="space-y-6">
            <ScriptEditor
              token={token}
              initialScript={project.script}
              onSave={(s: string) => {
                setScript(s)
                setProject(prev => prev ? { ...prev, script: s } : prev)
              }}
            />
            <div className="border-t border-gray-800 pt-6">
              <h2 className="text-sm font-medium text-gray-300 mb-4">角色 & 背景场景</h2>
              <CharacterManager
                token={token}
                script={script}
                characters={characters}
                onCharactersChange={setCharacters}
              />
            </div>
          </div>
        )}

        {/* Step 1: 分镜 & 出图 */}
        {step === 1 && (
          <ShotPanelEditor
            projectToken={token}
            shots={shots}
            panels={panels}
            characters={characters}
            onShotsChange={setShots}
            onGenerate={startGeneration}
            onPanelUpdate={handlePanelUpdate}
            onPanelRegenerate={handlePanelRegenerate}
            generating={generating}
            projectStatus={project.status}
          />
        )}

        {/* Step 2: 导出 */}
        {step === 2 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="text-4xl">⏳</div>
            <p className="text-sm text-gray-400 font-medium">配音 & 导出</p>
            <p className="text-xs text-gray-600">该功能即将上线，敬请期待</p>
          </div>
        )}
      </div>

      <StepFooter
        step={step}
        totalSteps={TOTAL_STEPS}
        onPrev={() => goToStep(step - 1)}
        onNext={() => goToStep(step + 1)}
        nextDisabled={nextDisabled[step]}
      />
    </div>
  )
}
