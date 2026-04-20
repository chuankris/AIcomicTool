import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-xl font-bold text-purple-400">漫剧生成器</h1>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-8">
        <div>
          <h2 className="text-4xl font-bold mb-4">用 AI 创作你的漫剧</h2>
          <p className="text-gray-400 text-lg max-w-md">
            输入故事剧本，AI 自动生成分镜画面，批量审核修改，打造角色外貌一致的漫剧作品
          </p>
        </div>
        <div className="flex gap-4 text-sm text-gray-500">
          <span>无需登录</span>
          <span>多种漫画风格</span>
          <span>角色外貌一致</span>
          <span>批量审核修改</span>
        </div>
        <Link href="/create"
          className="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-xl text-lg font-medium transition-colors">
          开始创作
        </Link>
      </main>
    </div>
  )
}
