# Proposal: Agent Tools & Sub-Agents Setup

**Change:** `agent-tools-subagents-setup`  
**Status:** draft  
**PRD Coverage:** FR-3 (múltiples herramientas en sesión), Sección 5 (Indicadores de Acción)  
**User Story:** US-AGENT-001 — El usuario interactúa con el chat y observa indicadores visuales cuando el agente usa herramientas o delega a un sub-agente

## 1. Problem Statement

El chat actual tiene un agente conversacional "tonto" — sin tools, sin capacidad de delegar, y la UI no comunica qué está haciendo el agente internamente. El PRD exige un orquestador multi-agente con herramientas integradas, pero antes de implementar los agentes especializados completos (redactor, auditor, estratega), necesitamos sentar la infraestructura base:

- El agente debe poder cargar skills desde el repositorio (tool `load_skill`)
- El agente debe poder delegar a un sub-agente básico cuando el usuario lo solicite explícitamente mediante el tag `[DELEGATE]`
- La UI debe notificar al usuario cuando el agente está "trabajando" (usando tools, delegando) para evitar la percepción de error por pantalla en blanco

## 2. Proposed Solution

### 2.1 Estructura de archivos

```
src/
  skills/
    index.ts              ← barrel export con array SKILLS y tipo SkillNames
    testing-skill.ts      ← skill de ejemplo
  agents/
    prompts/
      index.ts            ← barrel export
      orchestrator.ts     ← system prompt del agente principal (orquestador)
      sub-agent.ts        ← system prompt del sub-agente básico
```

### 2.2 Tool: `load_skill`

- **Schema (Zod):** `{ skillName: z.enum([...SkillNames]) }`
- **Execute:** Busca en el array `SKILLS` (importado del barrel) y devuelve el `content` de la skill correspondiente
- **Error handling:** Si el nombre no coincide, devuelve mensaje de error claro
- **MVP scope:** Una sola skill de ejemplo (`testing-skill`) para validar el mecanismo

### 2.3 Sub-agente vía `[DELEGATE]` tag

- El system prompt del orquestador instruye: si el mensaje del usuario comienza con `[DELEGATE]`, debe usar la tool `delegate_to_subagent`
- **Tool: `delegate_to_subagent`**
  - **Schema:** `{ task: z.string() }` — la tarea a delegar
  - **Execute:** Llama a `generateText` con el system prompt del sub-agente y la tarea, y devuelve el resultado
  - El sub-agente por ahora es un agente "básico" con un system prompt mínimo (sin tools propias)
- La respuesta del sub-agente se integra en el flujo normal del chat, sin diferenciación visual

### 2.4 UI: Indicadores de actividad

Se añaden notificaciones visuales en el área de chat para comunicar actividad interna:

1. **Tool usage:** Cuando el agente invoca una tool, se muestra un indicador tipo "🔧 Usando herramienta: load_skill..."
2. **Delegación:** Cuando se usa `[DELEGATE]`, se muestra "🤝 Delegando a sub-agente..."
3. **Streaming normal:** Se mantiene el comportamiento actual de streaming

Estos indicadores serán **partes del mensaje del asistente** (aprovechando el sistema de `parts[]` del AI SDK) y/o un componente de estado flotante. El objetivo es pragmático: evitar que la UI quede en blanco mientras el agente procesa.

### 2.5 No se diferencia visualmente entre agente principal y sub-agente

La respuesta final del sub-agente se presenta como un mensaje normal del asistente. El usuario solo ve los indicadores de actividad como feedback de que "algo está pasando".

## 3. Scope & Boundaries

**In scope:**
- Carpeta `src/skills/` con barrel export y skill de ejemplo
- Carpeta `src/agents/prompts/` con barrel export y prompts de orquestador + sub-agente
- Tool `load_skill` integrada en el agente principal
- Tool `delegate_to_subagent` integrada en el agente principal
- System prompt del orquestador con instrucción de delegación
- UI: indicador de tool usage y delegación en el área de chat
- MessageBubble: soporte para renderizar parts de tipo tool (tool-invocation, tool-result)

**Out of scope:**
- Agentes especializados completos (redactor, auditor, estratega)
- Múltiples sub-agentes simultáneos
- Delegación automática (sin tag explícito)
- Skills reales de SEO (solo mecanismo de carga)
- Persistencia específica de tool calls (ya se persisten como parts del mensaje)

## 4. Success Criteria

- [ ] El agente responde correctamente cuando se le pide cargar una skill vía tool `load_skill`
- [ ] Al enviar `[DELEGATE] explicame qué es SEO`, el agente delega al sub-agente y devuelve una respuesta
- [ ] La UI muestra un indicador visual durante el uso de tools
- [ ] La UI muestra un indicador visual durante la delegación
- [ ] El typecheck pasa sin errores (`pnpm exec tsc --noEmit`)
- [ ] El linter pasa sin errores (`pnpm exec biome check .`)

## 5. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `generateText` dentro de `streamText` puede causar timeouts | Medium | Usar `maxDuration` generoso (60s) y manejar errores con fallback |
| La tool `delegate_to_subagent` puede generar respuestas largas que el orquestador repita textualmente | Low | Instruir al system prompt que resuma o presente el resultado sin repetir |
| El barrel export de skills puede crecer desordenadamente | Low | Estructura clara desde el inicio con tipo `SkillNames` union type |

## 6. Decisions (confirmed)

1. **Modelo sub-agente:** Mismo modelo que el orquestador (`gpt-4.1-nano`)
2. **Tag `[DELEGATE]`:** Case-insensitive (acepta `[DELEGATE]`, `[delegate]`, `[Delegate]`, etc.)
3. **Indicadores UI:** Banner sutil fijo sobre el input del chat que cambia según actividad (tool usage / delegación)
