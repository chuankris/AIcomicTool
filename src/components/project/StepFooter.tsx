'use client'

interface Props {
  step: number
  totalSteps?: number
  onPrev?: () => void
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  hint?: string
  extraAction?: React.ReactNode
}

export default function StepFooter({
  step,
  totalSteps = 5,
  onPrev,
  onNext,
  nextLabel,
  nextDisabled = false,
  hint,
  extraAction,
}: Props) {
  const isFirst = step === 0
  const isLast = step === totalSteps - 1
  const label = nextLabel ?? (isLast ? '完成' : '下一步 →')

  return (
    <div className="border-t border-gray-800 px-6 py-3 flex items-center justify-between bg-gray-950">
      <div className="flex items-center gap-3">
        {!isFirst && (
          <button
            onClick={onPrev}
            className="px-4 py-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors"
          >
            ← 上一步
          </button>
        )}
        {hint && <span className="text-xs text-gray-600">{hint}</span>}
      </div>
      <div className="flex items-center gap-2">
        {extraAction}
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className="px-4 py-1.5 text-sm font-medium bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-lg transition-colors"
        >
          {label}
        </button>
      </div>
    </div>
  )
}
