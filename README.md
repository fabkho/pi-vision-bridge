# DeepSeek Pi Pack

Optimization pack for using [DeepSeek V4](https://api-docs.deepseek.com/) with the [Pi coding agent](https://pi.dev).

## What's included

### Vision Proxy Extension
When using DeepSeek (text-only), automatically forwards screenshots to Gemini for description — so DeepSeek can "see" images.

- Intercepts pasted images (Ctrl+V) and `read` tool calls on image files
- Uses Gemini 2.5 Flash for fast, cheap descriptions ($0.00096/call)
- Optimized prompt for UI debugging (spacing, alignment, glitches)
- In-memory cache avoids re-processing the same file
- Skips entirely when a vision-capable model is active

### DeepSeek Setup Skill
Guided skill for configuring DeepSeek in Pi — sets up `models.json`, thinking levels, sub-agents, and compaction tuned for the 1M context window.

Invoke with `/skill:deepseek-setup` or let the agent auto-load it.

## Install

```bash
pi install git:github.com/<user>/deepseek-pi
```

Or install locally:

```bash
pi install /path/to/deepseek-pi
```

## Requirements

- **Vision proxy**: `GEMINI_API_KEY` environment variable
- **DeepSeek**: `DEEPSEEK_API_KEY` environment variable

## Configuration

### Vision model override

Set `PI_VISION_MODEL` to use a different Gemini model:

```bash
export PI_VISION_MODEL=gemini-2.5-flash-lite  # ultra-cheap
export PI_VISION_MODEL=gemini-3.5-flash        # latest gen
```

Default: `gemini-2.5-flash`.

### DeepSeek setup

Run `/skill:deepseek-setup` and follow the guided setup. The skill will help you:

1. Configure `models.json` with proper thinking levels
2. Set up recommended compaction for 1M context
3. Create sub-agent definitions tuned for DeepSeek
4. Optimize settings for the best experience

## License

MIT
