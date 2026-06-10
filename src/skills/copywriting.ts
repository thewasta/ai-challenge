export const COPYWRITING_SKILL = `
# Skill: Copywriting (Redacción de Contenido SEO)

## Objetivo
Redactar artículos y contenido web optimizado para SEO usando un sub-agente especializado (Copywriter SEO Senior) que sigue un flujo obligatorio de dos fases con validación E-E-A-T.

## Cuándo Usar Esta Skill
Activá esta skill cuando el usuario pida:
- "Escribir un artículo sobre..."
- "Crear contenido para..."
- "Redactar un blog post..."
- "Necesito contenido SEO..."
- Cualquier solicitud de redacción de contenido largo o copywriting.

## Flujo de Trabajo del Orquestador

### Paso 1: Verificar Datos de Palabras Clave
Antes de delegar al Copywriter, verificá si ya existen datos de keywords en el contexto.
- Usá \`get_project_overview\` para revisar el contexto del proyecto.
- Si el contexto NO contiene keywords relevantes para el tema solicitado, DELEGÁ PRIMERO a \`target="dataforseo"\` con una tarea como: "Investiga palabras clave para [tema solicitado por el usuario]. Necesito volumen, dificultad, CPC e intención de búsqueda."
- Una vez que tengas los resultados de DataForSEO, procedé al Paso 2.

### Paso 2: Delegar al Copywriter (Fase 1 — Brief)
Delegá al sub-agente copywriter usando \`delegate_to_subagent\` con \`target="copywriter"\`.
La tarea debe incluir:
- Los resultados de palabras clave (o las keywords relevantes si ya existían).
- El contexto completo del proyecto (nombre, descripción, buyer persona, competidores, brand context).
- La solicitud específica del usuario.

**Importante:** El Copywriter va a generar un Content Brief y después va a FRENARSE para preguntarle al usuario por su experiencia personal (E-E-A-T). El orquestador debe mostrar esta pregunta al usuario tal cual la genera el Copywriter.

### Paso 3: Seguimiento E-E-A-T (Fase 2 — Redacción)
Cuando el usuario responda con su experiencia personal, DELEGÁ NUEVAMENTE al Copywriter (\`target="copywriter"\`) pasándole:
- La respuesta textual del usuario (su experiencia E-E-A-T).
- Un breve recordatorio del brief generado anteriormente (o simplemente indicá que es la Fase 2).

El Copywriter automáticamente detectará que está en Fase 2 y redactará el contenido final aplicando todas las restricciones de calidad, inclusión de experiencia e integración de keywords.
`;
