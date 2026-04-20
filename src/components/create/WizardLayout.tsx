// src/components/create/WizardLayout.tsx
'use client'
import React from 'react'

interface WizardLayoutProps {
  currentStep: 1 | 2 | 3
  children: React.ReactNode
}

const STEPS = ['角色 & 剧本', '风格 & 模型', '确认生成']

export function WizardLayout({ currentStep, children }: WizardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-xl font-bold text-purple-400">漫剧生成器</h1>
      </header>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-10">
          {STEPS.map((label, i) => {
            const step = (i + 1) as 1 | 2 | 3
            const isActive = step === currentStep
            const isDone = step < currentStep
            return (
              <div key={step} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive ? 'bg-purple-600 text-white' :
                  isDone ? 'bg-purple-900/50 text-purple-300' :
                  'border border-gray-700 text-gray-500'
                }`}>
                  <span>{step}</span>
                  <span>{label}</span>
                </div>
                {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-700" />}
              </div>
            )
          })}
        </div>
        {children}
      </div>
    </div>
  )
}
