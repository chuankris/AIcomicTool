'use client'
import { useState } from 'react'

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

  async function handleOptimize() {
    if (!script.trim()) { setError('请先输入剧本内容'); return }
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
    if (optimizedScript) {
      setScript(optimizedScript)
      setOptimizedScript(null)
    }
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
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold mb-1">故事剧本</h2>
        <p className="text-xs text-gray-500 mb-3">
          支持多角色对话，格式：角色名：（动作）台词。点击「AI 优化」自动补充场景描述和动作细节。
        </p>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex gap-4 items-start">
        <div className="flex-1">
          <textarea
            value={script}
            onChange={e => { setScript(e.target.value); setSaved(false) }}
            placeholder={`小明走进教室，看到小红坐在窗边。\n小明：你今天来得真早。\n小红：（微笑）昨晚没睡好，来这里待着。\n小明：（坐下）要不要一起吃早饭？`}
            rows={16}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm text-gray-200 resize-none focus:outline-none focus:border-purple-500 leading-relaxed"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-600">{script.length} 字</span>
            <div className="flex gap-2">
              <button onClick={handleOptimize} disabled={isOptimizing || !script.trim()}
                className="px-3 py-1.5 text-xs bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 rounded-lg text-white disabled:opacity-40 flex items-center gap-1.5">
                {isOptimizing ? (
                  <><div className="w-3 h-3 border border-purple-300 border-t-transparent rounded-full animate-spin" />优化中...</>
                ) : '✨ AI 优化'}
              </button>
              <button onClick={handleSave} disabled={isSaving}
                className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 rounded-lg text-white disabled:opacity-40">
                {isSaving ? '保存中...' : saved ? '✓ 已保存' : '保存'}
              </button>
            </div>
          </div>
        </div>

        {(isOptimizing || optimizedScript) && (
          <div className="w-72 flex-shrink-0">
            <div className="bg-gray-900 border border-purple-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                {isOptimizing ? (
                  <><div className="w-3 h-3 border border-purple-300 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-gray-400">AI 优化中...</span></>
                ) : (
                  <span className="text-xs font-medium text-purple-300">✨ 优化版本</span>
                )}
              </div>
              {optimizedScript && (
                <>
                  <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto bg-indigo-950 border border-purple-900/30 rounded p-2 mb-3">
                    {optimizedScript}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setOptimizedScript(null)}
                      className="flex-1 py-1.5 text-xs border border-gray-700 rounded-lg text-gray-400 hover:text-gray-200">
                      忽略
                    </button>
                    <button onClick={acceptOptimized}
                      className="flex-1 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 rounded-lg text-white">
                      ✓ 采用
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
