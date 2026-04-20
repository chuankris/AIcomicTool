// src/components/create/Step1Characters.tsx
'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import type { ModelConfig } from '@/types'

export interface CharacterEntry {
  name: string
  description: string
  type: 'character' | 'background'
}

interface Props {
  script: string
  onScriptChange: (s: string) => void
  characters: CharacterEntry[]
  onCharactersChange: (chars: CharacterEntry[]) => void
  onNext: () => void
  modelConfig: ModelConfig
}

export function Step1Characters({ script, onScriptChange, characters, onCharactersChange, onNext }: Props) {
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newType, setNewType] = useState<'character' | 'background'>('character')

  function addCharacter() {
    if (!newName.trim() || !newDesc.trim()) return
    onCharactersChange([...characters, { name: newName.trim(), description: newDesc.trim(), type: newType }])
    setNewName('')
    setNewDesc('')
  }

  function removeCharacter(index: number) {
    onCharactersChange(characters.filter((_, i) => i !== index))
  }

  const canProceed = script.trim().length > 0

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-1">角色设定 <span className="text-gray-500 text-sm font-normal">（可选，提高角色一致性）</span></h2>
        <p className="text-xs text-gray-500 mb-4">用自然语言描述角色外貌，AI 将在生成时保持角色形象一致</p>
        <div className="space-y-3 mb-4">
          {characters.map((char, i) => (
            <div key={i} className="flex items-start gap-3 bg-gray-900 rounded-lg p-3 border border-gray-700">
              <div className="flex-1">
                <div className="font-medium text-sm">{char.name} <span className="text-gray-500 text-xs">{char.type === 'background' ? '（背景场景）' : ''}</span></div>
                <div className="text-xs text-gray-400 mt-0.5">{char.description}</div>
              </div>
              <button onClick={() => removeCharacter(i)} className="text-gray-600 hover:text-red-400 text-xs">删除</button>
            </div>
          ))}
        </div>
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setNewType('character')}
              className={`px-3 py-1 rounded text-xs ${newType === 'character' ? 'bg-purple-600 text-white' : 'border border-gray-700 text-gray-400'}`}>
              角色
            </button>
            <button onClick={() => setNewType('background')}
              className={`px-3 py-1 rounded text-xs ${newType === 'background' ? 'bg-purple-600 text-white' : 'border border-gray-700 text-gray-400'}`}>
              背景场景
            </button>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder={newType === 'character' ? '角色名（如：小明）' : '场景名（如：教室）'}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="bg-gray-800 border-gray-600 text-sm w-32"
            />
            <Input
              placeholder={newType === 'character' ? '外貌描述（如：17岁黑发内向男生）' : '场景描述（如：明亮的高中教室，午后阳光）'}
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              className="bg-gray-800 border-gray-600 text-sm flex-1"
            />
            <Button onClick={addCharacter} disabled={!newName.trim() || !newDesc.trim()}
              className="bg-purple-600 hover:bg-purple-700 shrink-0">添加</Button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-1">故事剧本</h2>
        <p className="text-xs text-gray-500 mb-3">支持多角色对话格式，角色名用「角色：台词」格式</p>
        <textarea
          value={script}
          onChange={e => onScriptChange(e.target.value)}
          placeholder={`小明走进教室，看到小红坐在窗边。\n小明：你今天来得真早。\n小红：（微笑）昨晚没睡好，来这里待着。`}
          className="w-full h-56 bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-purple-500"
        />
        <div className="text-xs text-gray-600 text-right mt-1">{script.length} 字</div>
      </div>

      <Button onClick={onNext} disabled={!canProceed} className="w-full bg-purple-600 hover:bg-purple-700">
        下一步
      </Button>
    </div>
  )
}
