export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return '未知错误'
  }
}

export function formatGenerationError(error: unknown): string {
  const message = formatErrorMessage(error)
  return message.length > 1000 ? `${message.slice(0, 1000)}...` : message
}
