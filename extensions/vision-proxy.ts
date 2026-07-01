/**
 * Vision Proxy for DeepSeek (and any text-only model)
 *
 * When using a text-only model (e.g. DeepSeek V4) and images appear —
 * whether pasted by the user (Ctrl+V) or read from disk by the `read` tool —
 * this extension forwards them to Gemini for description and injects the
 * text so the model can "see" the image.
 *
 * Vision-capable models (Claude, GPT, Gemini) are skipped entirely.
 *
 * ## Configuration
 *
 * Required: `GEMINI_API_KEY` environment variable.
 * Optional: `PI_VISION_MODEL` to override the vision model (default: gemini-2.5-flash).
 *
 * ## Runtime toggle
 *
 * `/vision-proxy` toggles the extension on/off in the current session.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

// ── Configuration ───────────────────────────────────────────────

const VISION_MODEL = process.env.PI_VISION_MODEL || "gemini-2.5-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

const IMAGE_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".tiff",
]);

const EXT_TO_MIME: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp",
  ".svg": "image/svg+xml", ".tiff": "image/tiff",
};

/** UI-debugging prompt — the most common use case. */
const VISION_PROMPT = [
  "You are a UI debugging assistant. Analyze this screenshot for visual issues in a web/app UI.",
  "",
  "Report in this order:",
  "1. **Context** (one line): what screen/component is this — Figma mockup, live app, or design tool?",
  "2. **Layout & Spacing issues**: misalignments, uneven padding/margins, elements touching edges, overflow, clipping, inconsistent gaps between sibling elements, text truncation. Use pixel estimates where visible.",
  "3. **Visual bugs**: rendering glitches, z-index/layering problems, color inconsistencies, missing elements, broken images/icons, font rendering issues, scrollbar problems, flicker artifacts.",
  "4. **Responsive/state issues**: does it look broken at this viewport? Missing hover/focus/active states? Dark mode mismatch?",
  "5. **Summary**: top 2-3 actionable fixes.",
  "",
  "Be specific with locations (e.g. 'top-right corner', 'below the header'). Skip describing every element — only call out problems and the elements involved.",
].join("\n");

// ── State ───────────────────────────────────────────────────────

let enabled = true;
const descriptionCache = new Map<string, string>();

// ── Extension ───────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  // Toggle command
  pi.registerCommand("vision-proxy", {
    description: "Toggle vision proxy on/off",
    handler: async (_args, ctx) => {
      enabled = !enabled;
      ctx.ui.notify(
        `Vision proxy: ${enabled ? "ON" : "OFF"} (model: ${VISION_MODEL})`,
        "info"
      );
    },
  });

  // Path 1: pasted/dragged images (Ctrl+V)
  pi.on("before_agent_start", async (event, ctx) => {
    if (!enabled) return;

    const images = event.images;
    if (!images || images.length === 0) return;

    if (isVisionCapable(ctx)) return;

    const apiKey = getApiKey(ctx);
    if (!apiKey) return;

    ctx.ui.notify(
      `Vision proxy: describing ${images.length} image(s) via ${VISION_MODEL}…`,
      "info"
    );

    const descriptions: string[] = [];
    for (let i = 0; i < images.length; i++) {
      try {
        const desc = await callGemini(images[i], apiKey, ctx.signal);
        descriptions.push(`Image ${i + 1}: ${desc}`);
      } catch (err: any) {
        descriptions.push(`Image ${i + 1}: [failed: ${err.message}]`);
      }
    }

    return {
      message: {
        customType: "vision-proxy",
        content: descriptions.join("\n\n"),
        display: false,
      },
    };
  });

  // Path 2: model calls `read` on an image file
  pi.on("tool_result", async (event, ctx) => {
    if (!enabled) return;
    if (event.toolName !== "read") return;

    if (isVisionCapable(ctx)) return;

    const apiKey = getApiKey(ctx);
    if (!apiKey) return;

    const filePath = event.input?.path as string | undefined;
    if (!filePath || !isImagePath(filePath)) return;

    const cached = descriptionCache.get(filePath);
    if (cached !== undefined) {
      return { content: [{ type: "text", text: cached }] };
    }

    ctx.ui.notify(`Vision proxy: describing ${filePath}…`, "info");

    try {
      const imageData = readImageFile(filePath);
      const desc = await callGemini(imageData, apiKey, ctx.signal);
      const fullDesc = `[Image from ${filePath}: ${desc}]`;
      descriptionCache.set(filePath, fullDesc);
      return { content: [{ type: "text", text: fullDesc }] };
    } catch (err: any) {
      ctx.ui.notify(`Vision proxy failed: ${err.message}`, "error");
      return;
    }
  });
}

// ── Helpers ─────────────────────────────────────────────────────

function isVisionCapable(ctx: any): boolean {
  return ctx.model?.input?.includes("image") ?? false;
}

function getApiKey(ctx: any): string | undefined {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    ctx.ui.notify("Vision proxy: GEMINI_API_KEY not set — skipping", "warn");
  }
  return key;
}

function isImagePath(filePath: string): boolean {
  return IMAGE_EXTENSIONS.has(extname(filePath).toLowerCase());
}

function readImageFile(filePath: string): any {
  const buf = readFileSync(filePath);
  const mimeType = EXT_TO_MIME[extname(filePath).toLowerCase()] || "image/png";
  return {
    type: "image",
    source: { type: "base64", mediaType: mimeType, data: buf.toString("base64") },
  };
}

// ── Gemini API ──────────────────────────────────────────────────

async function callGemini(
  image: any,
  apiKey: string,
  signal?: AbortSignal
): Promise<string> {
  const { mimeType, base64Data } = extractImageData(image);

  const url = `${GEMINI_BASE}/models/${VISION_MODEL}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          { text: VISION_PROMPT },
          { inline_data: { mime_type: mimeType, data: base64Data } },
        ],
      },
    ],
    generation_config: { temperature: 0, max_output_tokens: 2048 },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Gemini API ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await response.json()) as any;
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p: any) => p.text)
    .join("")
    .trim();

  if (!text) throw new Error("Gemini returned empty description");
  return text;
}

function extractImageData(image: any): { mimeType: string; base64Data: string } {
  // Anthropic / our own readImageFile format
  if (image?.source?.type === "base64") {
    return {
      mimeType: image.source.mediaType || image.source.media_type || "image/png",
      base64Data: image.source.data,
    };
  }

  // OpenAI-style data URL
  const dataUrl = image?.image_url?.url || image?.source?.url || image?.url;
  if (typeof dataUrl === "string") {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) return { mimeType: match[1], base64Data: match[2] };
  }

  // Raw base64
  if (image?.data && typeof image.data === "string") {
    return {
      mimeType: image.mediaType || image.media_type || "image/png",
      base64Data: image.data,
    };
  }

  throw new Error("Unrecognized image format");
}
