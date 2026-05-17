import io
import math
import re
import uuid
import logging
from typing import Optional

import numpy as np
import torch
import ChatTTS
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Wayne Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

chat: Optional[ChatTTS.Chat] = None
SAMPLE_RATE = 24000

# ============================================================
# Voice presets: seed-based
# ============================================================
PRESET_SEEDS = {
    "gentle-female": 42,
    "sweet-girl": 256,
    "mature-woman": 789,
    "loli-voice": 666,
    "energetic-girl": 777,
    "warm-mom": 555,
    "magnetic-male": 123,
    "sunshine-boy": 512,
    "steady-uncle": 999,
    "deep-man": 321,
    "broadcast-host": 333,
    "news-anchor": 111,
    "emotional-radio": 222,
    "storytelling": 444,
    "douyin-popular": 88,
    "douyin-funny": 6666,
    "douyin-warm": 7777,
    "douyin-trendy": 9999,
}

VOICE_META = {
    "gentle-female": {"name": "温柔女声", "desc": "柔和细腻的成年女声，适合朗读散文、故事", "category": "女声"},
    "sweet-girl": {"name": "甜美少女", "desc": "甜美青春的少女音，适合日常对话、轻松内容", "category": "女声"},
    "mature-woman": {"name": "知性御姐", "desc": "成熟稳重的御姐音，适合专业讲解、正式内容", "category": "女声"},
    "loli-voice": {"name": "可爱萝莉", "desc": "活泼可爱的萝莉音，适合动画、游戏内容", "category": "女声"},
    "energetic-girl": {"name": "活力少女", "desc": "元气满满的活力女声，适合宣传、广告", "category": "女声"},
    "warm-mom": {"name": "温暖母亲", "desc": "温柔慈祥的女中音，适合睡前故事、亲子内容", "category": "女声"},
    "magnetic-male": {"name": "磁性男声", "desc": "低沉富有磁性的男声，适合旁白、情感内容", "category": "男声"},
    "sunshine-boy": {"name": "阳光少年", "desc": "清爽阳光的少年音，适合青春、校园内容", "category": "男声"},
    "steady-uncle": {"name": "沉稳大叔", "desc": "稳重成熟的中年男声，适合解说、知识分享", "category": "男声"},
    "deep-man": {"name": "低音炮男声", "desc": "浑厚深沉的男低音，适合电影预告、旁白", "category": "男声"},
    "broadcast-host": {"name": "播音主持", "desc": "标准的播音腔，适合新闻播报、正式场合", "category": "专业风格"},
    "news-anchor": {"name": "新闻联播", "desc": "严谨正式的新闻播音风格", "category": "专业风格"},
    "emotional-radio": {"name": "情感电台", "desc": "温暖治愈的电台风格，适合情感类内容", "category": "专业风格"},
    "storytelling": {"name": "评书讲故事", "desc": "富有表现力的讲故事的风格", "category": "专业风格"},
    "douyin-popular": {"name": "抖音热门女声", "desc": "抖音上常见的热门AI女声，适合短视频配音", "category": "抖音风格"},
    "douyin-funny": {"name": "抖音搞笑男声", "desc": "抖音常见的搞笑解说男声，适合段子、吐槽", "category": "抖音风格"},
    "douyin-warm": {"name": "抖音治愈女声", "desc": "抖音上流行的温暖治愈女声，适合情感语录", "category": "抖音风格"},
    "douyin-trendy": {"name": "抖音潮流男声", "desc": "抖音潮流男声，适合测评、开箱、Vlog", "category": "抖音风格"},
}

# ============================================================
# Request models — matches chattts-ui parameter set
# ============================================================
class TTSOptions(BaseModel):
    voice: str = "random"
    speed: float = 1.0
    temperature: float = 0.3
    top_p: float = 0.7
    top_k: int = 20
    skip_refine: bool = True
    custom_voice: Optional[int] = Field(default=None, ge=0)
    prompt: str = Field(default="", description="expressive prompt for refine stage, e.g. [oral_2][laugh_0][break_6]")
    text_seed: int = 42
    refine_max_new_token: int = 384
    infer_max_new_token: int = 2048


class TTSRequest(BaseModel):
    input: str
    options: TTSOptions = TTSOptions()


class VoiceResponse(BaseModel):
    voice_id: str


# ============================================================
# Text processing
# ============================================================
NUM_MAP = {str(i): v for i, v in enumerate("零一二三四五六七八九")}
NUM_MAP.update({"10": "十", "35": "三十五", "40": "四十"})

WHITELIST_PUNCT = r"，。；：“”‘’（）【】—·,.!? "


def clean_text(text: str, replace_num: bool = True) -> str:
    if replace_num:
        for k, v in NUM_MAP.items():
            text = text.replace(k, v)
    text = text.replace("！", "，")
    text = text.replace("？", "。")
    text = text.replace("、", "，")
    text = text.replace("——", "—")
    pattern = rf"[^一-鿿{WHITELIST_PUNCT}\s]"
    text = re.sub(pattern, "", text)
    text = re.sub(r"([，。；：！？、])\1+", r"\1", text)
    text = re.sub(r"\s+", "", text)
    return text


def merge_short_lines(lines: list[str]) -> list[str]:
    """Merge lines shorter than 30 chars to avoid tiny segments."""
    merged = []
    buf = ""
    for line in lines:
        if len(line) < 30:
            buf += line
            if len(buf) > 30:
                merged.append(buf)
                buf = ""
        else:
            merged.append(buf + line)
            buf = ""
    if buf:
        if len(buf) > 30 or not merged:
            merged.append(buf)
        else:
            merged[-1] += buf
    return merged


def split_and_prepare(text: str) -> list[str]:
    """Full text pipeline: split by newline, clean, merge shorts, then split long chunks."""
    raw_lines = [t.strip() for t in text.split("\n") if t.strip()]
    cleaned = [clean_text(t) for t in raw_lines]
    merged = merge_short_lines(cleaned)
    # Further split any chunk that exceeds 180 chars
    result = []
    for chunk in merged:
        if len(chunk) > 180:
            parts = re.split(r"([。；！？])", chunk)
            buf = ""
            for p in parts:
                if len(buf + p) > 180 and buf:
                    result.append(buf)
                    buf = ""
                buf += p
            if buf:
                result.append(buf)
        else:
            result.append(chunk)
    return result


# ============================================================
# Server lifecycle
# ============================================================
@app.on_event("startup")
async def startup():
    global chat
    logger.info("Loading Wayne model...")
    chat = ChatTTS.Chat()
    chat.load(source="huggingface", compile=False)
    logger.info("Wayne model loaded successfully")


# ============================================================
# TTS endpoint — two-stage pipeline matching chattts-ui
# ============================================================
@app.post("/v1/audio/speech")
async def tts(req: TTSRequest):
    if chat is None:
        raise HTTPException(503, "Model not ready, please wait a moment")

    opts = req.options
    raw_text = req.input.strip()
    if not raw_text:
        raise HTTPException(400, "input text is required")

    # 1. Clean + split text
    chunks = split_and_prepare(raw_text)

    # 2. Setup inference params (NO speed token in prompt — it breaks audio decoder)
    spk_emb = resolve_speaker(opts.voice, opts.custom_voice)

    def make_infer_params(spk, temp, top_p, top_k, prompt=""):
        return chat.InferCodeParams(
            spk_emb=spk, temperature=temp, top_P=top_p,
            top_K=top_k, prompt=prompt,
            max_new_token=opts.infer_max_new_token,
        )

    params_infer = make_infer_params(spk_emb, opts.temperature, opts.top_p, opts.top_k)

    # Pre-resolve fallback speakers so all chunks use the same ones on retry
    spk_fb1 = resolve_speaker("random", None) if opts.voice == "random" else spk_emb
    params_fb1 = make_infer_params(spk_fb1, opts.temperature, opts.top_p, opts.top_k)
    spk_fb2 = resolve_speaker("random", None) if opts.voice == "random" else spk_emb
    params_fb2 = make_infer_params(
        spk_fb2, min(1.0, opts.temperature + 0.3),
        min(0.9, opts.top_p + 0.15), max(1, opts.top_k - 5),
    )

    params_refine = None
    if not opts.skip_refine:
        if opts.text_seed > 0:
            torch.manual_seed(opts.text_seed)
        params_refine = chat.RefineTextParams(
            prompt=opts.prompt if opts.prompt else "[break_6]",
            temperature=opts.temperature,
            top_P=opts.top_p,
            top_K=opts.top_k,
            max_new_token=opts.refine_max_new_token,
        )

    logger.info(
        "TTS: text_len=%d chunks=%d voice=%s speed=%.1f "
        "temp=%.2f top_p=%.2f top_k=%d skip_refine=%s "
        "infer_max_token=%d refine_max_token=%d text_seed=%d",
        len(raw_text), len(chunks), opts.voice, opts.speed,
        opts.temperature, opts.top_p, opts.top_k, opts.skip_refine,
        opts.infer_max_new_token, opts.refine_max_new_token, opts.text_seed,
    )

    # 4. Generate per chunk with retry
    all_wavs = []

    for idx, seg in enumerate(chunks):
        if not seg.strip():
            logger.warning("Chunk %d is empty after cleaning, skipping", idx)
            continue

        logger.info("Chunk %d/%d: len=%d text=%s...", idx + 1, len(chunks), len(seg), seg[:60])

        # Try primary, then fallbacks (all use fixed speakers resolved upfront)
        wav = _try_infer(chat, seg, opts, params_infer, params_refine)
        if wav is None:
            logger.warning("Chunk %d: retry with fallback speaker 1", idx)
            wav = _try_infer(chat, seg, opts, params_fb1, params_refine)
        if wav is None:
            logger.warning("Chunk %d: retry with fallback speaker 2", idx)
            wav = _try_infer(chat, seg, opts, params_fb2, params_refine)

        if wav is not None:
            all_wavs.append(wav)
        else:
            logger.warning("Chunk %d: all attempts failed, skipping", idx)

    if not all_wavs:
        raise HTTPException(500, "No audio generated — all text chunks failed. Try shorter text or disable skip_refine.")

    # 5. Concatenate chunks
    if len(all_wavs) == 1:
        wav_data = all_wavs[0]
    else:
        wav_data = np.concatenate(all_wavs, axis=-1)
    wav_data = wav_data[0] if wav_data.ndim > 1 else wav_data

    # 6. Write WAV binary response
    buffer = io.BytesIO()
    sf.write(buffer, wav_data, samplerate=SAMPLE_RATE, format="wav")
    wav_bytes = buffer.getvalue()

    duration_ms = int(math.ceil(len(wav_data) / SAMPLE_RATE * 1000))
    logger.info("Generated %d bytes, duration=%dms", len(wav_bytes), duration_ms)

    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={
            "Content-Disposition": f'attachment; filename="tts_{uuid.uuid4().hex[:8]}.wav"',
            "X-Audio-Duration": str(duration_ms),
        },
    )


# ============================================================
# Inference helper with retry
# ============================================================
def _try_infer(chat_instance, seg: str, opts, params_infer, params_refine) -> Optional[np.ndarray]:
    """Try generating audio for one chunk. Returns None on failure."""
    try:
        result = chat_instance.infer(
            seg,
            skip_refine_text=opts.skip_refine,
            params_refine_text=params_refine,
            params_infer_code=params_infer,
        )
        if result is not None and len(result) > 0:
            return result[0]
    except Exception as e:
        logger.warning("_try_infer failed: %s", e)
    return None


# ============================================================
# Voice helpers
# ============================================================
def resolve_speaker(voice_id: str, custom_seed: Optional[int] = None) -> object:
    if custom_seed is not None:
        torch.manual_seed(custom_seed)
        return chat.sample_random_speaker()
    if voice_id == "random":
        return chat.sample_random_speaker()
    if voice_id in PRESET_SEEDS:
        torch.manual_seed(PRESET_SEEDS[voice_id])
        return chat.sample_random_speaker()
    return chat.sample_random_speaker()


# ============================================================
# Management endpoints
# ============================================================
@app.get("/v1/voices")
async def list_voices():
    preset = []
    for vid, meta in VOICE_META.items():
        preset.append({
            "id": vid,
            "name": meta["name"],
            "desc": meta["desc"],
            "category": meta["category"],
            "seed": PRESET_SEEDS[vid],
        })
    return {"voices": preset}


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": chat is not None}
