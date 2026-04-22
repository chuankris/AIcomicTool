'use client'
import { useState } from 'react'
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

  async function handleExtract() {
    setExtracting(true)
    setProposals([])
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
    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectToken: token, name: p.name, description: p.description, attributes: p.attributes, type: p.type }),
      })
      if (!res.ok) throw new Error('保存失败')
      const newChar = await res.json()
      onCharactersChange([...characters, { ...newChar, attributes: p.attributes }])
      setProposals(prev => prev.filter((_, i) => i !== idx))
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成图片失败')
    } finally {
      setApprovingIdx(null)
    }
  }

  function dismissProposal(idx: number) {
    setProposals(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleRegenChar(id: number) {
    setRegenId(id)
    try {
      const res = await fetch(`/api/characters/${id}/regenerate`, { method: 'POST' })
      if (!res.ok) throw new Error('重生成失败')
      const updated = await res.json()
      onCharactersChange(characters.map(c => c.id === id ? { ...c, referenceImageUrl: updated.referenceImageUrl } : c))
    } catch {
    } finally {
      setRegenId(null)
    }
  }

  async function handleRefine(withFeedback = false) {
    if (!name.trim() || !description.trim()) { setError('请填写名称和描述'); return }
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
        body: JSON.stringify({ projectToken: token, name, description, attributes: refineResult.attributes, prompt: refineResult.prompt, type: charType }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '保存失败')
      }
      const newChar = await res.json()
      onCharactersChange([...characters, { ...newChar, attributes: refineResult.attributes }])
      setName(''); setDescription(''); setRefineResult(null); setRefineState('idle')
      setShowManualAdd(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成预览图失败，请重试')
      setRefineState('reviewing')
    }
  }

  function resetForm() {
    setName(''); setDescription(''); setRefineResult(null)
    setRefineState('idle'); setShowFeedback(false); setFeedback(''); setError(null)
    setShowManualAdd(false)
  }

  function removeChar(id: number) {
    fetch(`/api/characters/${id}`, { method: 'DELETE' }).catch(() => {})
    onCharactersChange(characters.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-red-400 text-xs">{error}</p>}

      {/* Approved characters */}
      {characters.length > 0 && (
        <div className="space-y-2">
          {characters.map(char => (
            <div key={char.id} className="flex gap-3 bg-gray-900 border border-gray-800 rounded-lg p-3">
              {char.referenceImageUrl ? (
                <div className="relative w-16 h-20 flex-shrink-0 group/img">
                  <Lightbox src={char.referenceImageUrl} alt={char.name} className="w-full h-full object-cover rounded" />
                  <button
                    onClick={e => { e.stopPropagation(); handleRegenChar(char.id) }}
                    disabled={regenId === char.id}
                    className="absolute bottom-0.5 right-0.5 w-5 h-5 bg-black/70 hover:bg-black rounded flex items-center justify-center text-white text-xs opacity-0 group-hover/img:opacity-100 transition-opacity disabled:opacity-100"
                    title="重新生成"
                  >
                    {regenId === char.id ? <span className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" /> : '↻'}
                  </button>
                </div>
              ) : (
                <div className="w-16 h-20 bg-gray-800 rounded flex-shrink-0 flex items-center justify-center text-gray-600 text-xs">无图</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{char.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300">
                    {char.type === 'background' ? '背景' : '角色'}
                  </span>
                  <span className="text-xs text-green-400">✓ 已通过</span>
                </div>
                <div className="text-xs text-gray-400 mb-1">{char.description}</div>
                <div className="text-xs text-purple-300 bg-indigo-950 border border-purple-900/40 rounded p-1.5 leading-relaxed">{char.prompt}</div>
              </div>
              <button onClick={() => removeChar(char.id)} className="text-gray-600 hover:text-red-400 text-xs self-start">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* AI extracted proposals */}
      {proposals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">AI 提取到 {proposals.length} 个角色，逐一确认后生成参考图：</p>
          {proposals.map((p, i) => (
            <div key={i} className="bg-gray-900 border border-amber-700/40 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{p.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300">
                  {p.type === 'background' ? '背景' : '角色'}
                </span>
                <span className="text-xs text-amber-400">待确认</span>
              </div>
              <div className="text-xs text-gray-400">{p.description}</div>
              {Object.values(p.attributes).some(Boolean) && (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(p.attributes).map(([k, v]) => v ? (
                    <span key={k} className="text-xs px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-gray-300">{v}</span>
                  ) : null)}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => dismissProposal(i)}
                  className="flex-1 py-1.5 text-xs border border-gray-700 rounded-lg text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-colors"
                >
                  删除
                </button>
                <button
                  onClick={() => approveProposal(i)}
                  disabled={approvingIdx === i}
                  className="flex-1 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-white transition-colors"
                >
                  {approvingIdx === i ? '生成中...' : '✓ 通过，生成参考图'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Extract button */}
      {script?.trim() && proposals.length === 0 && !extracting && (
        <button
          onClick={handleExtract}
          className="w-full py-2 text-sm border border-dashed border-purple-700/60 text-purple-400 hover:border-purple-500 hover:text-purple-300 rounded-lg transition-colors"
        >
          ✨ AI 从剧本提取角色
        </button>
      )}

      {extracting && (
        <div className="flex items-center gap-3 py-3">
          <div className="w-4 h-4 border-2 border-purple-700 border-t-purple-300 rounded-full animate-spin" />
          <span className="text-sm text-gray-400">AI 正在分析剧本并提取角色...</span>
        </div>
      )}

      {/* Manual add */}
      {!showManualAdd && refineState === 'idle' && (
        <button
          onClick={() => setShowManualAdd(true)}
          className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-600 rounded-lg transition-colors"
        >
          + 手动添加角色
        </button>
      )}

      {(showManualAdd || refineState !== 'idle') && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-sm font-medium mb-3">
            {refineState === 'idle' ? '手动添加角色 / 背景场景' :
             refineState === 'refining' ? 'AI 润色中...' :
             refineState === 'reviewing' ? '审核润色结果' : '生成预览图中...'}
          </div>

          {refineState === 'idle' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={() => setCharType('character')}
                  className={`px-3 py-1 rounded text-xs border transition-colors ${charType === 'character' ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-700 text-gray-400'}`}>
                  角色
                </button>
                <button onClick={() => setCharType('background')}
                  className={`px-3 py-1 rounded text-xs border transition-colors ${charType === 'background' ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-700 text-gray-400'}`}>
                  背景场景
                </button>
              </div>
              <div>
                <Label>名称</Label>
                <Input value={name} onChange={e => setName(e.target.value)}
                  placeholder={charType === 'character' ? '如：小明' : '如：教室'}
                  className="bg-gray-800 border-gray-700 mt-1" />
              </div>
              <div>
                <Label>描述</Label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder={charType === 'character' ? '如：17岁内向的黑发男高中生，穿着深色校服' : '如：明亮的高中教室，午后阳光透过窗户斜射入内'}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-purple-500 mt-1" />
              </div>
              <div className="flex gap-2">
                <Button onClick={resetForm} variant="outline" className="flex-1 border-gray-700">取消</Button>
                <Button onClick={() => handleRefine(false)} disabled={!name.trim() || !description.trim()}
                  className="flex-1 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600">
                  ✨ AI 润色
                </Button>
              </div>
            </div>
          )}

          {refineState === 'refining' && (
            <div className="flex items-center gap-3 py-4">
              <div className="w-4 h-4 border-2 border-purple-700 border-t-purple-300 rounded-full animate-spin" />
              <span className="text-sm text-gray-400">AI 正在生成关键词...</span>
            </div>
          )}

          {refineState === 'reviewing' && refineResult && (
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1.5">识别到的属性</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(refineResult.attributes).map(([k, v]) => v ? (
                    <span key={k} className="text-xs px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-gray-300">{v}</span>
                  ) : null)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1.5">即梦 Prompt</div>
                <div className="bg-indigo-950 border border-purple-900/40 rounded-lg p-3 text-xs text-purple-200 leading-relaxed">{refineResult.prompt}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowFeedback(true)}
                  className="flex-1 py-2 text-xs border border-gray-700 rounded-lg text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-colors">
                  ✕ 哪里不对
                </button>
                <button onClick={handleApprove}
                  className="flex-1 py-2 text-xs bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors">
                  ✓ 通过，生成预览图
                </button>
              </div>
              {showFeedback && (
                <div className="border-t border-gray-800 pt-3 space-y-2">
                  <Label>哪里需要调整？</Label>
                  <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
                    placeholder="如：头发应该是黑色，不是棕色"
                    rows={2}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-gray-200 resize-none focus:outline-none focus:border-purple-500" />
                  <div className="flex gap-2">
                    <button onClick={() => { setShowFeedback(false); setFeedback('') }}
                      className="flex-1 py-1.5 text-xs border border-gray-700 rounded-lg text-gray-400 hover:text-gray-200">取消</button>
                    <button onClick={() => handleRefine(true)} disabled={!feedback.trim()}
                      className="flex-1 py-1.5 text-xs bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 rounded-lg text-white disabled:opacity-40">
                      ✨ 重新润色
                    </button>
                  </div>
                </div>
              )}
              <button onClick={resetForm} className="w-full text-xs text-gray-600 hover:text-gray-400 pt-1">取消，重新输入</button>
            </div>
          )}

          {refineState === 'generating' && (
            <div className="flex items-center gap-3 py-4">
              <div className="w-4 h-4 border-2 border-purple-700 border-t-purple-300 rounded-full animate-spin" />
              <div>
                <div className="text-sm text-gray-300">正在生成角色预览图...</div>
                <div className="text-xs text-gray-500 mt-0.5">调用即梦 API，约需 10-20 秒</div>
              </div>
            </div>
          )}
        </div>
      )}

      {refineState === 'idle' && characters.length === 0 && proposals.length === 0 && !showManualAdd && (
        <p className="text-xs text-gray-600 text-center">角色设定可选，添加后 AI 将保持角色形象一致</p>
      )}
    </div>
  )
}
