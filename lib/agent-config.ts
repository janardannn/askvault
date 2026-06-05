/**
 * User-customizable agent behavior. The read-only "find notes in your vault"
 * base prompt stays LOCKED in code (lib/agent.ts); this only ADDS guidance on
 * top of it — a few curated presets plus a free-form note — persisted locally
 * and injected as an extra system message before each model call. Nothing here
 * can remove the find-notes framing or the never-write guarantee (which is
 * enforced by the toolset, not the prompt, anyway).
 */

export interface AgentPreset {
  id: string;
  label: string;
  hint: string; // shown under the label in the panel
  instruction: string; // appended to the system prompt when enabled
}

// Utility — how notes are found, filtered, and formatted.
export const UTILITY_PRESETS: AgentPreset[] = [
  {
    id: "cite-paths",
    label: "Cite exact paths",
    hint: "Name the full note path for every reference",
    instruction:
      "Always name the full vault-relative path (ending in .md) for every note you mention.",
  },
  {
    id: "quote-lines",
    label: "Quote matching lines",
    hint: "Show the relevant line(s), not just a summary",
    instruction:
      "When a note matches, quote the specific line(s) that matched, not only a paraphrase.",
  },
  {
    id: "prefer-recent",
    label: "Prefer recent notes",
    hint: "Lead with the most recently edited",
    instruction:
      "When several notes are relevant, lead with the most recently edited ones and say how recent they are.",
  },
  {
    id: "group-by-date",
    label: "Group by date",
    hint: "Order dated entries chronologically",
    instruction:
      "When results are dated entries, group and order them chronologically and label each with its date.",
  },
  {
    id: "backlinks",
    label: "Backlink-aware",
    hint: "Notice [[wikilinks]] between notes",
    instruction:
      "Pay attention to [[wikilinks]] inside notes and surface the related notes they connect to.",
  },
  {
    id: "terse",
    label: "Be terse",
    hint: "Short, no preamble",
    instruction:
      "Be terse. Skip preamble and pleasantries; answer directly in as few words as the task allows.",
  },
  {
    id: "no-guess",
    label: "Flag no matches",
    hint: "No invented or half-relevant results",
    instruction:
      "If nothing in the vault genuinely matches, say so plainly instead of offering weak or invented matches.",
  },
];

// Behavior — the analytical lens and tone it brings to your notes.
export const BEHAVIOR_PRESETS: AgentPreset[] = [
  {
    id: "themes",
    label: "Patterns & themes",
    hint: "Surface recurring threads across notes",
    instruction:
      "Look across the notes for recurring themes, patterns, and contradictions, and point them out with the specific notes that evidence them.",
  },
  {
    id: "evolution",
    label: "How my thinking evolved",
    hint: "Trace shifts on a topic over time",
    instruction:
      "Show how the user's thinking on a topic has evolved over time, citing the dated notes that mark the shifts.",
  },
  {
    id: "contradictions",
    label: "Blind spots & contradictions",
    hint: "Call out what I avoid or repeat",
    instruction:
      "Actively surface contradictions, blind spots, and patterns the user seems to avoid, deny, or repeat across notes.",
  },
  {
    id: "mood",
    label: "Emotional tone",
    hint: "Notice mood and how it shifts",
    instruction:
      "Notice the emotional tone of entries and how the user's mood shifts over time; mention notable changes and what surrounds them.",
  },
  {
    id: "connect",
    label: "Connect distant ideas",
    hint: "Link seemingly unrelated notes",
    instruction:
      "Make non-obvious connections between ideas in distant, seemingly unrelated notes.",
  },
  {
    id: "socratic",
    label: "Ask questions back",
    hint: "Probe with questions, Socratic",
    instruction:
      "Be Socratic: ask probing, clarifying questions back to deepen the user's reflection rather than only answering.",
  },
  {
    id: "devils-advocate",
    label: "Challenge me",
    hint: "Play devil's advocate",
    instruction:
      "Play devil's advocate: respectfully challenge the user's assumptions and conclusions where the notes warrant it.",
  },
  {
    id: "coach",
    label: "Action-oriented",
    hint: "Suggest concrete next steps",
    instruction:
      "Act as an action-oriented coach: after analysis, suggest concrete next steps the notes point toward.",
  },
  {
    id: "reflective",
    label: "Warm & reflective",
    hint: "A thoughtful journal companion",
    instruction:
      "Respond like a thoughtful, empathetic journal companion — warm and reflective, without being saccharine.",
  },
  {
    id: "blunt",
    label: "Brutally honest",
    hint: "Direct, no sugar-coating",
    instruction:
      "Be brutally honest and direct; don't soften hard truths the notes reveal, but stay constructive.",
  },
];

export const AGENT_PRESETS: AgentPreset[] = [
  ...UTILITY_PRESETS,
  ...BEHAVIOR_PRESETS,
];

export interface AgentConfig {
  presets: string[]; // enabled preset ids
  custom: string; // free-form extra instructions
}

export const EMPTY_AGENT_CONFIG: AgentConfig = { presets: [], custom: "" };

const KEY = "askvault.agentConfig";

export function loadAgentConfig(): AgentConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY_AGENT_CONFIG;
    const p = JSON.parse(raw);
    return {
      presets: Array.isArray(p?.presets)
        ? p.presets.filter((x: unknown) => typeof x === "string")
        : [],
      custom: typeof p?.custom === "string" ? p.custom : "",
    };
  } catch {
    return EMPTY_AGENT_CONFIG;
  }
}

export function saveAgentConfig(cfg: AgentConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg));
}

/** Build the extra system text from a config, or "" if nothing is customized. */
export function buildExtraInstructions(cfg: AgentConfig): string {
  const lines: string[] = [];
  for (const id of cfg.presets) {
    const p = AGENT_PRESETS.find((x) => x.id === id);
    if (p) lines.push(`- ${p.instruction}`);
  }
  const custom = cfg.custom.trim();
  const blocks: string[] = [];
  if (lines.length)
    blocks.push("Additional user preferences:\n" + lines.join("\n"));
  if (custom) blocks.push("The user also added these instructions:\n" + custom);
  return blocks.join("\n\n");
}

export function isCustomized(cfg: AgentConfig): boolean {
  return cfg.presets.length > 0 || cfg.custom.trim().length > 0;
}
