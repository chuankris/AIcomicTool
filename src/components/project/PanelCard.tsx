// src/components/project/PanelCard.tsx
import type { Panel } from '@/types'

interface Props {
  panel: Panel
  isSelected: boolean
  onToggleSelect: (id: number) => void
  reviewMode: boolean
}

export function PanelCard({ panel, isSelected, onToggleSelect, reviewMode }: Props) {
  const statusColors: Record<Panel['status'], string> = {
    pending: 'border-gray-700',
    generating: 'border-yellow-600 animate-pulse',
    done: 'border-gray-700',
    failed: 'border-red-700',
  }

  return (
    <div
      onClick={() => reviewMode && onToggleSelect(panel.id)}
      className={`relative rounded-lg border-2 overflow-hidden bg-gray-900 transition-all ${statusColors[panel.status]} ${
        reviewMode ? 'cursor-pointer' : ''
      } ${isSelected ? 'ring-2 ring-red-500 border-red-500' : ''}`}
    >
      <div className="aspect-[9/16]">
        {panel.status === 'done' && panel.imageUrl ? (
          <img src={panel.imageUrl} alt={`分镜 ${panel.index}`} className="w-full h-full object-cover" />
        ) : panel.status === 'generating' ? (
          <div className="w-full h-full flex items-center justify-center text-yellow-500 text-sm">生成中...</div>
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
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">x</div>
      )}
      <div className="absolute top-2 left-2 bg-black/50 px-1.5 py-0.5 rounded text-xs text-gray-300">
        #{panel.index}
      </div>
    </div>
  )
}
