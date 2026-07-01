# pi-vision-bridge

Transparent image support for text-only models in the [Pi coding agent](https://pi.dev).

**Why this exists:** DeepSeek V4 (and other text-only models) can't see images. When you paste a screenshot or the agent reads an image file, the content is silently dropped. This extension bridges that gap — it forwards images to Gemini for description and injects the text so any model can "see" them.

Works with **any text-only model**, not just DeepSeek. Vision-capable models (Claude, GPT, Gemini) are skipped automatically.

## What's included

### Vision Bridge Extension
- Intercepts pasted images (Ctrl+V) and `read` tool calls on image files
- Forwards to Gemini 2.5 Flash for fast, cheap descriptions (~$0.001/call)
- UI-debugging-optimized prompt — calls out spacing, alignment, glitches
- In-memory cache avoids re-processing the same file
- `/vision-proxy` command toggles on/off at runtime
- `PI_VISION_MODEL` env var to override the vision model

### Setup Skill (optional)
Guided skill for configuring text-only models in Pi — `models.json`, thinking levels, and compaction tuned for large context windows. Invoke with `/skill:deepseek-setup`.

## Install

```bash
pi install git:github.com/<user>/pi-vision-bridge
```

Or locally:

```bash
pi install /path/to/pi-vision-bridge
```

## Requirements

- `GEMINI_API_KEY` environment variable

## Configuration

```bash
# Override the vision model (default: gemini-2.5-flash)
export PI_VISION_MODEL=gemini-2.5-flash-lite   # ultra-cheap
export PI_VISION_MODEL=gemini-3.5-flash         # latest gen
```

## Usage

Once installed, it works automatically. When you're on a text-only model:

- **Paste an image** (Ctrl+V) → Gemini describes it, injected into conversation
- **Agent reads an image file** → same flow, cached per file path
- **Switch to a vision model** → extension skips itself, zero overhead

Toggle with `/vision-proxy` in your Pi session.

## License

MIT
