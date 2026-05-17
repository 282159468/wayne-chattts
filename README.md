# Wayne - Text to Speech

基于 ChatTTS 的文本转语音 Web 应用。

## 技术栈

- **前端**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **UI 组件**: shadcn-ui + Radix UI
- **后端**: Python FastAPI + ChatTTS
- **包管理**: pnpm

## 项目简介

Wayne ChatTTS 是一个基于 ChatTTS 的文本转语音 Web 应用，提供**高表现力、自然流畅**的中英文语音合成能力。无论是内容创作、有声读物、短视频配音，还是语音助手、自动化播报，都能快速生成高质量的语音输出。

### 核心亮点

- 🎙️ **18 种语义化音色** — 女声、男声、专业播音、抖音风格等多种预设，无需繁琐配置
- ⚡ **一键部署运行** — Python + Vite 前后端分离架构，克隆后两条命令即可启动
- 🎚️ **实时调节** — 语速 0.5x–2.0x 自由调节，边听边调
- 📝 **自动字幕** — 生成音频的同时自动输出 SRT 字幕文件，方便视频后期
- 🎯 **基于 ChatTTS** — 采用先进的 ChatTTS v0.2.5 语音模型，自然度和表现力媲美真人

### 适用场景

| 场景 | 说明 |
| --- | --- |
| 短视频/自媒体 | 快速生成画外音、配音解说 |
| 有声内容 | 文章转语音、有声书制作 |
| 教育培训 | 课件配音、语言学习材料 |
| 语音助手 | 客服应答、语音提示播报 |

## 快速开始

### 前置要求

- Python 3.10+
- Node.js 18+
- [pnpm](https://pnpm.io/installation)

### 1. 克隆项目

```bash
git clone <repo-url>
cd wayneChatTTS
```

### 2. Python 后端

```bash
# 进入后端目录
cd server

# 创建虚拟环境（如已有 venv 目录可跳过）
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动服务（保证虚拟环境已激活）
uvicorn app:app --host 0.0.0.0 --port 8765
```

> 首次启动会自动从 Hugging Face 下载 ChatTTS 模型文件（约 1.16 GB），请保持网络畅通。

### 3. 前端开发服务器

```bash
# 回到项目根目录
cd ..

# 安装前端依赖
pnpm install

# 启动开发服务器
pnpm dev
```

前端运行在 `http://localhost:3000`，API 请求通过 Vite proxy 转发到后端 `8765` 端口。

### 构建部署

```bash
pnpm build      # 构建到 dist/
pnpm preview    # 预览构建结果
```

## 功能

- 18 种语义化音色（女声/男声/专业风格/抖音风格）
- 语速调节（0.5x - 2.0x）
- 音频播放控制
- 下载 WAV 音频文件
- 自动生成 SRT 字幕文件

## 模型说明

项目基于 [ChatTTS](https://github.com/2noise/ChatTTS)（v0.2.5），模型文件首次启动时自动从 Hugging Face 下载，存储在 `~/.cache/huggingface/hub/models--2Noise--ChatTTS/`。

| 模型文件 | 相对路径 | 大小 | 说明 |
| --- | --- | --- | --- |
| GPT model | `asset/gpt/model.safetensors` | **814 MB** | 核心语言模型（Llama 架构: hidden=768, layers=20, heads=12） |
| Embed | `asset/Embed.safetensors` | **139 MB** | 嵌入层 |
| Decoder | `asset/Decoder.safetensors` | **99 MB** | 独立 DVAE 解码器（高质量输出） |
| DVAE | `asset/DVAE.safetensors` | **58 MB** | 双路径 VAE 编解码器 |
| Vocos | `asset/Vocos.safetensors` | **52 MB** | 神经声码器 |
| Tokenizer | `asset/tokenizer/tokenizer.json` | **439 KB** | 分词器（词汇量 32000） |

> 模型总大小约 **1.16 GB**（不含缓存元数据），Hugging Face 缓存目录总占用约 **2.3 GB**。



