import BackButton from '@/app/components/ui/BackButton'

const GAME_URL = 'https://xyh5.163.com/game/'

export default function FantasyWestwardJourneyPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#713f12_0,_#172554_34%,_#020617_100%)] px-3 pb-20 pt-[max(1rem,env(safe-area-inset-top))] text-white md:h-dvh md:min-h-0 md:overflow-hidden md:px-6 md:pb-4">
      <div className="mx-auto flex min-h-full max-w-[1600px] flex-col md:h-full">
        <header className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
          <BackButton
            className="mb-0 border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-amber-200"
          />

          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.3em] text-amber-300">
              网易官方网页游戏
            </p>
            <h1 className="mt-1 text-2xl font-black text-amber-100 md:text-3xl">
              梦幻西游网页版
            </h1>
          </div>

          <a
            href={GAME_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-amber-400 px-5 py-2 font-bold text-slate-950 transition-colors hover:bg-amber-300"
          >
            新窗口打开官网
            <span className="ml-2" aria-hidden="true">
              ↗
            </span>
          </a>
        </header>

        <section className="flex min-h-[680px] flex-col overflow-hidden rounded-2xl border border-amber-300/40 bg-slate-950 shadow-2xl md:min-h-0 md:flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/5 px-4 py-3 text-sm">
            <p className="text-slate-200">
              游戏内容、登录与账号数据均由网易官方页面提供和处理。
            </p>
            <p className="text-amber-200">
              若下方无法显示，请使用右上角按钮打开官网。
            </p>
          </div>

          <iframe
            src={GAME_URL}
            title="梦幻西游网页版官方游戏"
            className="min-h-0 w-full flex-1 bg-black"
            allow="autoplay; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </section>

        <p className="mx-auto mt-3 max-w-4xl shrink-0 text-center text-xs leading-5 text-slate-400">
          本页面仅提供通往网易官方游戏的嵌入入口，不代理游戏服务，也不会读取或保存你的网易账号、密码或游戏数据。
          第三方浏览器 Cookie、登录策略或官方页面的安全设置可能限制站内显示。
        </p>
      </div>
    </main>
  )
}
