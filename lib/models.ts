/** Curated OpenRouter models for the in-app switcher, grouped by tier.
 *  inCost/outCost are USD per 1M tokens. Each tier is stored sorted by inCost. */
export interface ModelOption {
  id: string;
  label: string;
  note: string;
  inCost: number; // $/1M input tokens
  outCost: number; // $/1M output tokens
}

// Free, tool-capable (all $0)
export const FREE_MODELS: ModelOption[] = [
  { id: "openai/gpt-oss-120b:free", label: "GPT-OSS 120B", note: "Strong default", inCost: 0, outCost: 0 },
  { id: "openai/gpt-oss-20b:free", label: "GPT-OSS 20B", note: "Lighter & faster", inCost: 0, outCost: 0 },
  { id: "qwen/qwen3-next-80b-a3b-instruct:free", label: "Qwen3 Next 80B", note: "Capable", inCost: 0, outCost: 0 },
  { id: "z-ai/glm-4.5-air:free", label: "GLM 4.5 Air", note: "Snappy", inCost: 0, outCost: 0 },
  { id: "moonshotai/kimi-k2.6:free", label: "Kimi K2.6", note: "Top open-weights", inCost: 0, outCost: 0 },
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B", note: "Well-rounded", inCost: 0, outCost: 0 },
];

// Affordable — input ≤ $3/M AND output ≤ $5/M, sorted by input cost
export const AFFORDABLE_MODELS: ModelOption[] = [
  { id: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash", note: "Newest, cheap", inCost: 0.098, outCost: 0.197 },
  { id: "google/gemma-4-31b-it", label: "Gemma 4 31B", note: "Google, cheap", inCost: 0.12, outCost: 0.37 },
  { id: "minimax/minimax-m2.5", label: "MiniMax M2.5", note: "Agent workhorse", inCost: 0.15, outCost: 1.15 },
  { id: "qwen/qwen3.6-plus", label: "Qwen3.6 Plus", note: "Most-adopted", inCost: 0.325, outCost: 1.95 },
  { id: "deepseek/deepseek-v4-pro", label: "DeepSeek V4 Pro", note: "Flagship", inCost: 0.435, outCost: 0.87 },
  { id: "xiaomi/mimo-v2.5-pro", label: "MiMo V2.5 Pro", note: "Usage leader", inCost: 0.435, outCost: 0.87 },
  { id: "moonshotai/kimi-k2.6", label: "Kimi K2.6", note: "Open-weights king", inCost: 0.684, outCost: 3.42 },
  { id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5", note: "Cheap Claude", inCost: 1, outCost: 5 },
  { id: "x-ai/grok-4.3", label: "Grok 4.3", note: "Fast frontier", inCost: 1.25, outCost: 2.5 },
];

// Premium — input > $3/M OR output > $5/M, sorted by input cost
export const PREMIUM_MODELS: ModelOption[] = [
  { id: "openai/gpt-5.1", label: "GPT-5.1", note: "Capable frontier", inCost: 1.25, outCost: 10 },
  { id: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash", note: "Fast & smart", inCost: 1.5, outCost: 9 },
  { id: "openai/gpt-5.2", label: "GPT-5.2", note: "Frontier", inCost: 1.75, outCost: 14 },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", note: "Huge context", inCost: 2, outCost: 12 },
  { id: "openai/gpt-5.4", label: "GPT-5.4", note: "Capable GPT", inCost: 2.5, outCost: 15 },
  { id: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6", note: "Most-used frontier", inCost: 3, outCost: 15 },
  { id: "anthropic/claude-opus-4.8", label: "Claude Opus 4.8", note: "#1 intelligence", inCost: 5, outCost: 25 },
  { id: "openai/gpt-5.5", label: "GPT-5.5", note: "Frontier", inCost: 5, outCost: 30 },
  { id: "openai/gpt-5.5-pro", label: "GPT-5.5 Pro", note: "Max effort", inCost: 30, outCost: 180 },
];

/** "$0.10 / $0.40" (in/out per 1M tokens) or "free". */
export function fmtCost(inCost: number, outCost: number): string {
  if (inCost === 0 && outCost === 0) return "free";
  const f = (n: number) =>
    n >= 1 && Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
  return `${f(inCost)} / ${f(outCost)}`;
}
export function costLabel(m: ModelOption): string {
  return fmtCost(m.inCost, m.outCost);
}

/** Which tier a model falls into, by the same 2-D rule used for the lists. */
export function tierFor(inCost: number, outCost: number): "free" | "affordable" | "premium" {
  if (inCost === 0 && outCost === 0) return "free";
  if (inCost <= 3 && outCost <= 5) return "affordable";
  return "premium";
}

/** When this curated list was last reviewed against the model meta. */
export const MODELS_UPDATED = "Jun 2026";

export const MODELS: ModelOption[] = [
  ...FREE_MODELS,
  ...AFFORDABLE_MODELS,
  ...PREMIUM_MODELS,
];

// model-id provider prefix → vendored lobehub icon slug (public/model-icons/<slug>.svg)
const PROVIDER_ICON: Record<string, string> = {
  openai: "openai",
  anthropic: "claude",
  google: "gemini",
  "x-ai": "grok",
  deepseek: "deepseek",
  qwen: "qwen",
  moonshotai: "kimi",
  minimax: "minimax",
  mistralai: "mistral",
  "meta-llama": "meta",
  "z-ai": "chatglm",
  stepfun: "stepfun",
};

/** Path to the provider logo for a model id, or null (→ fall back to a dot). */
export function providerIconSrc(id: string): string | null {
  const slug = PROVIDER_ICON[id.split("/")[0]];
  return slug ? `/model-icons/${slug}.svg` : null;
}

export function labelFor(id: string): string {
  const known = MODELS.find((m) => m.id === id);
  if (known) return known.label;
  // prettify a custom id: "openai/gpt-oss-120b:free" -> "gpt-oss-120b"
  return (id.split("/").pop() ?? id).replace(/:free$/, "");
}
