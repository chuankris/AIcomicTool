'use client'
import { useState, useCallback } from 'react'
import { Lightbox } from '@/components/ui/Lightbox'
import type { Shot, Panel, Character, ImageModel } from '@/types'

interface Props {
  projectToken: string
  shots: Shot[]
  panels: Panel[]
  characters: Character[]
  onShotsChange: (shots: Shot[]) => void
  onGenerate: () => void
  onPanelUpdate: (panel: Panel) => void
  onPanelRegenerate: (id: number) => void
  generating: boolean
  projectStatus: string
}

interface ShotRowProps {
  shot: Shot
  panel: Panel | null
  onShotChange: (updated: Shot) => void
  onPanelUpdate: (panel: Panel) => void
  onRegenerate: (id: number) => void
  isGenerating: boolean
}

function ShotRow({ shot, panel, onShotChange, onPanelUpdate, onRegenerate, isGenerating }: ShotRowProps) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [promptDraft, setPromptDraft] = useState(panel?.prompt ?? '')
  const [promptSaved, setPromptSaved] = useState(false)
  const [refining, setRefining] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [editingScene, setEditingScene] = useState(false)
  const [sceneDraft, setSceneDraft] = useState(shot.sceneDesc)

  const currentPrompt = panel?.prompt ?? ''

  async function savePrompt() {
    if (!panel) return
    await fetch(`/api/panels/${panel.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: promptDraft }),
    })
    onPanelUpdate({ ...panel, prompt: promptDraft })
    setPromptSaved(true)
    setTimeout(() => setPromptSaved(false), 2000)
  }

  function restorePrompt() {
    setPromptDraft(currentPrompt)
  }

  async function refinePrompt() {
    if (!panel) return
    setRefining(true)
    try {
      const res = await fetch(`/api/panels/${panel.id}/refine-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: feedback || undefined }),
      })
      if (!res.ok) throw new Error('润色失败')
      const data = await res.json()
      setPromptDraft(data.prompt)
      setFeedback('')
      setShowFeedback(false)
    } catch {
    } finally {
      setRefining(false)
    }
  }

  const panelStatus = isGenerating && !panel ? 'waiting' : (panel?.status ?? 'none')

  return (
    <div className="flex gap-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
      {/* Image area */}
      <div className="flex-shrink-0 w-24">
        <div className="aspect-[9/16] rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center">
          {panelStatus === 'generating' || panelStatus === 'waiting' ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-yellow-500 text-xs">生成中</span>
            </div>
          ) : panel?.status === 'done' && panel.imageUrl ? (
            <Lightbox src={panel.imageUrl} alt={`分镜 ${shot.index}`} className="w-full h-full object-cover" />
          ) : panel?.status === 'failed' ? (
            <span className="text-red-500 text-xs text-center px-1">生成失败</span>
          ) : (
            <span className="text-gray-600 text-xs">待生成</span>
          )}
        </div>
        <div className="text-center text-xs text-gray-600 mt-1">#{shot.index}</div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Scene desc */}
        {editingScene ? (
          <div className="space-y-1">
            <textarea
              value={sceneDraft}
              onChange={e => setSceneDraft(e.target.value)}
              rows={2}
              className="w-full bg-gray-800 border border-purple-600 rounded-lg p-2 text-sm text-gray-200 resize-none focus:outline-none"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setEditingScene(false); setSceneDraft(shot.sceneDesc) }}
                className="text-xs text-gray-500 hover:text-gray-300"
              >取消</button>
              <button
                onClick={() => {
                  onShotChange({ ...shot, sceneDesc: sceneDraft })
                  setEditingScene(false)
                }}
                className="text-xs text-violet-400 hover:text-violet-300"
              >保存</button>
            </div>
          </div>
        ) : (
          <p
            className="text-sm text-gray-200 leading-relaxed cursor-text hover:text-white"
            onClick={() => setEditingScene(true)}
            title="点击编辑场景描述"
          >
            {shot.sceneDesc}
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {shot.characters.length > 0 && shot.characters.map(c => (
            <span key={c} className="px-2 py-0.5 bg-purple-900/40 text-purple-300 rounded-full">{c}</span>
          ))}
          {shot.emotion && (
            <span className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full">{shot.emotion}</span>
          )}
          {shot.composition && (
            <span className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full">{shot.composition}</span>
          )}
          {shot.dialogue && (
            <span className="px-2 py-0.5 bg-gray-800 text-gray-500 rounded-full italic max-w-[180px] truncate">
              "{shot.dialogue}"
            </span>
          )}
        </div>

        {/* Prompt section */}
        {panel && (
          <div className="border-t border-gray-800 pt-2 space-y-2">
            <button
              onClick={() => {
                if (!showPrompt) setPromptDraft(panel.prompt)
                setShowPrompt(p => !p)
              }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <span>即梦生成词</span>
              <span>{showPrompt ? '▲' : '▾'}</span>
            </button>

            {showPrompt && (
              <div className="space-y-2">
                <textarea
                  value={promptDraft}
                  onChange={e => setPromptDraft(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 focus:border-purple-600 rounded-lg p-2 text-xs text-purple-200 leading-relaxed resize-none focus:outline-none font-mono"
                />

                {showFeedback && (
                  <div className="space-y-1">
                    <textarea
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                      placeholder="告诉 AI 需要调整什么方向，如：更暗调，强调角色孤独感"
                      rows={2}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-gray-300 resize-none focus:outline-none focus:border-purple-600"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={refinePrompt}
                    disabled={refining}
                    className="px-2.5 py-1 text-xs bg-purple-700 hover:bg-purple-600 disabled:opacity-50 rounded-lg text-white transition-colors"
                  >
                    {refining ? 'AI 润色中...' : '✨ AI 润色'}
                  </button>
                  {!showFeedback && (
                    <button
                      onClick={() => setShowFeedback(true)}
                      className="px-2.5 py-1 text-xs border border-gray-700 hover:border-gray-500 rounded-lg text-gray-400 transition-colors"
                    >
                      加要求
                    </button>
                  )}
                  {showFeedback && (
                    <button
                      onClick={() => { setShowFeedback(false); setFeedback('') }}
                      className="px-2.5 py-1 text-xs border border-gray-700 hover:border-gray-500 rounded-lg text-gray-400 transition-colors"
                    >
                      取消
                    </button>
                  )}
                  <button
                    onClick={restorePrompt}
                    className="px-2.5 py-1 text-xs border border-gray-700 hover:border-gray-500 rounded-lg text-gray-500 transition-colors"
                    title="还原为当前保存的生成词"
                  >
                    还原
                  </button>
                  {promptDraft !== panel.prompt && (
                    <button
                      onClick={savePrompt}
                      className="px-2.5 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-200 transition-colors ml-auto"
                    >
                      {promptSaved ? '已保存 ✓' : '保存'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Regenerate button */}
        {panel && panel.status !== 'generating' && (
          <div className="flex justify-end">
            <button
              onClick={() => onRegenerate(panel.id)}
              className="px-3 py-1 text-xs border border-gray-700 hover:border-gray-500 rounded-lg text-gray-400 hover:text-gray-200 transition-colors"
            >
              ↻ 重生成
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ShotPanelEditor({
  projectToken,
  shots,
  panels,
  characters,
  onShotsChange,
  onGenerate,
  onPanelUpdate,
  onPanelRegenerate,
  generating,
  projectStatus,
}: Props) {
  const [extracting, setExtracting] = useState(false)

  const panelByIndex = new Map(panels.map(p => [p.index, p]))
  const doneCount = panels.filter(p => p.status === 'done').length

  async function generateShots() {
    setExtracting(true)
    try {
      const res = await fetch(`/api/projects/${projectToken}/generate-shots`, { method: 'POST' })
      if (!res.ok) throw new Error('生成失败')
      const data = await res.json()
      onShotsChange(data.shots ?? [])
    } catch {
    } finally {
      setExtracting(false)
    }
  }

  const updateShot = useCallback((updated: Shot) => {
    const newShots = shots.map(s => s.index === updated.index ? updated : s)
    onShotsChange(newShots)
    fetch(`/api/projects/${projectToken}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shots: newShots }),
    })
  }, [shots, onShotsChange, projectToken])

  // Empty state: no shots yet
  if (shots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="text-4xl">🎬</div>
        <p className="text-sm text-gray-400 font-medium">还没有分镜脚本</p>
        <p className="text-xs text-gray-600">先由 AI 拆解剧本，再逐格生成图像</p>
        <button
          onClick={generateShots}
          disabled={extracting}
          className="mt-2 px-5 py-2.5 text-sm bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl text-white font-medium transition-colors"
        >
          {extracting ? 'AI 正在分析剧本...' : '✨ AI 生成分镜脚本'}
        </button>
      </div>
    )
  }

  const allGenerated = panels.length > 0 && panels.length >= shots.length
  const canGenerate = projectStatus === 'draft' && !generating && panels.length === 0

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          {panels.length === 0
            ? `${shots.length} 条分镜脚本`
            : `${doneCount} / ${panels.length} 格完成`}
        </div>
        <div className="flex items-center gap-2">
          {!allGenerated && (
            <button
              onClick={generateShots}
              disabled={extracting || generating}
              className="px-3 py-1.5 text-xs border border-gray-700 hover:border-gray-500 rounded-lg text-gray-400 transition-colors disabled:opacity-40"
            >
              {extracting ? '重新生成中...' : '↺ 重新生成脚本'}
            </button>
          )}
          {canGenerate && (
            <button
              onClick={onGenerate}
              className="px-4 py-1.5 text-xs bg-violet-600 hover:bg-violet-700 rounded-lg text-white font-medium transition-colors"
            >
              ✨ 开始出图
            </button>
          )}
          {generating && (
            <div className="flex items-center gap-2 text-xs text-yellow-400">
              <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              生成中...
            </div>
          )}
        </div>
      </div>

      {/* Shot + panel rows */}
      <div className="space-y-3">
        {shots.map(shot => (
          <ShotRow
            key={shot.index}
            shot={shot}
            panel={panelByIndex.get(shot.index) ?? null}
            onShotChange={updateShot}
            onPanelUpdate={onPanelUpdate}
            onRegenerate={onPanelRegenerate}
            isGenerating={generating}
          />
        ))}
      </div>
    </div>
  )
}
