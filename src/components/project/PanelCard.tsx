// src/components/project/PanelCard.tsx
'use client'
import { useState } from 'react'
import type { Panel, ImageModel } from '@/types'
import ModelSwitcherMenu from '@/components/ui/ModelSwitcherMenu'

interface Props {
  panel: Panel
  isSelected: boolean
  onToggleSelect: (id: number) => void
  reviewMode: boolean
  selected?: boolean
  onSelect?: (id: number) => void
  onRegenerate?: (id: number) => void
  onModelChange?: (id: number, model: ImageModel) => void
}

export function PanelCard({
  panel,
  isSelected,
  onToggleSelect,
  reviewMode,
  selected,
  onSelect,
  onRegenerate,
  onModelChange,
}: Props) {
  const [localStatus, setLocalStatus] = useState<Panel['status']>(panel.status)

  const effectiveSelected = selected ?? isSelected

  const statusColors: Record<Panel['status'], string> = {
    pending: 'border-gray-700',
    generating: 'border-yellow-600 animate-pulse',
    done: 'border-gray-700',
    failed: 'border-red-700',
  }

  const displayStatus = localStatus !== panel.status ? localStatus : panel.status

  function handleRegenerate() {
    setLocalStatus('generating')
    onRegenerate?.(panel.id)
  }

  return (
    <div
      onClick={() => {
        if (reviewMode) {
          onToggleSelect(panel.id)
          onSelect?.(panel.id)
        }
      }}
      className={`relative rounded-lg border-2 overflow-hidden bg-gray-900 transition-all group ${
        effectiveSelected ? 'border-red-500 ring-2 ring-red-500' : statusColors[displayStatus]
      } ${reviewMode ? 'cursor-pointer' : ''}`}
    >
      <div className="aspect-[9/16]">
        {displayStatus === 'generating' ? (
          <div className="w-full h-full flex items-center justify-center text-yellow-500 text-sm">生成中...</div>
        ) : panel.status === 'done' && panel.imageUrl ? (
          <img src={panel.imageUrl} alt={`分镜 ${panel.index}`} className="w-full h-full object-cover" />
        ) : panel.status === 'failed' ? (
          <div className="w-full h-full flex items-center justify-center text-red-500 text-sm">生成失败</div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">等待中</div>
        )}
      </div>

      {panel.dialogue && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1 text-xs text-white">
          {panel.dialogue}
        </div>
      )}

      {reviewMode && (
        <div className="absolute top-2 left-2 w-5 h-5 rounded border-2 border-gray-400 bg-black/50 flex items-center justify-center">
          {effectiveSelected && <span className="text-white text-xs">✓</span>}
        </div>
      )}

      {effectiveSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">✕</div>
      )}

      <div className="absolute top-2 left-2 bg-black/50 px-1.5 py-0.5 rounded text-xs text-gray-300"
        style={{ display: reviewMode ? 'none' : undefined }}
      >
        #{panel.index}
      </div>

      {!reviewMode && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-1.5 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); handleRegenerate() }}
            className="text-xs text-gray-300 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
            title="重新生成"
          >↻</button>
          <ModelSwitcherMenu
            current={(panel.imageModel as ImageModel) || 'jimeng'}
            onChange={model => onModelChange?.(panel.id, model)}
          />
        </div>
      )}
    </div>
  )
}
