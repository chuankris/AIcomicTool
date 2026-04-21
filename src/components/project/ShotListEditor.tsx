'use client'
import { useState } from 'react'
import type { Shot } from '@/types'

interface Props {
  projectToken: string
  initialShots: Shot[]
  onShotsChange: (shots: Shot[]) => void
}

type State = 'idle' | 'generating' | 'done'

export default function ShotListEditor({ projectToken, initialShots, onShotsChange }: Props) {
  const [shots, setShots] = useState<Shot[]>(initialShots)
  const [state, setState] = useState<State>(initialShots.length > 0 ? 'done' : 'idle')
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setState('generating')
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectToken}/generate-shots`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '生成失败')
      }
      const { shots: newShots } = await res.json()
      setShots(newShots)
      onShotsChange(newShots)
      setState('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
      setState('idle')
    }
  }

  function updateShot(index: number, field: 'sceneDesc' | 'dialogue', value: string) {
    const updated = shots.map(s => s.index === index ? { ...s, [field]: value } : s)
    setShots(updated)
    onShotsChange(updated)
    // persist to backend
    fetch(`/api/projects/${projectToken}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shots: updated }),
    })
  }

  if (state === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">正在分析剧本，生成分镜脚本...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {shots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="text-4xl">🎬</div>
          <p className="text-sm text-gray-500">AI 将自动把剧本拆解为分镜列表</p>
          <button
            onClick={generate}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium text-white transition-colors"
          >
            ✨ AI 生成分镜脚本
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">共 {shots.length} 格分镜</p>
            <button
              onClick={generate}
              className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-500 rounded px-3 py-1 transition-colors"
            >
              ↻ 重新生成
            </button>
          </div>
          <div className="space-y-2">
            {shots.map(shot => (
              <div key={shot.index} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono text-gray-600 bg-gray-800 rounded px-1.5 py-0.5 mt-0.5 shrink-0">
                    #{shot.index}
                  </span>
                  <div className="flex-1 space-y-2">
                    <input
                      value={shot.sceneDesc}
                      onChange={e => updateShot(shot.index, 'sceneDesc', e.target.value)}
                      className="w-full bg-transparent text-sm text-gray-200 border-b border-gray-700 focus:border-violet-500 outline-none pb-1 transition-colors"
                      placeholder="场景描述"
                    />
                    {shot.dialogue && (
                      <input
                        value={shot.dialogue}
                        onChange={e => updateShot(shot.index, 'dialogue', e.target.value)}
                        className="w-full bg-transparent text-xs text-gray-400 border-b border-gray-800 focus:border-violet-500 outline-none pb-1 transition-colors"
                        placeholder="台词"
                      />
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {shot.characters.map(c => (
                        <span key={c} className="text-xs px-2 py-0.5 bg-violet-900/30 text-violet-300 border border-violet-800/50 rounded-full">
                          {c}
                        </span>
                      ))}
                      <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-500 rounded-full">{shot.emotion}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-500 rounded-full">{shot.composition}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
