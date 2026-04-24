'use client'

import { useState } from 'react'
import { Check, FileText, Save, Sparkles, X } from 'lucide-react'

interface Props {
  token: string
  initialScript: string
  onSave: (script: string) => void
}

export function ScriptEditor({ token, initialScript, onSave }: Props) {
  const [script, setScript] = useState(initialScript)
  const [optimizedScript, setOptimizedScript] = useState<string | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const hasPreview = Boolean(optimizedScript)

  async function handleOptimize() {
    if (!script.trim()) {
      setError('请先输入剧本内容')
      return
    }
    setError(null)
    setIsOptimizing(true)
    setOptimizedScript(null)
    try {
      const res = await fetch('/api/ai/optimize-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, script }),
      })
      if (!res.ok) throw new Error('优化失败')
      const data = await res.json()
      setOptimizedScript(data.optimizedScript)
    } catch (e) {
      setError(e instanceof Error ? e.message : '优化失败，请重试')
    } finally {
      setIsOptimizing(false)
    }
  }

  function acceptOptimized() {
    if (!optimizedScript) return
    setScript(optimizedScript)
    setOptimizedScript(null)
    setSaved(false)
  }

  async function handleSave() {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script }),
      })
      if (!res.ok) throw new Error('保存失败')
      onSave(script)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-cyan-300" />
            <h2 className="text-sm font-semibold text-gray-100">故事剧本</h2>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500">
            先把故事文本整理清楚。AI 优化只会生成一个候选版本，采用后才会替换编辑区内容。
          </p>
        </div>
        {saved && (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">
            已保存
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-2">
          <textarea
            value={script}
            onChange={e => {
              setScript(e.target.value)
              setSaved(false)
            }}
            placeholder={`小明走进教室，看到小红坐在窗边。\n小明：你今天来得真早。\n小红：（微笑）昨晚没睡好，来这里待着。\n小明：（坐下）要不要一起吃早饭？`}
            rows={18}
            className="min-h-[420px] w-full resize-none rounded-lg border border-gray-800 bg-gray-900/80 p-4 text-sm leading-relaxed text-gray-200 outline-none transition-colors placeholder:text-gray-700 focus:border-cyan-500/70"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-gray-600">{script.length} 字</span>
            <div className="flex gap-2">
              <button
                onClick={handleOptimize}
                disabled={isOptimizing || !script.trim()}
                className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 transition-colors hover:border-cyan-400/60 hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isOptimizing ? (
                  <span className="h-3 w-3 rounded-full border border-cyan-300 border-t-transparent animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {isOptimizing ? '优化中' : 'AI 优化'}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                  <span className="h-3 w-3 rounded-full border border-gray-700 border-t-transparent animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {isSaving ? '保存中' : '保存剧本'}
              </button>
            </div>
          </div>
        </div>

        <aside className="rounded-lg border border-gray-800 bg-gray-900/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-medium text-gray-200">优化预览</h3>
              <p className="mt-1 text-xs text-gray-600">确认后再采用，不会自动覆盖原文。</p>
            </div>
            {hasPreview && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">
                待确认
              </span>
            )}
          </div>

          {isOptimizing && (
            <div className="flex min-h-[260px] items-center justify-center rounded-md border border-dashed border-gray-800 bg-gray-950/50">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="h-3.5 w-3.5 rounded-full border border-cyan-300 border-t-transparent animate-spin" />
                AI 正在整理节奏、动作和场景细节
              </div>
            </div>
          )}

          {!isOptimizing && !optimizedScript && (
            <div className="flex min-h-[260px] items-center justify-center rounded-md border border-dashed border-gray-800 bg-gray-950/40 px-6 text-center text-xs leading-relaxed text-gray-600">
              点击 AI 优化后，这里会显示候选剧本。你可以对比阅读，再决定是否采用。
            </div>
          )}

          {optimizedScript && (
            <div className="space-y-3">
              <div className="max-h-[360px] overflow-y-auto rounded-md border border-cyan-500/20 bg-cyan-950/20 p-3 text-xs leading-relaxed text-cyan-50/90 whitespace-pre-wrap">
                {optimizedScript}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setOptimizedScript(null)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-700 px-3 py-2 text-xs text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-200"
                >
                  <X className="h-3.5 w-3.5" />
                  忽略
                </button>
                <button
                  onClick={acceptOptimized}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-cyan-400 px-3 py-2 text-xs font-medium text-gray-950 transition-colors hover:bg-cyan-300"
                >
                  <Check className="h-3.5 w-3.5" />
                  采用到编辑区
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
