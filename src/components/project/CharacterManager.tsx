'use client'

import { useState } from 'react'
import {
  AlertCircle,
  Check,
  Image as ImageIcon,
  Map,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UserRound,
  Wand2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lightbox } from '@/components/ui/Lightbox'
import type { Character, CharacterAttributes } from '@/types'

type CharType = 'character' | 'background'
type RefineState = 'idle' | 'refining' | 'reviewing' | 'generating'

interface RefineResult {
  attributes: CharacterAttributes
  prompt: string
}

interface Proposal {
  name: string
  description: string
  type: CharType
  attributes: CharacterAttributes
  prompt: string
}

interface Props {
  token: string
  script?: string
  characters: Character[]
  onCharactersChange: (chars: Character[]) => void
}

function valueToText(value: unknown): string {
  if (!value) return ''
  if (Array.isArray(value)) return value.filter(Boolean).join('、')
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).filter(Boolean).join('、')
  }
  return String(value)
}

function attributeEntries(attrs: CharacterAttributes) {
  return Object.entries(attrs)
    .map(([key, value]) => [key, valueToText(value)] as const)
    .filter(([, value]) => value)
}

function typeMeta(type: CharType) {
  return type === 'background'
    ? { label: '背景场景', icon: Map, accent: 'teal' }
    : { label: '角色', icon: UserRound, accent: 'violet' }
}

export function CharacterManager({ token, script, characters, onCharactersChange }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [charType, setCharType] = useState<CharType>('character')
  const [refineState, setRefineState] = useState<RefineState>('idle')
  const [refineResult, setRefineResult] = useState<RefineResult | null>(null)
  const [feedback, setFeedback] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showManualAdd, setShowManualAdd] = useState(false)

  const [extracting, setExtracting] = useState(false)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [approvingIdx, setApprovingIdx] = useState<number | null>(null)
  const [regenId, setRegenId] = useState<number | null>(null)

  const approvedCharacters = characters.filter(char => char.type !== 'background')
  const approvedBackgrounds = characters.filter(char => char.type === 'background')
  const characterProposals = proposals.filter(p => p.type !== 'background')
  const backgroundProposals = proposals.filter(p => p.type === 'background')

  async function handleExtract() {
    setExtracting(true)
    setProposals([])
    setError(null)
    try {
      const res = await fetch(`/api/projects/${token}/extract-characters`, { method: 'POST' })
      if (!res.ok) throw new Error('提取失败')
      const data = await res.json()
      setProposals(data.characters ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '提取失败，请重试')
    } finally {
      setExtracting(false)
    }
  }

  async function approveProposal(idx: number) {
    const p = proposals[idx]
    setApprovingIdx(idx)
    setError(null)
    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectToken: token,
          name: p.name,
          description: p.description,
          attributes: p.attributes,
          prompt: p.prompt,
          type: p.type,
        }),
      })
      if (!res.ok) throw new Error('保存失败')
      const newChar = await res.json()
      onCharactersChange([...characters, { ...newChar, attributes: p.attributes }])
      setProposals(prev => prev.filter((_, i) => i !== idx))
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成参考图失败')
    } finally {
      setApprovingIdx(null)
    }
  }

  function dismissProposal(idx: number) {
    setProposals(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleRegenChar(id: number) {
    setRegenId(id)
    setError(null)
    try {
      const res = await fetch(`/api/characters/${id}/regenerate`, { method: 'POST' })
      if (!res.ok) throw new Error('重新生成失败')
      const updated = await res.json()
      onCharactersChange(characters.map(c => (
        c.id === id ? { ...c, referenceImageUrl: updated.referenceImageUrl } : c
      )))
    } catch (e) {
      setError(e instanceof Error ? e.message : '重新生成失败')
    } finally {
      setRegenId(null)
    }
  }

  async function handleRefine(withFeedback = false) {
    if (!name.trim() || !description.trim()) {
      setError('请填写名称和描述')
      return
    }
    setError(null)
    setRefineState('refining')
    try {
      const body: Record<string, unknown> = { token, name, description, type: charType }
      if (withFeedback && feedback.trim() && refineResult) {
        body.feedback = feedback
        body.currentAttributes = refineResult.attributes
      }
      const res = await fetch('/api/ai/refine-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('润色失败')
      const data = await res.json()
      setRefineResult(data)
      setShowFeedback(false)
      setFeedback('')
      setRefineState('reviewing')
    } catch (e) {
      setError(e instanceof Error ? e.message : '润色失败，请重试')
      setRefineState('idle')
    }
  }

  async function handleApprove() {
    if (!refineResult) return
    setRefineState('generating')
    setError(null)
    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectToken: token,
          name,
          description,
          attributes: refineResult.attributes,
          prompt: refineResult.prompt,
          type: charType,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '保存失败')
      }
      const newChar = await res.json()
      onCharactersChange([...characters, { ...newChar, attributes: refineResult.attributes }])
      resetForm()
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成预览图失败，请重试')
      setRefineState('reviewing')
    }
  }

  function resetForm() {
    setName('')
    setDescription('')
    setRefineResult(null)
    setRefineState('idle')
    setShowFeedback(false)
    setFeedback('')
    setError(null)
    setShowManualAdd(false)
  }

  function removeChar(id: number) {
    fetch(`/api/characters/${id}`, { method: 'DELETE' }).catch(() => {})
    onCharactersChange(characters.filter(c => c.id !== id))
  }

  function renderReferenceImage(char: Character) {
    if (char.referenceImageUrl) {
      return (
        <div className="relative h-24 w-20 shrink-0 group/img">
          <Lightbox src={char.referenceImageUrl} alt={char.name} className="h-full w-full rounded-md object-cover" />
          <button
            onClick={e => {
              e.stopPropagation()
              handleRegenChar(char.id)
            }}
            disabled={regenId === char.id}
            className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded bg-black/75 text-white opacity-0 transition-opacity hover:bg-black group-hover/img:opacity-100 disabled:opacity-100"
            title="重新生成参考图"
          >
            {regenId === char.id ? (
              <span className="h-3 w-3 rounded-full border border-white border-t-transparent animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      )
    }

    return (
      <div className="flex h-24 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-gray-700 bg-gray-900 text-gray-600">
        <ImageIcon className="h-4 w-4" />
        <span className="text-xs">无图</span>
      </div>
    )
  }

  function renderAssetCard(char: Character) {
    const isBackground = char.type === 'background'
    const meta = typeMeta(char.type)
    const Icon = meta.icon

    return (
      <article key={char.id} className="flex gap-3 rounded-lg border border-gray-800 bg-gray-900/70 p-3">
        {renderReferenceImage(char)}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="font-medium text-sm text-gray-100">{char.name}</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
              isBackground ? 'bg-teal-500/10 text-teal-300' : 'bg-violet-500/10 text-violet-300'
            }`}>
              <Icon className="h-3 w-3" />
              {meta.label}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
              <Check className="h-3 w-3" />
              已确认
            </span>
          </div>
          <p className="mb-2 text-xs leading-relaxed text-gray-400">{char.description}</p>
          {attributeEntries(char.attributes).length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {attributeEntries(char.attributes).slice(0, 8).map(([key, value]) => (
                <span key={key} className="rounded-full border border-gray-700 bg-gray-950/60 px-2 py-0.5 text-xs text-gray-300">
                  {value}
                </span>
              ))}
            </div>
          )}
          <div className={`rounded-md border p-2 text-xs leading-relaxed ${
            isBackground
              ? 'border-teal-500/20 bg-teal-950/20 text-teal-100/80'
              : 'border-violet-500/20 bg-violet-950/20 text-violet-100/80'
          }`}>
            <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
              {isBackground ? '背景 Prompt' : '角色 Prompt'}
            </div>
            <div className="line-clamp-3">{char.prompt}</div>
          </div>
        </div>
        <button
          onClick={() => removeChar(char.id)}
          className="self-start rounded p-1 text-gray-600 transition-colors hover:bg-red-500/10 hover:text-red-300"
          title="删除"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </article>
    )
  }

  function renderProposalCard(p: Proposal, localIdx: number) {
    const globalIdx = proposals.indexOf(p)
    const isBackground = p.type === 'background'
    const meta = typeMeta(p.type)
    const Icon = meta.icon

    return (
      <article key={`${p.type}-${p.name}-${localIdx}`} className={`rounded-lg border p-3 ${
        isBackground ? 'border-teal-500/30 bg-teal-950/10' : 'border-amber-500/30 bg-amber-950/10'
      }`}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm text-gray-100">{p.name}</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
            isBackground ? 'bg-teal-500/10 text-teal-300' : 'bg-violet-500/10 text-violet-300'
          }`}>
            <Icon className="h-3 w-3" />
            {meta.label}
          </span>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">待确认</span>
        </div>
        <p className="mb-2 text-xs leading-relaxed text-gray-400">{p.description}</p>
        {attributeEntries(p.attributes).length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {attributeEntries(p.attributes).slice(0, 10).map(([key, value]) => (
              <span key={key} className="rounded-full border border-gray-700 bg-gray-950/50 px-2 py-0.5 text-xs text-gray-300">
                {value}
              </span>
            ))}
          </div>
        )}
        <div className="mb-3 rounded-md border border-gray-800 bg-gray-950/50 p-2 text-xs leading-relaxed text-gray-400">
          <span className="text-gray-500">{isBackground ? '场景参考图 Prompt：' : '角色参考图 Prompt：'}</span>
          <span className="line-clamp-2">{p.prompt}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => dismissProposal(globalIdx)}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-700 py-2 text-xs text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-200"
          >
            <X className="h-3.5 w-3.5" />
            忽略
          </button>
          <button
            onClick={() => approveProposal(globalIdx)}
            disabled={approvingIdx === globalIdx}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-gray-100 py-2 text-xs font-medium text-gray-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {approvingIdx === globalIdx ? (
              <span className="h-3.5 w-3.5 rounded-full border border-gray-700 border-t-transparent animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {approvingIdx === globalIdx ? '生成中' : '确认并生成参考图'}
          </button>
        </div>
      </article>
    )
  }

  return (
    <section className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <h3 className="text-sm font-medium text-gray-100">AI 提取建议</h3>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              从剧本中识别角色和背景场景。它们会先进入建议区，确认后才会生成参考图并加入正式设定。
            </p>
          </div>
          {script?.trim() && (
            <button
              onClick={handleExtract}
              disabled={extracting}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200 transition-colors hover:border-amber-400/60 hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {extracting ? (
                <span className="h-3.5 w-3.5 rounded-full border border-amber-300 border-t-transparent animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
              {extracting ? '分析中' : '从剧本提取'}
            </button>
          )}
        </div>

        {extracting && (
          <div className="rounded-md border border-dashed border-gray-800 bg-gray-950/50 px-4 py-5 text-center text-xs text-gray-400">
            AI 正在分析人物、关系、固定服装、关键道具和可复用背景场景。
          </div>
        )}

        {!extracting && proposals.length === 0 && (
          <div className="rounded-md border border-dashed border-gray-800 bg-gray-950/40 px-4 py-5 text-center text-xs leading-relaxed text-gray-600">
            暂无待确认建议。保存剧本后可以从剧本自动提取，也可以手动添加角色或背景。
          </div>
        )}

        {proposals.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-violet-200">角色建议</h4>
                <span className="text-xs text-gray-600">{characterProposals.length} 个</span>
              </div>
              {characterProposals.length > 0 ? (
                characterProposals.map(renderProposalCard)
              ) : (
                <div className="rounded-md border border-dashed border-gray-800 p-4 text-center text-xs text-gray-600">暂无角色建议</div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-teal-200">背景场景建议</h4>
                <span className="text-xs text-gray-600">{backgroundProposals.length} 个</span>
              </div>
              {backgroundProposals.length > 0 ? (
                backgroundProposals.map(renderProposalCard)
              ) : (
                <div className="rounded-md border border-dashed border-gray-800 p-4 text-center text-xs text-gray-600">暂无背景建议</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-medium text-gray-100">
              <UserRound className="h-4 w-4 text-violet-300" />
              已确认角色
            </h3>
            <span className="text-xs text-gray-600">{approvedCharacters.length} 个</span>
          </div>
          {approvedCharacters.length > 0 ? (
            approvedCharacters.map(renderAssetCard)
          ) : (
            <div className="rounded-lg border border-dashed border-gray-800 bg-gray-900/30 p-5 text-center text-xs text-gray-600">
              还没有确认角色。
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-medium text-gray-100">
              <Map className="h-4 w-4 text-teal-300" />
              已确认背景场景
            </h3>
            <span className="text-xs text-gray-600">{approvedBackgrounds.length} 个</span>
          </div>
          {approvedBackgrounds.length > 0 ? (
            approvedBackgrounds.map(renderAssetCard)
          ) : (
            <div className="rounded-lg border border-dashed border-gray-800 bg-gray-900/30 p-5 text-center text-xs text-gray-600">
              还没有确认背景场景。
            </div>
          )}
        </div>
      </div>

      {!showManualAdd && refineState === 'idle' && (
        <button
          onClick={() => setShowManualAdd(true)}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-800 py-2 text-xs text-gray-500 transition-colors hover:border-gray-600 hover:text-gray-300"
        >
          <Plus className="h-3.5 w-3.5" />
          手动添加角色或背景场景
        </button>
      )}

      {(showManualAdd || refineState !== 'idle') && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-gray-100">
                {refineState === 'idle' ? '手动添加设定' :
                  refineState === 'refining' ? 'AI 润色中' :
                    refineState === 'reviewing' ? '审核润色结果' : '生成参考图中'}
              </h3>
              <p className="mt-1 text-xs text-gray-500">手动输入也会先经过确认，再正式加入设定。</p>
            </div>
          </div>

          {refineState === 'idle' && (
            <div className="space-y-3">
              <div className="inline-grid grid-cols-2 rounded-md border border-gray-800 bg-gray-950/50 p-1">
                <button
                  onClick={() => setCharType('character')}
                  className={`inline-flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs transition-colors ${
                    charType === 'character' ? 'bg-violet-500/20 text-violet-100' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <UserRound className="h-3.5 w-3.5" />
                  角色
                </button>
                <button
                  onClick={() => setCharType('background')}
                  className={`inline-flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs transition-colors ${
                    charType === 'background' ? 'bg-teal-500/20 text-teal-100' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Map className="h-3.5 w-3.5" />
                  背景场景
                </button>
              </div>
              <div>
                <Label>名称</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={charType === 'character' ? '如：林夏' : '如：废弃地铁站'}
                  className="mt-1 border-gray-700 bg-gray-800"
                />
              </div>
              <div>
                <Label>描述</Label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={charType === 'character'
                    ? '如：17 岁，沉默但敏锐，黑色短发，固定穿深色校服，随身带旧耳机'
                    : '如：末日后的地下站台，冷色应急灯闪烁，墙面有旧海报和积水反光'}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-gray-700 bg-gray-800 p-2 text-sm text-gray-200 outline-none transition-colors focus:border-cyan-500/70"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={resetForm} variant="outline" className="border-gray-700">
                  取消
                </Button>
                <Button
                  onClick={() => handleRefine(false)}
                  disabled={!name.trim() || !description.trim()}
                  className="bg-cyan-500 text-gray-950 hover:bg-cyan-400"
                >
                  AI 润色
                </Button>
              </div>
            </div>
          )}

          {refineState === 'refining' && (
            <div className="flex items-center gap-3 rounded-md border border-dashed border-gray-800 bg-gray-950/50 px-4 py-5">
              <span className="h-4 w-4 rounded-full border-2 border-cyan-700 border-t-cyan-300 animate-spin" />
              <span className="text-sm text-gray-400">AI 正在整理关键设定和参考图 prompt。</span>
            </div>
          )}

          {refineState === 'reviewing' && refineResult && (
            <div className="space-y-3">
              <div>
                <div className="mb-1.5 text-xs text-gray-500">识别到的设定</div>
                <div className="flex flex-wrap gap-1.5">
                  {attributeEntries(refineResult.attributes).map(([key, value]) => (
                    <span key={key} className="rounded-full border border-gray-700 bg-gray-950/60 px-2 py-0.5 text-xs text-gray-300">
                      {value}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-xs text-gray-500">参考图 Prompt</div>
                <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-3 text-xs leading-relaxed text-cyan-50/85">
                  {refineResult.prompt}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowFeedback(true)}
                  className="rounded-md border border-gray-700 py-2 text-xs text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-200"
                >
                  哪里不对
                </button>
                <button
                  onClick={handleApprove}
                  className="rounded-md bg-gray-100 py-2 text-xs font-medium text-gray-950 transition-colors hover:bg-white"
                >
                  确认并生成参考图
                </button>
              </div>
              {showFeedback && (
                <div className="space-y-2 border-t border-gray-800 pt-3">
                  <Label>哪里需要调整？</Label>
                  <textarea
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="如：头发应该是黑色，服装要固定为白衬衫和深色外套"
                    rows={2}
                    className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800 p-2 text-xs text-gray-200 outline-none transition-colors focus:border-cyan-500/70"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setShowFeedback(false)
                        setFeedback('')
                      }}
                      className="rounded-md border border-gray-700 py-1.5 text-xs text-gray-400 hover:text-gray-200"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => handleRefine(true)}
                      disabled={!feedback.trim()}
                      className="rounded-md bg-cyan-500 py-1.5 text-xs font-medium text-gray-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      重新润色
                    </button>
                  </div>
                </div>
              )}
              <button onClick={resetForm} className="w-full pt-1 text-xs text-gray-600 hover:text-gray-400">
                取消，重新输入
              </button>
            </div>
          )}

          {refineState === 'generating' && (
            <div className="flex items-center gap-3 rounded-md border border-dashed border-gray-800 bg-gray-950/50 px-4 py-5">
              <span className="h-4 w-4 rounded-full border-2 border-cyan-700 border-t-cyan-300 animate-spin" />
              <div>
                <div className="text-sm text-gray-300">正在生成参考图</div>
                <div className="mt-0.5 text-xs text-gray-500">角色会生成角色参考图，背景会生成场景参考图。</div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
