import {
  Headphones,
  BarChart3,
  BookOpen,
  Workflow,
  Code2,
  Telescope,
  type LucideIcon,
} from "lucide-react";
import type { AgentCategory } from "@/lib/api/types";

export const CATEGORY_META: Record<
  AgentCategory,
  { label: string; icon: LucideIcon; hue: string }
> = {
  support: { label: "Support", icon: Headphones, hue: "#22D3EE" },
  analytics: { label: "Analytics", icon: BarChart3, hue: "#818CF8" },
  knowledge: { label: "Knowledge", icon: BookOpen, hue: "#34D399" },
  automation: { label: "Automation", icon: Workflow, hue: "#FBBF24" },
  coding: { label: "Coding", icon: Code2, hue: "#FB7185" },
  research: { label: "Research", icon: Telescope, hue: "#A5ACFF" },
};

export const MODELS = [
  "claude-opus-4-8",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
  "claude-fable-5",
];

export const OUTPUT_TYPES = ["text", "markdown", "json", "table", "chart"] as const;

export const CATEGORIES = Object.keys(CATEGORY_META) as AgentCategory[];
