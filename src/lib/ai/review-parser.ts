import { callModel } from './model-client'
import type { ModelConfig } from '@/types'

const SYSTEM_PROMPT = `你是一个漫画 prompt 优化专家。用户会提供某个分镜的当前 prompt 和他的修改意见，你需要输出一个修改后的 prompt。

规则：
1. 只修改用户反馈涉及的部分，其他保持不变
2. 保留【】格式的角色特征锁定词
3. 输出长度控制在 40 词（80 汉字）以内
4. 只返回修改后的 prompt，不要解释`

export async function applyReviewFeedback(params: {
  currentPrompt: string
  feedback: string
  modelConfig: ModelConfig
}): Promise<string> {
  const { currentPrompt, feedback, modelConfig } = params
  const userMessage = `当前 prompt：${currentPrompt}\n\n用户反馈：${feedback}\n\n请输出修改后的 prompt：`
  const result = await callModel(modelConfig, SYSTEM_PROMPT, userMessage)
  return result.trim()
}
