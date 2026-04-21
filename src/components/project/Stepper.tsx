'use client'

const STEPS = ['剧本', '角色', '分镜脚本', '出图', '配音 & 导出']

interface Props {
  currentStep: number
  furthestStep: number
  onStepClick: (i: number) => void
}

export default function Stepper({ currentStep, furthestStep, onStepClick }: Props) {
  return (
    <div className="flex items-center px-6 py-3 border-b border-gray-800 bg-gray-950">
      {STEPS.map((label, i) => {
        const done = i < currentStep
        const active = i === currentStep
        const reachable = i <= furthestStep
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <button
              onClick={() => reachable && onStepClick(i)}
              disabled={!reachable}
              className="flex flex-col items-center gap-1 min-w-0"
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                done ? 'bg-violet-600 text-white'
                : active ? 'bg-violet-600 text-white ring-2 ring-violet-400 ring-offset-1 ring-offset-gray-950'
                : reachable ? 'bg-gray-800 text-gray-300'
                : 'bg-gray-900 text-gray-600'
              }`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-xs whitespace-nowrap ${
                active ? 'text-violet-400 font-medium'
                : done ? 'text-gray-400'
                : reachable ? 'text-gray-500'
                : 'text-gray-700'
              }`}>{label}</span>
            </button>
            {/* Connector line between steps */}
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 mb-4 transition-colors ${
                i < currentStep ? 'bg-violet-600' : 'bg-gray-800'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
