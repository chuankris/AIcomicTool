'use client'
import { useState, useRef, useEffect } from 'react'
import type { ImageModel } from '@/types'

const IMAGE_MODELS: { id: ImageModel; label: string; vendor: string; hint: string }[] = [
  { id: 'jimeng', label: '即梦', vendor: '火山引擎', hint: '默认' },
  { id: 'mj-niji', label: 'Midjourney niji', vendor: 'Midjourney', hint: '日漫风（即将支持）' },
  { id: 'sd-xl', label: 'SD XL', vendor: 'Stability AI', hint: '写实（即将支持）' },
  { id: 'kling', label: '可灵', vendor: '快手', hint: '国风（即将支持）' },
]

interface Props {
  current: ImageModel
  onChange: (m: ImageModel) => void
}

export default function ModelSwitcherMenu({ current, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const currentModel = IMAGE_MODELS.find(m => m.id === current) ?? IMAGE_MODELS[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="px-2 py-1 text-xs text-gray-400 hover:text-white bg-black/60 rounded transition-colors"
        title="切换图像模型"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-1 w-52 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {IMAGE_MODELS.map(m => (
            <button
              key={m.id}
              onClick={() => { onChange(m.id); setOpen(false) }}
              className={`w-full text-left px-3 py-2.5 hover:bg-gray-800 transition-colors ${
                m.id === current ? 'bg-gray-800' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${m.id === current ? 'text-violet-300' : 'text-gray-200'}`}>
                  {m.label}
                </span>
                {m.id === current && <span className="text-xs text-violet-500">✓</span>}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">{m.vendor} · {m.hint}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
