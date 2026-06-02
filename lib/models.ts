/** Curated free, tool-capable models on OpenRouter for the in-app switcher. */
export interface ModelOption {
  id: string;
  label: string;
  note: string;
}

export const MODELS: ModelOption[] = [
  {
    id: "openai/gpt-oss-120b:free",
    label: "GPT-OSS 120B",
    note: "Strong default · reliable tools",
  },
  {
    id: "openai/gpt-oss-20b:free",
    label: "GPT-OSS 20B",
    note: "Lighter & faster",
  },
  {
    id: "qwen/qwen3-next-80b-a3b-instruct:free",
    label: "Qwen3 Next 80B",
    note: "Capable all-rounder",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Llama 3.3 70B",
    note: "Well-rounded",
  },
  {
    id: "z-ai/glm-4.5-air:free",
    label: "GLM 4.5 Air",
    note: "Snappy",
  },
  {
    id: "moonshotai/kimi-k2.6:free",
    label: "Kimi K2.6",
    note: "Long-context",
  },
];

export function labelFor(id: string): string {
  const known = MODELS.find((m) => m.id === id);
  if (known) return known.label;
  // prettify a custom id: "openai/gpt-oss-120b:free" -> "gpt-oss-120b"
  return (id.split("/").pop() ?? id).replace(/:free$/, "");
}
