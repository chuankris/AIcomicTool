'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  AlertTriangle,
  Captions,
  Clapperboard,
  Link2,
  ImageIcon,
  Play,
  RefreshCw,
  Settings2,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { Lightbox } from '@/components/ui/Lightbox'
import type { Shot, Panel, Character } from '@/types'

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
  characters: Character[]
  backgrounds: Character[]
  onShotChange: (updated: Shot) => void
  onPanelUpdate: (panel: Panel) => void
  onRegenerate: (id: number) => void
  onGenerateShot: (shot: Shot) => void
  isGenerating: boolean
  isGeneratingShot: boolean
  previewPrompt: string
  usingPromptOverride: boolean
  onPreviewPromptChange: (index: number, prompt: string, usingOverride: boolean) => void
  transientError?: string
}

const RESOLUTION_PRESETS = [
  { label: '720 x 1280', width: 720, height: 1280 },
  { label: '1080 x 1920', width: 1080, height: 1920 },
  { label: '1024 x 1024', width: 1024, height: 1024 },
  { label: '1280 x 720', width: 1280, height: 720 },
]

function propsToText(props?: string[]) {
  return props?.join('、') ?? ''
}

function textToProps(value: string) {
  return value.split(/[、,\n]/).map(item => item.trim()).filter(Boolean)
}

function getShotCharacterIds(shot: Shot, characters: Character[]) {
  if (shot.characterRefs?.length) return new Set(shot.characterRefs.map(ref => ref.characterId))
  return new Set(characters.filter(char => shot.characters.includes(char.name)).map(char => char.id))
}

function pickBestCharacterByName(characters: Character[], name: string) {
  return characters
    .filter(char => char.name === name)
    .sort((a, b) => {
      const aHasRef = a.referenceImageUrl ? 1 : 0
      const bHasRef = b.referenceImageUrl ? 1 : 0
      if (aHasRef !== bHasRef) return bHasRef - aHasRef
      return b.id - a.id
    })[0] ?? null
}

function resolveShotCharacters(shot: Shot, characters: Character[]) {
  if (shot.characterRefs?.length) {
    const ids = new Set(shot.characterRefs.map(ref => ref.characterId))
    return characters.filter(char => ids.has(char.id))
  }
  return Array.from(new Set(shot.characters))
    .map(name => pickBestCharacterByName(characters, name))
    .filter((char): char is Character => Boolean(char))
}

function resolveShotBackground(shot: Shot, backgrounds: Character[]) {
  if (shot.backgroundRef?.backgroundId) {
    return backgrounds.find(bg => bg.id === shot.backgroundRef?.backgroundId) ?? null
  }
  return backgrounds.find(bg => shot.sceneDesc.includes(bg.name)) ?? null
}

function getMainReference(shot: Shot, characters: Character[], backgrounds: Character[]) {
  const resolvedCharacters = resolveShotCharacters(shot, characters)
  const explicitCharacter = shot.characterRefs
    ?.map(ref => ({ ref, char: resolvedCharacters.find(char => char.id === ref.characterId) }))
    .find(item => item.char?.referenceImageUrl)
  if (explicitCharacter?.char?.referenceImageUrl) {
    return { label: explicitCharacter.char.name, imageUrl: explicitCharacter.char.referenceImageUrl, type: '角色参考' }
  }
  const firstCharacter = resolvedCharacters.find(char => char.referenceImageUrl)
  if (firstCharacter?.referenceImageUrl) {
    return { label: firstCharacter.name, imageUrl: firstCharacter.referenceImageUrl, type: '角色参考' }
  }
  const background = resolveShotBackground(shot, backgrounds)
  if (background?.referenceImageUrl) {
    return { label: background.name, imageUrl: background.referenceImageUrl, type: '背景参考' }
  }
  return null
}

function ShotRow({
  shot,
  panel,
  characters,
  backgrounds,
  onShotChange,
  onPanelUpdate,
  onRegenerate,
  onGenerateShot,
  isGenerating,
  isGeneratingShot,
  previewPrompt,
  usingPromptOverride,
  onPreviewPromptChange,
  transientError,
}: ShotRowProps) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showError, setShowError] = useState(false)
  const [promptDraft, setPromptDraft] = useState(shot.promptOverride ?? panel?.prompt ?? previewPrompt)
  const [promptSaved, setPromptSaved] = useState(false)
  const [refining, setRefining] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [editingScene, setEditingScene] = useState(false)
  const [sceneDraft, setSceneDraft] = useState(shot.sceneDesc)

  const currentPrompt = shot.promptOverride ?? panel?.prompt ?? previewPrompt
  const selectedCharacterIds = getShotCharacterIds(shot, characters)
  const selectedBackgroundId = shot.backgroundRef?.backgroundId ?? ''
  const panelStatus = (isGeneratingShot || (isGenerating && !panel)) ? 'waiting' : (panel?.status ?? 'none')
  const mainReference = getMainReference(shot, characters, backgrounds)

  async function savePrompt() {
    onShotChange({ ...shot, promptOverride: promptDraft })
    onPreviewPromptChange(shot.index, promptDraft, true)
    if (panel) {
      await fetch(`/api/panels/${panel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptDraft }),
      })
      onPanelUpdate({ ...panel, prompt: promptDraft })
    }
    setPromptSaved(true)
    setTimeout(() => setPromptSaved(false), 2000)
  }

  function restorePrompt() {
    setPromptDraft(previewPrompt)
    onShotChange({ ...shot, promptOverride: undefined })
    onPreviewPromptChange(shot.index, previewPrompt, false)
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

  function toggleCharacterRef(char: Character) {
    const nextIds = new Set(selectedCharacterIds)
    if (nextIds.has(char.id)) nextIds.delete(char.id)
    else nextIds.add(char.id)
    const selectedChars = characters.filter(item => nextIds.has(item.id))
    onShotChange({
      ...shot,
      characters: selectedChars.map(item => item.name),
      characterRefs: selectedChars.map(item => ({ characterId: item.id, strength: 0.78 })),
    })
  }

  function updateBackground(value: string) {
    const backgroundId = Number(value)
    onShotChange({
      ...shot,
      backgroundRef: backgroundId ? { backgroundId, strength: 0.62 } : undefined,
    })
  }

  return (
    <article className="rounded-lg border border-gray-800 bg-gray-900/70 p-4">
      <div className="flex gap-4">
        <div className="w-24 shrink-0">
          <div className="flex aspect-[9/16] items-center justify-center overflow-hidden rounded-md bg-gray-800">
            {panelStatus === 'generating' || panelStatus === 'waiting' ? (
              <div className="flex flex-col items-center gap-2">
                <div className="h-5 w-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                <span className="text-xs text-amber-300">生成中</span>
              </div>
            ) : panel?.status === 'done' && panel.imageUrl ? (
              <Lightbox src={panel.imageUrl} alt={`分镜 ${shot.index}`} className="h-full w-full object-cover" />
            ) : panel?.status === 'failed' ? (
              <div className="flex flex-col items-center gap-1 px-1 text-center text-red-300">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs">生成失败</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-gray-600">
                <ImageIcon className="h-4 w-4" />
                <span className="text-xs">待生成</span>
              </div>
            )}
          </div>
          <div className="mt-1 text-center text-xs text-gray-600">#{shot.index}</div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          {editingScene ? (
            <div className="space-y-2">
              <textarea
                value={sceneDraft}
                onChange={e => setSceneDraft(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-md border border-cyan-500/50 bg-gray-800 p-2 text-sm text-gray-200 outline-none"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditingScene(false)
                    setSceneDraft(shot.sceneDesc)
                  }}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    onShotChange({ ...shot, sceneDesc: sceneDraft })
                    setEditingScene(false)
                  }}
                  className="text-xs text-cyan-300 hover:text-cyan-200"
                >
                  保存场景
                </button>
              </div>
            </div>
          ) : (
            <p
              className="cursor-text text-sm leading-relaxed text-gray-200 hover:text-white"
              onClick={() => setEditingScene(true)}
              title="点击编辑场景描述"
            >
              {shot.sceneDesc}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5 text-xs">
            {shot.characters.map(name => (
              <span key={name} className="rounded-full bg-violet-500/10 px-2 py-0.5 text-violet-200">{name}</span>
            ))}
            {shot.emotion && <span className="rounded-full bg-gray-800 px-2 py-0.5 text-gray-400">{shot.emotion}</span>}
            {shot.composition && <span className="rounded-full bg-gray-800 px-2 py-0.5 text-gray-400">{shot.composition}</span>}
            {shot.durationSec && <span className="rounded-full bg-gray-800 px-2 py-0.5 text-gray-400">{shot.durationSec}s</span>}
            {shot.subtitlePosition && shot.subtitlePosition !== 'none' && (
              <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-cyan-300">字幕安全区</span>
            )}
            {shot.dialogue && (
              <span className="max-w-[220px] truncate rounded-full bg-gray-800 px-2 py-0.5 text-gray-500 italic">
                {shot.dialogue}
              </span>
            )}
          </div>

          {(panel?.status === 'failed' || transientError) && (
            <div className="rounded-md border border-red-500/25 bg-red-500/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-red-200">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  图片生成失败
                </div>
                <button
                  onClick={() => setShowError(value => !value)}
                  className="text-xs text-red-200/80 hover:text-red-100"
                >
                  {showError ? '收起原因' : '查看原因'}
                </button>
              </div>
              {showError && (
                <div className="mt-2 space-y-2">
                  <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded border border-red-500/20 bg-gray-950/70 p-2 text-xs leading-relaxed text-red-100">
                    {panel?.reviewFeedback || transientError || '服务端没有返回详细错误。可以检查即梦 Key、参考图 URL、分辨率和 prompt。'}
                  </pre>
                  <div className="text-[11px] leading-relaxed text-red-200/70">
                    常见原因：即梦凭证错误或过期、参考图 URL 失效、接口额度不足、prompt 或图片参数被模型拒绝。
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 rounded-md border border-gray-800 bg-gray-950/40 px-2.5 py-2">
            {mainReference ? (
              <>
                <div className="h-8 w-8 overflow-hidden rounded border border-gray-700 bg-gray-800">
                  <Lightbox src={mainReference.imageUrl} alt={mainReference.label} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-gray-300">本格主参考：{mainReference.label}</div>
                  <div className="text-[11px] text-gray-600">{mainReference.type}，会作为即梦 ref_img 传入</div>
                </div>
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4 text-gray-600" />
                <div>
                  <div className="text-xs text-gray-500">本格没有主参考图</div>
                  <div className="text-[11px] text-gray-700">会退化为纯文本生成，角色一致性会明显变差</div>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-800 pt-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowSettings(value => !value)}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-700 px-2.5 py-1 text-xs text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-200"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                单格设置
              </button>
              {panel && (
                <button
                  onClick={() => {
                    if (!showPrompt) setPromptDraft(panel.prompt)
                    setShowPrompt(value => !value)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-700 px-2.5 py-1 text-xs text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-200"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  生成词
                </button>
              )}
              {!panel && (
                <button
                  onClick={() => {
                    setPromptDraft(shot.promptOverride ?? previewPrompt)
                    setShowPrompt(value => !value)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-700 px-2.5 py-1 text-xs text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-200"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  预生成词
                </button>
              )}
            </div>

            <div className="flex gap-2">
              {!panel && (
                <button
                  onClick={() => onGenerateShot(shot)}
                  disabled={isGeneratingShot}
                  className="inline-flex items-center gap-1.5 rounded-md bg-cyan-400 px-3 py-1 text-xs font-medium text-gray-950 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGeneratingShot ? (
                    <span className="h-3.5 w-3.5 rounded-full border border-gray-700 border-t-transparent animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  生成此格
                </button>
              )}
              {panel && panel.status !== 'generating' && (
                <button
                  onClick={() => onRegenerate(panel.id)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-700 px-3 py-1 text-xs text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-200"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  重生成
                </button>
              )}
            </div>
          </div>

          {showSettings && (
            <div className="grid gap-3 rounded-md border border-gray-800 bg-gray-950/50 p-3 lg:grid-cols-2">
              <div>
                <div className="mb-1 text-xs text-gray-500">角色参考</div>
                <div className="flex flex-wrap gap-1.5">
                  {characters.length > 0 ? characters.map(char => (
                    <button
                      key={char.id}
                      onClick={() => toggleCharacterRef(char)}
                      className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                        selectedCharacterIds.has(char.id)
                          ? 'border-violet-400/60 bg-violet-500/15 text-violet-100'
                          : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {char.name}
                    </button>
                  )) : <span className="text-xs text-gray-600">暂无角色参考</span>}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500">背景参考</label>
                <select
                  value={selectedBackgroundId}
                  onChange={e => updateBackground(e.target.value)}
                  className="w-full rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-cyan-500/70"
                >
                  <option value="">不绑定背景</option>
                  {backgrounds.map(bg => (
                    <option key={bg.id} value={bg.id}>{bg.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500">关键道具</label>
                <input
                  value={propsToText(shot.keyProps)}
                  onChange={e => onShotChange({ ...shot, keyProps: textToProps(e.target.value) })}
                  placeholder="旧耳机、手电筒"
                  className="w-full rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-cyan-500/70"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500">预计时长</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={shot.durationSec ?? 3}
                  onChange={e => onShotChange({ ...shot, durationSec: Number(e.target.value) })}
                  className="w-full rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-cyan-500/70"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="mb-1 block text-xs text-gray-500">单格反馈</label>
                <textarea
                  value={shot.localFeedback ?? ''}
                  onChange={e => onShotChange({ ...shot, localFeedback: e.target.value })}
                  placeholder="只影响这一格，如：更暗、更压迫，角色离镜头更近"
                  rows={2}
                  className="w-full resize-none rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-cyan-500/70"
                />
              </div>
            </div>
          )}

          {showPrompt && (
            <div className="space-y-2 rounded-md border border-gray-800 bg-gray-950/50 p-3">
              <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500">
                <span>{usingPromptOverride || shot.promptOverride?.trim() ? '当前使用：手动修改版' : '当前使用：系统预生成版'}</span>
                {!panel && <span>生成前可先修改</span>}
              </div>
              <textarea
                value={promptDraft}
                onChange={e => setPromptDraft(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-md border border-gray-700 bg-gray-900 p-2 font-mono text-xs leading-relaxed text-cyan-100 outline-none focus:border-cyan-500/70"
              />

              {showFeedback && (
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="告诉 AI 需要调整什么方向，如：更暗调，强调角色孤独感"
                  rows={2}
                  className="w-full resize-none rounded-md border border-gray-700 bg-gray-900 p-2 text-xs text-gray-300 outline-none focus:border-cyan-500/70"
                />
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={refinePrompt}
                  disabled={refining}
                  className="rounded-md bg-violet-600 px-2.5 py-1 text-xs text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
                >
                  {refining ? 'AI 润色中' : 'AI 润色'}
                </button>
                <button
                  onClick={() => setShowFeedback(value => !value)}
                  className="rounded-md border border-gray-700 px-2.5 py-1 text-xs text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-200"
                >
                  {showFeedback ? '收起要求' : '加要求'}
                </button>
                <button
                  onClick={restorePrompt}
                  className="rounded-md border border-gray-700 px-2.5 py-1 text-xs text-gray-500 transition-colors hover:border-gray-500"
                >
                  还原系统版
                </button>
                {promptDraft !== currentPrompt && (
                  <button
                    onClick={savePrompt}
                    className="ml-auto rounded-md bg-gray-700 px-2.5 py-1 text-xs text-gray-200 transition-colors hover:bg-gray-600"
                  >
                    {promptSaved ? '已保存' : '保存生成词'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
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
  const [generatingShotIndex, setGeneratingShotIndex] = useState<number | null>(null)
  const [transientErrors, setTransientErrors] = useState<Record<number, string>>({})
  const [previewPrompts, setPreviewPrompts] = useState<Record<number, { prompt: string; usingOverride: boolean }>>({})
  const characterRefs = characters.filter(char => char.type !== 'background')
  const backgroundRefs = characters.filter(char => char.type === 'background')
  const panelByIndex = new Map(panels.map(p => [p.index, p]))
  const doneCount = panels.filter(p => p.status === 'done').length
  const missingCount = shots.filter(shot => !panelByIndex.has(shot.index)).length

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

  useEffect(() => {
    if (shots.length === 0) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/projects/${projectToken}/preview-panel-prompts`, { method: 'POST' })
        if (!res.ok) throw new Error('预览失败')
        const data = await res.json()
        if (cancelled) return
        const next = Object.fromEntries((data.previews ?? []).map((item: {
          index: number
          prompt: string
          usingOverride: boolean
        }) => [item.index, { prompt: item.prompt, usingOverride: item.usingOverride }]))
        setPreviewPrompts(next)
      } catch {
      }
    })()
    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectToken, shots.length, JSON.stringify(shots.map(shot => ({
    index: shot.index,
    sceneDesc: shot.sceneDesc,
    characters: shot.characters,
    promptOverride: shot.promptOverride,
    characterRefs: shot.characterRefs,
    backgroundRef: shot.backgroundRef,
    keyProps: shot.keyProps,
    localFeedback: shot.localFeedback,
  })))])

  const saveShots = useCallback((nextShots: Shot[]) => {
    onShotsChange(nextShots)
    fetch(`/api/projects/${projectToken}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shots: nextShots }),
    })
  }, [onShotsChange, projectToken])

  const updateShot = useCallback((updated: Shot) => {
    saveShots(shots.map(s => s.index === updated.index ? updated : s))
  }, [shots, saveShots])

  function updateAllShots(patch: Partial<Shot>) {
    saveShots(shots.map(shot => ({ ...shot, ...patch })))
  }

  function updateAllResolution(value: string) {
    const preset = RESOLUTION_PRESETS.find(item => item.label === value)
    if (!preset) return
    updateAllShots({
      resolution: { width: preset.width, height: preset.height },
      aspectRatio: preset.width === preset.height ? '1:1' : preset.width > preset.height ? '16:9' : '9:16',
    })
  }

  function updatePreviewPrompt(index: number, prompt: string, usingOverride: boolean) {
    setPreviewPrompts(prev => ({
      ...prev,
      [index]: { prompt, usingOverride },
    }))
  }

  function lockAllReferences() {
    saveShots(shots.map(shot => {
      const resolvedCharacters = resolveShotCharacters(shot, characterRefs)
      const resolvedBackground = resolveShotBackground(shot, backgroundRefs)
      return {
        ...shot,
        characters: resolvedCharacters.length ? resolvedCharacters.map(char => char.name) : shot.characters,
        characterRefs: resolvedCharacters.length
          ? resolvedCharacters.map(char => ({ characterId: char.id, strength: 0.82 }))
          : shot.characterRefs,
        backgroundRef: resolvedBackground
          ? { backgroundId: resolvedBackground.id, strength: 0.68 }
          : shot.backgroundRef,
      }
    }))
  }

  async function generateSingleShot(shot: Shot) {
    setGeneratingShotIndex(shot.index)
    setTransientErrors(prev => {
      const next = { ...prev }
      delete next[shot.index]
      return next
    })
    try {
      const res = await fetch(`/api/projects/${projectToken}/generate-panel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shotIndex: shot.index }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? '生成失败')
      }
      const panel = await res.json()
      onPanelUpdate(panel)
    } catch (e) {
      setTransientErrors(prev => ({
        ...prev,
        [shot.index]: e instanceof Error ? e.message : '生成失败',
      }))
    } finally {
      setGeneratingShotIndex(null)
    }
  }

  if (shots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="text-4xl">🎬</div>
        <p className="text-sm font-medium text-gray-400">还没有分镜脚本</p>
        <p className="text-xs text-gray-600">先由 AI 拆解剧本，再逐格确认和出图</p>
        <button
          onClick={generateShots}
          disabled={extracting}
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-medium text-gray-950 transition-colors hover:bg-cyan-300 disabled:opacity-50"
        >
          {extracting ? <span className="h-4 w-4 rounded-full border border-gray-700 border-t-transparent animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {extracting ? 'AI 正在分析剧本' : 'AI 生成分镜脚本'}
        </button>
      </div>
    )
  }

  const allGenerated = missingCount === 0 && panels.length > 0
  const canGenerate = projectStatus === 'draft' && !generating && missingCount > 0
  const firstResolution = shots[0]?.resolution
  const resolutionLabel = firstResolution ? `${firstResolution.width} x ${firstResolution.height}` : '720 x 1280'

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-gray-800 bg-gray-900/70 p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Clapperboard className="h-4 w-4 text-cyan-300" />
              <h2 className="text-sm font-medium text-gray-100">分镜出图控制台</h2>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              先确认分镜和参考绑定，再单格试生成或批量开始出图。已生成的格子不会因全局设置自动覆盖。
            </p>
          </div>
          <div className="text-xs text-gray-500">
            {doneCount} 格完成，{missingCount} 格待生成
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs text-gray-500">分辨率</span>
            <select
              value={resolutionLabel}
              onChange={e => updateAllResolution(e.target.value)}
              className="w-full rounded-md border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-cyan-500/70"
            >
              {RESOLUTION_PRESETS.map(item => (
                <option key={item.label} value={item.label}>{item.label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs text-gray-500">字幕位置</span>
            <select
              value={shots[0]?.subtitlePosition ?? 'bottom'}
              onChange={e => updateAllShots({ subtitlePosition: e.target.value as Shot['subtitlePosition'] })}
              className="w-full rounded-md border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-cyan-500/70"
            >
              <option value="bottom">底部</option>
              <option value="middle-bottom">中下方</option>
              <option value="none">无字幕</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs text-gray-500">底部安全区</span>
            <input
              type="number"
              min={0}
              max={35}
              value={shots[0]?.safeArea?.bottom ?? 18}
              onChange={e => updateAllShots({ safeArea: { ...(shots[0]?.safeArea ?? {}), bottom: Number(e.target.value) } })}
              className="w-full rounded-md border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-cyan-500/70"
            />
          </label>

          <div className="flex flex-wrap items-end gap-2 md:col-span-3">
            <button
              onClick={lockAllReferences}
              disabled={generating}
              className="inline-flex h-[31px] min-w-[104px] flex-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 text-xs text-cyan-200 transition-colors hover:border-cyan-400/60 hover:bg-cyan-500/15 disabled:opacity-40"
            >
              <Link2 className="h-3.5 w-3.5" />
              锁定参考
            </button>
            <button
              onClick={generateShots}
              disabled={extracting || generating}
              className="inline-flex h-[31px] min-w-[104px] flex-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-gray-700 px-3 text-xs text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-200 disabled:opacity-40"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {extracting ? '拆解中' : '重拆分镜'}
            </button>
            {canGenerate && (
              <button
                onClick={onGenerate}
                className="inline-flex h-[31px] min-w-[104px] flex-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-cyan-400 px-3 text-xs font-medium text-gray-950 transition-colors hover:bg-cyan-300"
              >
                <Play className="h-3.5 w-3.5" />
                开始出图
              </button>
            )}
            {generating && (
              <div className="flex h-[31px] min-w-[104px] flex-none items-center justify-center gap-2 whitespace-nowrap text-xs text-amber-300">
                <span className="h-3 w-3 rounded-full border-2 border-amber-300 border-t-transparent animate-spin" />
                生成中
              </div>
            )}
            {allGenerated && (
              <div className="flex h-[31px] min-w-[104px] flex-none items-center justify-center whitespace-nowrap rounded-md border border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-300">
                已出图
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-950 px-2 py-0.5">
            <Captions className="h-3 w-3" />
            安全区会写入 prompt
          </span>
          <span className="rounded-full bg-gray-950 px-2 py-0.5">角色参考 {characterRefs.length} 个</span>
          <span className="rounded-full bg-gray-950 px-2 py-0.5">背景参考 {backgroundRefs.length} 个</span>
        </div>
      </section>

      <div className="space-y-3">
        {shots.map(shot => (
          <ShotRow
            key={shot.index}
            shot={shot}
            panel={panelByIndex.get(shot.index) ?? null}
            characters={characterRefs}
            backgrounds={backgroundRefs}
            onShotChange={updateShot}
            onPanelUpdate={onPanelUpdate}
            onRegenerate={onPanelRegenerate}
            onGenerateShot={generateSingleShot}
            isGenerating={generating}
            isGeneratingShot={generatingShotIndex === shot.index}
            previewPrompt={previewPrompts[shot.index]?.prompt ?? ''}
            usingPromptOverride={previewPrompts[shot.index]?.usingOverride ?? Boolean(shot.promptOverride?.trim())}
            onPreviewPromptChange={updatePreviewPrompt}
            transientError={transientErrors[shot.index]}
          />
        ))}
      </div>
    </div>
  )
}
