import { COPYWRITING_SKILL } from "./copywriting";
import { PRODUCT_SETUP_SKILL } from "./product_setup";

export interface Skill {
  name: string;
  content: string;
}

export const SKILLS: Skill[] = [
  { name: "copywriting", content: COPYWRITING_SKILL },
  { name: "product_setup", content: PRODUCT_SETUP_SKILL },
] as const;

export type SkillNames = (typeof SKILLS)[number]["name"];
