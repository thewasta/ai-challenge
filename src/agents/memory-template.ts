export const MEMORY_SECTIONS = [
  "## Contexto / Objetivo",
  "## Datos Clave / Hallazgos",
  "## Decisión / Acción Tomada",
  "## Siguientes Pasos / Impacto",
] as const;

export const MEMORY_TEMPLATE = `${MEMORY_SECTIONS[0]}
[Describe el contexto o el objetivo de esta memoria]

${MEMORY_SECTIONS[1]}
[Resume los datos, métricas o hallazgos relevantes]

${MEMORY_SECTIONS[2]}
[Explica la decisión tomada o la acción ejecutada]

${MEMORY_SECTIONS[3]}
[Enumera los próximos pasos, riesgos o impacto esperado]`;

export interface MemoryValidationResult {
  valid: boolean;
  missingSections: string[];
}

export function validateMemoryContent(content: string): MemoryValidationResult {
  const missingSections = MEMORY_SECTIONS.filter((section) => !content.includes(section));

  return {
    valid: missingSections.length === 0,
    missingSections: [...missingSections],
  };
}
