import { openai } from "@ai-sdk/openai";
import { ToolLoopAgent, tool } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { DATAFORSEO_PROMPT, ORCHESTRATOR_PROMPT, SUB_AGENT_PROMPT } from "@/agents/prompts";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { SKILLS } from "@/skills";

type SearchIntent = "Informational" | "Navigational" | "Commercial" | "Transactional";

interface IntentRange {
  min: number;
  max: number;
}

interface ModifierPattern {
  pattern: string;
  intent: SearchIntent;
}

interface KeywordVolume {
  keyword: string;
  search_volume: number;
}

interface KeywordDifficulty {
  keyword: string;
  keyword_difficulty: number;
}

interface KeywordCpc {
  keyword: string;
  cpc: number;
}

interface KeywordIntent {
  keyword: string;
  search_intent: SearchIntent;
}

interface KeywordIdea {
  seed_keyword: string;
  ideas: string[];
}

const INTENT_KEYWORDS: Record<SearchIntent, string[]> = {
  Transactional: ["comprar", "baratas", "precio", "oferta", "descuento"],
  Navigational: ["cerca", "tienda", "amazon", "dónde", "outlet", "mercadolibre"],
  Commercial: ["mejores", "opiniones", "vs", "top", "calidad", "comparativa"],
  Informational: ["cómo", "qué", "guía", "para qué", "beneficios", "funciona", "elegir"],
};

const MODIFIER_PATTERNS: ModifierPattern[] = [
  { pattern: "comprar {keyword}", intent: "Transactional" },
  { pattern: "{keyword} baratas", intent: "Transactional" },
  { pattern: "precio {keyword}", intent: "Transactional" },
  { pattern: "oferta {keyword}", intent: "Transactional" },
  { pattern: "{keyword} descuento", intent: "Transactional" },
  { pattern: "mejores {keyword}", intent: "Commercial" },
  { pattern: "{keyword} opiniones", intent: "Commercial" },
  { pattern: "{keyword} vs", intent: "Commercial" },
  { pattern: "top {keyword}", intent: "Commercial" },
  { pattern: "{keyword} calidad precio", intent: "Commercial" },
  { pattern: "cómo elegir {keyword}", intent: "Informational" },
  { pattern: "qué {keyword} comprar", intent: "Informational" },
  { pattern: "para qué sirve {keyword}", intent: "Informational" },
  { pattern: "cómo funciona {keyword}", intent: "Informational" },
  { pattern: "{keyword} beneficios", intent: "Informational" },
  { pattern: "{keyword} cerca de mí", intent: "Navigational" },
  { pattern: "{keyword} tienda", intent: "Navigational" },
  { pattern: "{keyword} Amazon", intent: "Navigational" },
  { pattern: "dónde comprar {keyword}", intent: "Navigational" },
  { pattern: "{keyword} MercadoLibre", intent: "Navigational" },
];

const CPC_RANGES: Record<SearchIntent, IntentRange> = {
  Informational: { min: 0.1, max: 1.5 },
  Navigational: { min: 0.5, max: 2 },
  Commercial: { min: 1.5, max: 4 },
  Transactional: { min: 3, max: 8 },
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;

const shuffleItems = <T>(items: T[]) => {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
};

const simulateLatency = async (): Promise<void> => {
  const delay = 1000 + randomInt(0, 1500);
  await new Promise((resolve) => setTimeout(resolve, delay));
};

const detectSearchIntent = (keyword: string): SearchIntent => {
  const normalizedKeyword = keyword.toLowerCase();
  const orderedIntents: SearchIntent[] = [
    "Transactional",
    "Navigational",
    "Commercial",
    "Informational",
  ];

  for (const intent of orderedIntents) {
    if (INTENT_KEYWORDS[intent].some((pattern) => normalizedKeyword.includes(pattern))) {
      return intent;
    }
  }

  return "Informational";
};

const generateKeywordDifficulty = () => {
  const value = Math.random() < 0.7 ? randomInt(50, 90) : randomInt(10, 49);

  return Math.max(0, Math.min(100, value));
};

const generateCpc = (intent: SearchIntent) => {
  const { min, max } = CPC_RANGES[intent];
  return Number.parseFloat(randomFloat(min, max).toFixed(2));
};

// ── Sub-agent: General-purpose ──
export const subAgent = new ToolLoopAgent({
  model: openai("gpt-4o-mini"),
  instructions: SUB_AGENT_PROMPT,
  tools: {},
});

// ── DataForSEO Tools ──
export const getKeywordIdeasTool = tool({
  description:
    "Generates five mock keyword ideas with diverse search intent variations for a seed keyword.",
  inputSchema: z.object({
    keyword: z.string().min(2),
  }),
  execute: async ({ keyword }): Promise<KeywordIdea> => {
    const intents: SearchIntent[] = [
      "Transactional",
      "Commercial",
      "Informational",
      "Navigational",
    ];

    const selectedPatterns = intents.map((intent) => {
      const patterns = MODIFIER_PATTERNS.filter((pattern) => pattern.intent === intent);
      return patterns[randomInt(0, patterns.length - 1)];
    });

    const usedPatterns = new Set(selectedPatterns.map((pattern) => pattern.pattern));
    const bonusCandidates = MODIFIER_PATTERNS.filter(
      (pattern) => !usedPatterns.has(pattern.pattern),
    );
    const bonusPattern = bonusCandidates[randomInt(0, bonusCandidates.length - 1)];

    const ideas = shuffleItems([...selectedPatterns, bonusPattern]).map(({ pattern }) =>
      pattern.replaceAll("{keyword}", keyword),
    );

    await simulateLatency();

    return {
      seed_keyword: keyword,
      ideas,
    };
  },
});

export const getSearchVolumeTool = tool({
  description: "Generates mock search volume data for a list of keywords.",
  inputSchema: z.object({
    keywords: z.array(z.string()),
  }),
  execute: async ({ keywords }): Promise<{ results: KeywordVolume[] }> => {
    const results = keywords.map((keyword) => ({
      keyword,
      search_volume: Math.round(randomInt(100, 25000) / 10) * 10,
    }));

    await simulateLatency();

    return { results };
  },
});

export const getKeywordDifficultyTool = tool({
  description: "Generates mock keyword difficulty scores for a list of keywords.",
  inputSchema: z.object({
    keywords: z.array(z.string()),
  }),
  execute: async ({ keywords }): Promise<{ results: KeywordDifficulty[] }> => {
    const results = keywords.map((keyword) => ({
      keyword,
      keyword_difficulty: generateKeywordDifficulty(),
    }));

    await simulateLatency();

    return { results };
  },
});

export const getCpcDataTool = tool({
  description: "Generates mock CPC data for keywords based on detected search intent.",
  inputSchema: z.object({
    keywords: z.array(z.string()),
  }),
  execute: async ({ keywords }): Promise<{ results: KeywordCpc[] }> => {
    const results = keywords.map((keyword) => ({
      keyword,
      cpc: generateCpc(detectSearchIntent(keyword)),
    }));

    await simulateLatency();

    return { results };
  },
});

export const getSearchIntentTool = tool({
  description: "Classifies mock search intent for each keyword in a list.",
  inputSchema: z.object({
    keywords: z.array(z.string()),
  }),
  execute: async ({ keywords }): Promise<{ results: KeywordIntent[] }> => {
    const results = keywords.map((keyword) => ({
      keyword,
      search_intent: detectSearchIntent(keyword),
    }));

    await simulateLatency();

    return { results };
  },
});

// ── Sub-agent: DataForSEO Specialist ──
export const dataforseoAgent = new ToolLoopAgent({
  model: openai("gpt-4o-mini"),
  instructions: DATAFORSEO_PROMPT,
  tools: {
    get_keyword_ideas: getKeywordIdeasTool,
    get_search_volume: getSearchVolumeTool,
    get_keyword_difficulty: getKeywordDifficultyTool,
    get_cpc_data: getCpcDataTool,
    get_search_intent: getSearchIntentTool,
  },
});

// ── Tool: load_skill ──
export const loadSkillTool = tool({
  description:
    "Loads the instructions for a specific skill. Use when the user asks about a particular capability.",
  inputSchema: z.object({
    skillName: z.string().describe("The name of the skill to load"),
  }),
  execute: async ({ skillName }) => {
    const skill = SKILLS.find((s) => s.name === skillName);
    if (!skill) {
      return `Error: Skill "${skillName}" not found. Available skills: ${SKILLS.map((s) => s.name).join(", ")}`;
    }
    return skill.content;
  },
});

// ── Tool: delegate_to_subagent ──
export const delegateToSubagentTool = tool({
  description:
    'Delegates a task to a sub-agent. Use target "general" for generic tasks or "dataforseo" for SEO keyword research, clustering, and planning.',
  inputSchema: z.object({
    target: z
      .enum(["general", "dataforseo"])
      .describe("Which sub-agent to delegate to: general or dataforseo"),
    task: z.string().describe("The task to delegate to the sub-agent"),
  }),
  execute: async ({ target, task }, { abortSignal }) => {
    const agent = target === "dataforseo" ? dataforseoAgent : subAgent;

    const result = await agent.generate({
      prompt: task,
      abortSignal,
    });
    return result.text;
  },
});

// ── Tool: get_project_overview (request-scoped) ──
function createGetProjectOverviewTool(projectId: number) {
  return tool({
    description:
      "Gets the current project context including name, description, buyer persona, competitors, and brand context.",
    inputSchema: z.object({}),
    execute: async () => {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
      });

      if (!project) return "Error: Project not found.";

      return JSON.stringify({
        id: project.id,
        name: project.name,
        description: project.description,
        buyerPersona: project.buyerPersona,
        competitors: project.competitors,
        brandContext: project.brandContext,
      });
    },
  });
}

// ── Tool: set_project_overview (request-scoped) ──
function createSetProjectOverviewTool(projectId: number) {
  return tool({
    description:
      "Updates the project context. Only provided fields will be updated; omitted fields remain unchanged.",
    inputSchema: z.object({
      name: z.string().optional().describe("Project/brand name"),
      description: z.string().optional().describe("Brief product or brand description"),
      buyerPersona: z.string().optional().describe("Target buyer persona description"),
      competitors: z.string().optional().describe("Main competitors list"),
      brandContext: z.string().optional().describe("Additional brand context as a JSON string"),
    }),
    execute: async (input) => {
      const updateData: Record<string, string> = {};

      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.buyerPersona !== undefined) updateData.buyerPersona = input.buyerPersona;
      if (input.competitors !== undefined) updateData.competitors = input.competitors;
      if (input.brandContext !== undefined) updateData.brandContext = input.brandContext;

      if (Object.keys(updateData).length === 0) return "No fields provided to update.";

      await db.update(projects).set(updateData).where(eq(projects.id, projectId));

      return "Project context updated successfully.";
    },
  });
}

// ── Orchestrator Agent (request-scoped factory) ──
export function createOrchestratorAgent(projectId: number) {
  return new ToolLoopAgent({
    model: openai("gpt-4o-mini"),
    instructions: ORCHESTRATOR_PROMPT,
    tools: {
      load_skill: loadSkillTool,
      delegate_to_subagent: delegateToSubagentTool,
      get_project_overview: createGetProjectOverviewTool(projectId),
      set_project_overview: createSetProjectOverviewTool(projectId),
    },
  });
}
