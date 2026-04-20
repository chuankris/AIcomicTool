'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { WizardLayout } from '@/components/create/WizardLayout'
import { Step2StyleModel } from '@/components/create/Step2StyleModel'
import { Step1Characters } from '@/components/create/Step1Characters'
import type { CharacterEntry } from '@/components/create/Step1Characters'
import type { ModelConfig } from '@/types'

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  provider: 'claude',
  baseURL: 'https://api.anthropic.com/v1',
  apiKey: '',
  model: 'claude-sonnet-4-6',
}

export default function CreatePage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [script, setScript] = useState('')
  const [style, setStyle] = useState('日漫')
  const [modelConfig, setModelConfig] = useState<ModelConfig>(DEFAULT_MODEL_CONFIG)
  const [characters, setCharacters] = useState<CharacterEntry[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, style, modelConfig }),
      })
      if (!res.ok) throw new Error('创建项目失败，请检查配置后重试')
      const { token } = await res.json()
      localStorage.setItem('manga_token', token)

      const genRes = await fetch(`/api/projects/${token}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterDescriptions: characters }),
      })
      if (!genRes.ok) throw new Error('触发生成失败，请在项目页面重试')
      router.push(`/project/${token}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '发生未知错误，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <WizardLayout currentStep={step}>
      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">输入你的故事剧本</h2>
          <textarea
            value={script}
            onChange={e => setScript(e.target.value)}
            placeholder={`小明走进教室，看到小红坐在窗边。\n小明：你今天来得真早。\n小红：（微笑）昨晚没睡好，来这里待着。`}
            className="w-full h-64 bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={() => setStep(2)}
            disabled={!script.trim()}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-lg text-sm font-medium transition-colors"
          >
            下一步
          </button>
        </div>
      )}
      {step === 2 && (
        <Step2StyleModel
          selectedStyle={style} onStyleChange={setStyle}
          modelConfig={modelConfig} onModelConfigChange={setModelConfig}
          onNext={() => setStep(3)} onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">确认并开始生成</h2>
          <div className="bg-gray-900 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">风格</span><span>{style}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">模型</span><span>{modelConfig.provider}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">剧本长度</span><span>{script.length} 字</span></div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="px-6 py-3 border border-gray-700 rounded-lg text-sm">上一步</button>
            <button
              onClick={handleGenerate}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-lg text-sm font-medium"
            >
              {isSubmitting ? '创建中...' : '开始生成'}
            </button>
          </div>
        </div>
      )}
    </WizardLayout>
  )
}
