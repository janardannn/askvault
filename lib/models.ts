/** Curated OpenRouter models for the in-app switcher, grouped by tier. */
export interface ModelOption {
  id: string;
  label: string;
  note: string;
}

// Free, tool-capable
export const FREE_MODELS: ModelOption[] = [
  { id: "openai/gpt-oss-120b:free", label: "GPT-OSS 120B", note: "Strong default" },
  { id: "openai/gpt-oss-20b:free", label: "GPT-OSS 20B", note: "Lighter & faster" },
  { id: "qwen/qwen3-next-80b-a3b-instruct:free", label: "Qwen3 Next 80B", note: "Capable" },
  { id: "z-ai/glm-4.5-air:free", label: "GLM 4.5 Air", note: "Snappy" },
  { id: "moonshotai/kimi-k2.6:free", label: "Kimi K2.6", note: "Top open-weights" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B", note: "Well-rounded" },
];

// Cheap workhorses — the current usage meta on OpenRouter
export const AFFORDABLE_MODELS: ModelOption[] = [
  { id: "xiaomi/mimo-v2.5-pro", label: "MiMo V2.5 Pro", note: "Usage leader" },
  { id: "deepseek/deepseek-v3.2", label: "DeepSeek V3.2", note: "Top agentic" },
  { id: "qwen/qwen3.6-plus", label: "Qwen3.6 Plus", note: "Most-adopted" },
  { id: "minimax/minimax-m2.5", label: "MiniMax M2.5", note: "Agent workhorse" },
  { id: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash", note: "Newest, cheap" },
  { id: "moonshotai/kimi-k2.6", label: "Kimi K2.6", note: "Open-weights king" },
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", note: "Broadly used" },
  { id: "qwen/qwen3.7-max", label: "Qwen3.7 Max", note: "Value flagship" },
];

// Frontier — the top, genuinely expensive models
export const PREMIUM_MODELS: ModelOption[] = [
  { id: "anthropic/claude-opus-4.8", label: "Claude Opus 4.8", note: "#1 intelligence" },
  { id: "openai/gpt-5.5", label: "GPT-5.5", note: "Frontier" },
  { id: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6", note: "Most-used frontier" },
  { id: "openai/gpt-5.4", label: "GPT-5.4", note: "Top GPT spend" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", note: "Huge context" },
  { id: "x-ai/grok-4.3", label: "Grok 4.3", note: "Fast frontier" },
];

/** When this curated list was last reviewed against the model meta. */
export const MODELS_UPDATED = "Jun 2026";

export const MODELS: ModelOption[] = [
  ...FREE_MODELS,
  ...AFFORDABLE_MODELS,
  ...PREMIUM_MODELS,
];

export function labelFor(id: string): string {
  const known = MODELS.find((m) => m.id === id);
  if (known) return known.label;
  // prettify a custom id: "openai/gpt-oss-120b:free" -> "gpt-oss-120b"
  return (id.split("/").pop() ?? id).replace(/:free$/, "");
}
