// src/components/create/Step2StyleModel.tsx
'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ModelConfig } from '@/types'

const STYLES = ['日漫', '韩漫', '美漫', '国风']
const PROVIDERS = [
  { id: 'claude', label: 'Claude', baseURL: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-6' },
  { id: 'openai', label: 'GPT-4o', baseURL: 'https://api.openai.com/v1', model: 'gpt-4o' },
  { id: 'gemini', label: 'Gemini', baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-1.5-pro' },
  { id: 'custom', label: '自定义 Endpoint', baseURL: '', model: '' },
] as const

interface Props {
  selectedStyle: string
  onStyleChange: (s: string) => void
  modelConfig: ModelConfig
  onModelConfigChange: (c: ModelConfig) => void
  onNext: () => void
  onBack: () => void
}

export function Step2StyleModel({ selectedStyle, onStyleChange, modelConfig, onModelConfigChange, onNext, onBack }: Props) {
  function handleProviderChange(providerId: string) {
    const preset = PROVIDERS.find(p => p.id === providerId)
    if (!preset) return
    onModelConfigChange({
      provider: preset.id as ModelConfig['provider'],
      baseURL: preset.baseURL,
      model: preset.model,
      apiKey: modelConfig.apiKey,
    })
  }

  const canProceed = !!selectedStyle && !!modelConfig.apiKey

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-4">选择漫画风格</h2>
        <div className="grid grid-cols-4 gap-3">
          {STYLES.map(style => (
            <button key={style} onClick={() => onStyleChange(style)}
              className={`py-3 rounded-lg border text-sm font-medium transition-colors ${
                selectedStyle === style
                  ? 'border-purple-500 bg-purple-900/40 text-purple-300'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}>
              {style}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">配置 AI 模型</h2>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {PROVIDERS.map(p => (
            <button key={p.id} onClick={() => handleProviderChange(p.id)}
              className={`py-2 rounded-lg border text-sm transition-colors ${
                modelConfig.provider === p.id
                  ? 'border-purple-500 bg-purple-900/40 text-purple-300'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {modelConfig.provider === 'custom' && (
            <>
              <div>
                <Label>Base URL</Label>
                <Input placeholder="http://localhost:11434/v1" value={modelConfig.baseURL}
                  onChange={e => onModelConfigChange({ ...modelConfig, baseURL: e.target.value })}
                  className="bg-gray-900 border-gray-700 mt-1" />
              </div>
              <div>
                <Label>Model Name</Label>
                <Input placeholder="llama3" value={modelConfig.model}
                  onChange={e => onModelConfigChange({ ...modelConfig, model: e.target.value })}
                  className="bg-gray-900 border-gray-700 mt-1" />
              </div>
            </>
          )}
          <div>
            <Label>API Key</Label>
            <Input type="password" placeholder="sk-..." value={modelConfig.apiKey}
              onChange={e => onModelConfigChange({ ...modelConfig, apiKey: e.target.value })}
              className="bg-gray-900 border-gray-700 mt-1" />
            <p className="text-xs text-gray-500 mt-1">仅用于生成请求，不会显示给其他用户</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onBack} className="border-gray-700">上一步</Button>
        <Button onClick={onNext} disabled={!canProceed} className="flex-1 bg-purple-600 hover:bg-purple-700">
          下一步
        </Button>
      </div>
    </div>
  )
}
