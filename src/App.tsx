import { TTSControls } from "@/components/tts-controls";

function Background() {
  return (
    <svg
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1440 900"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="oklch(0.928 0.006 264.531)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="oklch(0.928 0.006 264.531)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="g2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="oklch(0.922 0.034 249.2)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="oklch(0.922 0.034 249.2)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="g3" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.87 0.034 264)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="oklch(0.87 0.034 264)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="g4" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.928 0.024 255)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="oklch(0.928 0.024 255)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 500 Q 200 300, 500 450 T 1000 350 T 1440 400 L 1440 900 L 0 900 Z" fill="url(#g1)" />
      <path d="M1440 200 Q 1200 400, 900 350 T 400 500 T 0 450 L 0 900 L 1440 900 Z" fill="url(#g2)" />
      <circle cx="200" cy="650" r="300" fill="url(#g3)" opacity="0.6" />
      <circle cx="1200" cy="550" r="250" fill="url(#g4)" opacity="0.7" />
      <ellipse cx="720" cy="800" rx="500" ry="120" fill="url(#g1)" opacity="0.4" />
    </svg>
  );
}

export default function App() {
  return (
    <div className="min-h-dvh flex flex-col bg-transparent">
      <Background />

      <header className="relative border-b bg-white/70 dark:bg-neutral-950/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M11.553 3.064A.75.75 0 0112 3.75v16.5a.75.75 0 01-1.255.555L5.46 16H2.75A.75.75 0 012 15.25v-6.5A.75.75 0 012.75 8h2.71l5.285-4.805a.75.75 0 01.808-.131zM14.53 8.47a.75.75 0 011.06 0 4.5 4.5 0 010 6.36.75.75 0 01-1.06-1.06 3 3 0 000-4.24.75.75 0 010-1.06z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Wayne</h1>
              <p className="text-xs text-muted-foreground">Text to Speech</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative flex-1 mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            文字转语音
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            输入文字，选择音色和语速，一键生成自然语音。<br />支持下载 WAV 音频和 SRT 字幕文件。
          </p>
        </div>

        <div className="rounded-xl border bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl shadow-lg shadow-black/5 dark:shadow-black/20">
          <div className="p-6 sm:p-8">
            <TTSControls />
          </div>
        </div>
      </main>

      <footer className="relative border-t bg-white/70 dark:bg-neutral-950/70 backdrop-blur-md py-6 text-center text-xs text-muted-foreground">
        Wayne &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
