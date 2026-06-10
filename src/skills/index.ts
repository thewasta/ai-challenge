import { TESTING_SKILL_CONTENT } from "./testing-skill";

export interface Skill {
  name: string;
  content: string;
}

export const SKILLS: Skill[] = [{ name: "testing_skill", content: TESTING_SKILL_CONTENT }] as const;

export type SkillNames = (typeof SKILLS)[number]["name"];
