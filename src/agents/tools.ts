import { openai } from "@ai-sdk/openai";
import { ToolLoopAgent, tool } from "ai";
import { z } from "zod";
import { ORCHESTRATOR_PROMPT, SUB_AGENT_PROMPT } from "@/agents/prompts";
import { SKILLS } from "@/skills";

// ── Sub-agent definition ──
export const subAgent = new ToolLoopAgent({
  model: openai("gpt-4o-mini"),
  instructions: SUB_AGENT_PROMPT,
  tools: {},
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
    "Delegates a task to a sub-agent for processing. Use when the user's message starts with [DELEGATE].",
  inputSchema: z.object({
    task: z.string().describe("The task to delegate to the sub-agent"),
  }),
  execute: async ({ task }, { abortSignal }) => {
    const result = await subAgent.generate({
      prompt: task,
      abortSignal,
    });
    return result.text;
  },
});

// ── Orchestrator Agent ──
export const orchestratorAgent = new ToolLoopAgent({
  model: openai("gpt-4o-mini"),
  instructions: ORCHESTRATOR_PROMPT,
  tools: {
    load_skill: loadSkillTool,
    delegate_to_subagent: delegateToSubagentTool,
  },
});
