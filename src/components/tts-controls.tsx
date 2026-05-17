import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Sparkles,
  FileAudio,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Settings2,
  X,
} from "lucide-react";

interface VoiceItem {
  id: string;
  name: string;
  desc: string;
  category: string;
}

const FALLBACK_VOICES: VoiceItem[] = [
  { id: "gentle-female", name: "温柔女声", desc: "柔和细腻的成年女声", category: "女声" },
  { id: "sweet-girl", name: "甜美少女", desc: "甜美青春的少女音", category: "女声" },
  { id: "mature-woman", name: "知性御姐", desc: "成熟稳重的御姐音", category: "女声" },
  { id: "loli-voice", name: "可爱萝莉", desc: "活泼可爱的萝莉音", category: "女声" },
  { id: "energetic-girl", name: "活力少女", desc: "元气满满的活力女声", category: "女声" },
  { id: "warm-mom", name: "温暖母亲", desc: "温柔慈祥的女中音", category: "女声" },
  { id: "magnetic-male", name: "磁性男声", desc: "低沉富有磁性的男声", category: "男声" },
  { id: "sunshine-boy", name: "阳光少年", desc: "清爽阳光的少年音", category: "男声" },
  { id: "steady-uncle", name: "沉稳大叔", desc: "稳重成熟的中年男声", category: "男声" },
  { id: "deep-man", name: "低音炮男声", desc: "浑厚深沉的男低音", category: "男声" },
  { id: "broadcast-host", name: "播音主持", desc: "标准的播音腔", category: "专业风格" },
  { id: "news-anchor", name: "新闻联播", desc: "严谨正式的新闻播音风格", category: "专业风格" },
  { id: "emotional-radio", name: "情感电台", desc: "温暖治愈的电台风格", category: "专业风格" },
  { id: "storytelling", name: "评书讲故事", desc: "富有表现力的讲故事风格", category: "专业风格" },
  { id: "douyin-popular", name: "抖音热门女声", desc: "抖音常见的热门AI女声", category: "抖音风格" },
  { id: "douyin-funny", name: "抖音搞笑男声", desc: "抖音常见的搞笑解说男声", category: "抖音风格" },
  { id: "douyin-warm", name: "抖音治愈女声", desc: "抖音流行的温暖治愈女声", category: "抖音风格" },
  { id: "douyin-trendy", name: "抖音潮流男声", desc: "抖音潮流男声，适合Vlog", category: "抖音风格" },
];

function formatSRTTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const mls = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(mls).padStart(3, "0")}`;
}

function generateSRT(text: string, durationMs: number): string {
  const segments = text.split(/(?<=[。！？.!?\n])/g).map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return "";
  const timePerSegment = Math.floor(durationMs / segments.length);
  let lines: string[] = [];
  let start = 0;
  segments.forEach((seg, i) => {
    const end = i === segments.length - 1 ? durationMs : start + timePerSegment;
    lines.push(`${i + 1}`);
    lines.push(`${formatSRTTime(start)} --> ${formatSRTTime(end)}`);
    lines.push(seg);
    lines.push("");
    start = end;
  });
  return lines.join("\n");
}

export function TTSControls() {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("");
  const [speed, setSpeed] = useState([1.0]);
  const [voices, setVoices] = useState<VoiceItem[]>(FALLBACK_VOICES);

  // Advanced parameters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [temperature, setTemperature] = useState([0.3]);
  const [topP, setTopP] = useState([0.7]);
  const [topK, setTopK] = useState("20");
  const [skipRefine, setSkipRefine] = useState(true);
  const [customVoice, setCustomVoice] = useState("18888");
  const [prompt, setPrompt] = useState("");
  const [textSeed, setTextSeed] = useState("42");
  const [refineMaxNewToken, setRefineMaxNewToken] = useState("384");
  const [inferMaxNewToken, setInferMaxNewToken] = useState("2048");

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);

  useEffect(() => {
    fetch("/v1/voices")
      .then((r) => r.json())
      .then((data) => {
        const list: VoiceItem[] = data.voices ?? [];
        setVoices(list);
      })
      .catch(() => {});
      return ()=>{
        console.log(2)
      }
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const handleGenerate = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setIsGenerating(true);
    setError(null);

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setAudioDuration(0);

    const options: Record<string, unknown> = {
      voice,
      speed: speed[0],
      temperature: temperature[0],
      top_p: topP[0],
      top_k: parseInt(topK, 10) || 20,
      skip_refine: skipRefine,
      text_seed: parseInt(textSeed, 10) || 42,
      refine_max_new_token: parseInt(refineMaxNewToken, 10) || 384,
      infer_max_new_token: parseInt(inferMaxNewToken, 10) || 2048,
    };

    if (customVoice.trim()) {
      options.custom_voice = parseInt(customVoice, 10) || 0;
    }
    if (prompt.trim()) {
      options.prompt = prompt.trim();
    }

    try {
      const res = await fetch("/v1/audio/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: trimmed, options }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || `请求失败 (${res.status})`);
      }

      const durationHeader = res.headers.get("X-Audio-Duration");
      const duration = durationHeader ? parseInt(durationHeader, 10) : 0;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      setAudioBlob(blob);
      setAudioUrl(url);
      setAudioDuration(duration);

      const audio = new Audio(url);
      audio.play().catch(() => {});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "未知错误";
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [text, voice, speed, temperature, topP, topK, skipRefine, customVoice, prompt, textSeed, refineMaxNewToken, inferMaxNewToken, audioUrl]);

  const handleDownloadAudio = useCallback(() => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tts_${Date.now()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  }, [audioBlob]);

  const handleDownloadSubtitle = useCallback(() => {
    if (!audioDuration || !text.trim()) return;
    const srt = generateSRT(text.trim(), audioDuration);
    if (!srt) return;
    const blob = new Blob([srt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subtitle_${Date.now()}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [audioDuration, text]);

  const canGenerate = text.trim().length > 0 && !isGenerating;
  const hasAudio = audioBlob !== null && audioUrl !== null;

  return (
    <div className="space-y-6">
      {/* Text input */}
      <div className="space-y-2 relative">
        <Label className="text-sm font-medium">输入文本</Label>
        <Textarea
          placeholder="请输入要转换为语音的文字..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[140px] resize-y transition-shadow duration-200 focus-visible:shadow-sm"
        />
        {text && (
          <button
            onClick={() => setText("")}
            className="absolute right-2 top-9 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Voice & custom seed */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium">音色</Label>
          <div className="relative">
            <Select value={voice} onValueChange={(v) => v && setVoice(v)}>
              <SelectTrigger className={`w-full${voice ? " pr-10" : ""}`}>
                <SelectValue placeholder="选择音色" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="random">🎲 随机音色</SelectItem>
                {voices.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {voice && (
              <button
                onClick={(e) => { e.stopPropagation(); setVoice(""); }}
                className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {voice !== "random" && (
            <p className="text-xs text-muted-foreground px-1">
              {voices.find((v) => v.id === voice)?.desc}
            </p>
          )}
        </div>

        <div className="space-y-2 relative">
          <Label className="text-sm font-medium">
            自定义音色种子
            <span className="text-xs text-muted-foreground ml-2 font-normal">（填写后将忽略上方选择）</span>
          </Label>
          <div className="relative">
            <Input
            type="number"
            min={0}
            placeholder="如 3000、8888 等"
            value={customVoice}
            onChange={(e) => setCustomVoice(e.target.value)}
            className={customVoice ? "pr-8" : ""}
          />
          {customVoice && (
            <button
              onClick={() => setCustomVoice("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>

      {/* Advanced settings toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer"
        >
          <Settings2 className="h-3.5 w-3.5" />
          {showAdvanced ? "收起高级设置" : "展开高级设置"}
          {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-5 rounded-xl border p-4 bg-muted/20">
            {/* Speed */}
            <div className="space-y-2">
              <Label className="text-sm font-medium" title="语速调节: 0.5x(慢) ~ 2.0x(快)，控制朗读速度">语速: {speed[0].toFixed(1)}x</Label>
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs text-muted-foreground/60">慢</span>
                <Slider
                  value={speed}
                  onValueChange={(v) => setSpeed(v as number[])}
                  min={0.5}
                  max={2}
                  step={0.1}
                />
                <span className="text-xs text-muted-foreground/60">快</span>
              </div>
            </div>

            {/* Prompt */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                情感控制标记
                <span className="text-xs text-muted-foreground ml-2 font-normal">（需取消勾选"跳过 refine"才生效）</span>
              </Label>
              <div className="relative">
                <Input
                  placeholder="如 [oral_2][laugh_0][break_6]"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className={prompt ? "pr-8" : ""}
                />
                {prompt && (
                  <button
                    onClick={() => setPrompt("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Generation params */}
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium" title="温度 (0~1): 控制说话随机度和情绪化程度。值越低越稳定克制，越高越富有情感。推荐 0.30 适合沉稳风格">Temperature: {temperature[0].toFixed(2)}</Label>
                <Slider
                  value={temperature}
                  onValueChange={(v) => setTemperature(v as number[])}
                  min={0.01}
                  max={1.0}
                  step={0.01}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium" title="Top P (0~1): 控制词汇采样范围，影响口语自然度。值越低越保守，越高越丰富多变。推荐 0.70">Top P: {topP[0].toFixed(2)}</Label>
                <Slider
                  value={topP}
                  onValueChange={(v) => setTopP(v as number[])}
                  min={0.001}
                  max={0.9}
                  step={0.01}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium" title="Top K: 限制采样候选词数量，值越小输出越稳定。推荐默认 20">Top K</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={topK}
                    onChange={(e) => setTopK(e.target.value)}
                    className={topK ? "pr-8" : ""}
                  />
                  {topK && (
                    <button
                      onClick={() => setTopK("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Token limits & seed */}
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium" title="推理最大 Token: 控制生成音频长度。2048 约等于 1000 字中文，短视频通常够用">推理最大 Token</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={512}
                    step={128}
                    value={inferMaxNewToken}
                    onChange={(e) => setInferMaxNewToken(e.target.value)}
                    className={inferMaxNewToken ? "pr-8" : ""}
                  />
                  {inferMaxNewToken && (
                    <button
                      onClick={() => setInferMaxNewToken("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium" title="Refine 最大 Token: 控制情感细化阶段的处理长度。默认 384，取消勾选跳过 refine 后生效">Refine 最大 Token</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={1}
                    value={refineMaxNewToken}
                    onChange={(e) => setRefineMaxNewToken(e.target.value)}
                    className={refineMaxNewToken ? "pr-8" : ""}
                  />
                  {refineMaxNewToken && (
                    <button
                      onClick={() => setRefineMaxNewToken("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium" title="Text Seed (断句/语气种子): 控制 refine 阶段的断句和语气节奏。默认 42，相同种子每次结果一致">Text Seed</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    value={textSeed}
                    onChange={(e) => setTextSeed(e.target.value)}
                    className={textSeed ? "pr-8" : ""}
                  />
                  {textSeed && (
                    <button
                      onClick={() => setTextSeed("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Skip refine */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="skip_refine"
                checked={skipRefine}
                onChange={(e) => setSkipRefine(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-neutral-900 focus:ring-neutral-900 dark:border-gray-600 dark:bg-neutral-800 dark:text-neutral-100"
              />
              <Label htmlFor="skip_refine" className="text-sm font-medium cursor-pointer" title="跳过 refine text（核心开关）: 勾选后跳过情感细化阶段，生成速度更快但情感标记不生效。取消勾选可使情感控制标记 [oral_2][laugh_0][break_6] 生效">
                跳过 refine text
                <span className="text-xs text-muted-foreground ml-2 font-normal">（勾选可加速生成）</span>
              </Label>
            </div>
          </div>
        )}
      </div>

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={!canGenerate}
        size="lg"
        className="w-full h-12 bg-gradient-to-r from-neutral-900 to-neutral-800 hover:from-neutral-800 hover:to-neutral-700 text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:shadow-none text-base gap-2 rounded-xl dark:from-neutral-100 dark:to-neutral-200 dark:text-neutral-900 dark:hover:from-neutral-200 dark:hover:to-neutral-300"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            生成中...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            生成语音
          </>
        )}
      </Button>

      {/* Success & Downloads */}
      {hasAudio && !error && (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              语音生成成功
              {audioDuration > 0 && `（共 ${Math.ceil(audioDuration / 1000)} 秒）`}
            </div>
            <audio
              controls
              src={audioUrl || undefined}
              className="w-full h-11"
              autoPlay
            >
             您的浏览器不支持音频播放
            </audio>
            <div className="flex gap-2">
              <Button
                onClick={handleDownloadAudio}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <FileAudio className="mr-1.5 h-4 w-4" />
                下载音频
              </Button>
              <Button
                onClick={handleDownloadSubtitle}
                variant="outline"
                size="sm"
                disabled={audioDuration <= 0}
                className="flex-1"
              >
                <FileText className="mr-1.5 h-4 w-4" />
                下载字幕
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap">{error}</p>
          <p className="text-xs text-red-400/70 mt-1">请确保后端服务已启动（端口 8765）</p>
        </div>
      )}
    </div>
  );
}
