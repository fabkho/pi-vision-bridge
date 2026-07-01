# Changelog

## [1.1.0](https://github.com/fabkho/pi-vision-bridge/compare/pi-vision-bridge-1.0.0...pi-vision-bridge-1.1.0) (2026-07-01)


### Features

* add workflow_dispatch trigger ([15f468b](https://github.com/fabkho/pi-vision-bridge/commit/15f468b2baa0340984f2e2922f718dd4eeae1d90))

## [1.0.0] - 2026-07-01

### Added
- Vision proxy extension: forwards images to Gemini for text-only models
- Two interception paths: pasted images (Ctrl+V) and `read` tool calls on image files
- UI-debugging-optimized vision prompt (spacing, alignment, glitches)
- `/vision-proxy` runtime toggle command
- `PI_VISION_MODEL` env var for configurable vision model
- In-memory cache to avoid re-processing the same file
- DeepSeek setup skill for guided models.json + sub-agent configuration
