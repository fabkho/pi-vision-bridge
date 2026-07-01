---
name: deepseek-setup
description: >
  Configure DeepSeek V4 models in Pi with optimal settings.
  Use when the user asks to set up DeepSeek, configure deepseek models,
  optimize for DeepSeek, or mentions DeepSeek + Pi setup.
---

# DeepSeek V4 Setup for Pi

Set up DeepSeek V4 Pro and Flash models with optimal thinking levels, sub-agents, and context settings.

## Prerequisites

- DeepSeek API key: set `DEEPSEEK_API_KEY` environment variable
- Pi coding agent installed (`pi --version`)

## 1. models.json — Provider & Model Configuration

Create or update `~/.pi/agent/models.json`:

```json
{
  "providers": {
    "deepseek": {
      "baseUrl": "https://api.deepseek.com",
      "api": "openai-completions",
      "apiKey": "$DEEPSEEK_API_KEY",
      "models": [
        {
          "id": "deepseek-v4-pro",
          "name": "DeepSeek V4 Pro",
          "contextWindow": 1000000,
          "maxTokens": 384000,
          "input": ["text"],
          "reasoning": true,
          "cost": {
            "input": 1.74,
            "output": 3.48,
            "cacheRead": 0.174,
            "cacheWrite": 0
          },
          "compat": {
            "requiresReasoningContentOnAssistantMessages": true,
            "thinkingFormat": "deepseek"
          },
          "thinkingLevelMap": {
            "minimal": "high",
            "low": "high",
            "medium": "high",
            "high": "high",
            "xhigh": "max"
          }
        },
        {
          "id": "deepseek-v4-flash",
          "name": "DeepSeek V4 Flash",
          "contextWindow": 1000000,
          "maxTokens": 384000,
          "input": ["text"],
          "reasoning": true,
          "cost": {
            "input": 0.14,
            "output": 0.28,
            "cacheRead": 0.028,
            "cacheWrite": 0
          },
          "compat": {
            "requiresReasoningContentOnAssistantMessages": true,
            "thinkingFormat": "deepseek"
          },
          "thinkingLevelMap": {
            "minimal": "high",
            "low": "high",
            "medium": "high",
            "high": "high",
            "xhigh": "max"
          }
        }
      ]
    }
  }
}
```

**Key details:**
- `thinkingLevelMap` maps all Pi thinking levels → `"high"` (DeepSeek's good default), `xhigh` → `"max"` (full reasoning)
- `requiresReasoningContentOnAssistantMessages`: needed for DeepSeek's reasoning block format
- `thinkingFormat: "deepseek"`: uses DeepSeek-specific `reasoning_effort` parameter format
- Flash: 10× cheaper than Pro, use for simple/exploratory tasks

## 2. settings.json — Recommended Settings

Update `~/.pi/agent/settings.json`:

```json
{
  "defaultProvider": "deepseek",
  "defaultModel": "deepseek-v4-pro",
  "defaultThinkingLevel": "high",
  "hideThinkingBlock": true,
  "compaction": {
    "enabled": true,
    "reserveTokens": 64000,
    "keepRecentTokens": 200000
  }
}
```

**Key details:**
- `defaultThinkingLevel: "high"` — maps to DeepSeek's "high" reasoning mode (good balance of quality/speed)
- Use `shift+tab` to cycle thinking levels at runtime, or set `xhigh` for maximum reasoning
- `compaction`: tuned for 1M context window. Compaction kicks in at ~264K tokens instead of the default 32K
- `hideThinkingBlock: true` — hides reasoning blocks in TUI (less noise)

## 3. Sub-Agents — Optimized DeepSeek Agent Definitions

Create these files in `~/.pi/agent/agents/`:

### `worker-slow.md` — Robust implementation (Pro + max thinking)
```yaml
---
name: worker-slow
description: Robust implementation agent using DeepSeek Pro. Use for complex code logic, major modifications, or when the standard worker struggles with tool calls.
model: deepseek-v4-pro
thinking: xhigh
---
You are a robust implementation agent. Execute tasks precisely. Follow project conventions from AGENTS.md. Pay close attention to file edits and ensure block replacements are 100% accurate.
```

### `worker.md` — Fast implementation (Flash)
```yaml
---
name: worker
description: Fast, cost-efficient implementation agent. Use for simple tasks, text replacements, or file creation.
model: deepseek-v4-flash
thinking: medium
---
You are a fast implementation agent. Execute simple tasks efficiently.
```

### `scout.md` — Code exploration (Flash, minimal thinking)
```yaml
---
name: scout
description: Fast codebase exploration and recon. Use for finding code, understanding structure, gathering context.
model: deepseek-v4-flash
thinking: minimal
tools: read, grep, find, ls, bash
---
You are a fast code explorer. Find relevant files, symbols, and patterns quickly.
```

### `debugger.md` — Bug hunting (Pro + max thinking)
```yaml
---
name: debugger
description: Specialized bug-hunting agent. Use for reproducing errors, analyzing logs, and fixing complex bugs.
model: deepseek-v4-pro
thinking: xhigh
tools: read, grep, find, ls, bash
---
You are a diagnostic and debugging specialist. Formulate hypotheses, gather evidence, find root cause.
```

### `planner.md` — Architecture planning (Pro)
```yaml
---
name: planner
description: Architecture and implementation planning. Use for complex features that need a plan before coding.
model: deepseek-v4-pro
thinking: high
tools: read, grep, find, ls
---
You are a software architect. Design implementation plans for complex features.
```

### `reviewer.md` — Code review (Pro)
```yaml
---
name: reviewer
description: Code review agent. Use for reviewing changes, finding bugs, checking conventions.
model: deepseek-v4-pro
thinking: medium
tools: read, grep, find, ls, bash
---
You are a code reviewer. Check for logic errors, convention violations, security issues, missing error handling, performance concerns. Rate issues P0-P3. Give a ship/no-ship verdict.
```

### `documenter.md` — Documentation (Flash, no thinking)
```yaml
---
name: documenter
description: Specialized documentation agent. Use for writing READMEs, markdown docs, and in-code comments.
model: deepseek-v4-flash
thinking: off
tools: read, grep
---
You are a documentation writer. Write clear, concise docs.
```

## 4. Vision Proxy — See Images with DeepSeek

Install the `pi-vision-bridge` package (which includes this skill and the vision-proxy extension):

```bash
pi install /path/to/pi-vision-bridge
```

Requires `GEMINI_API_KEY` environment variable.

The vision proxy automatically:
- Intercepts pasted images (Ctrl+V) and forwards to Gemini 2.5 Flash for description
- Handles `read` tool calls on image files
- Skips entirely when using vision-capable models (Claude, GPT, Gemini)

Toggle with `/vision-proxy` in your Pi session.

## 5. Verification

After setup:
1. Run `pi` and check the footer shows `deepseek/deepseek-v4-pro`
2. Run `/model` to confirm both models appear
3. Type `/hotkeys` and verify `shift+tab` cycles thinking levels
4. Test sub-agents: ask Pi to "plan a feature" (should use planner agent)
5. Test vision: paste a screenshot while on DeepSeek (should see vision proxy notification)
