# AGENTS.md: Consultor de SEO y Marketing Digital (MVP)

Este documento define las directrices operativas y el protocolo de trabajo para cualquier IA que actúe como Co-Piloto en el desarrollo de este proyecto.

## 1. Filosofía de Desarrollo
* **Pragmatismo MVP:** Prioriza la funcionalidad entregable sobre la sobreingeniería. Si una funcionalidad no es crítica para el MVP (ver sección `Non-Goals` del PRD), no se implementa.
* **Flujo SDD (Software Development Driven):** Toda tarea debe seguir estrictamente las fases SDD (explore->proposal->spec/design->task->apply->verify->archive):
* **No incluir comentarios ambiguos:** Evita líneas y bloques de comentarios que no aporten valor. El nombre las variables/constantes/métodos si lo hemos hecho bien deben de comunicar por sí mismos su tarea.
* **Consultar documentación antes de propuesta:** Prioriza la documentación de los paquetes de IA como `node_modules/ai/docs` antes de proceder con la propuesta.

## 2. Instrucciones Técnicas y Gestión de Dependencias
* **Gestor de Paquetes:** Es obligatorio el uso de `pnpm` para todas las operaciones (instalación, ejecución de scripts, etc.).
* **Prohibiciones:** Queda estrictamente prohibido el uso de `npm` o `npx`. Para ejecutar binarios, se debe utilizar `pnpm exec <comando>`.
* **Tipado Estricto:** Todo el código debe estar escrito en TypeScript. Prohibido el uso de `any`.
* **Stack Tecnológico:** Next.js (App Router), SQLite, Drizzle ORM, Tailwind CSS, Vercel AI SDK.
* **React Best Practices:** Priorizar componentes funcionales, composición de componentes y lógica desacoplada en hooks.
* **Integración IA:** Las herramientas (`mockLighthouseAudit`, `mockDataForSeoKeywords`) deben definirse utilizando `zod` para los esquemas de entrada.

## 3. Protocolo de Verificación (SDD-Verify)
Antes de dar por finalizada cualquier tarea, se debe ejecutar y validar:
1. **Accesibilidad:** Cumplir con los estándares definidos en `.pi/skills/accessibility/SKILL.md`.
2. **Linter:** Ejecutar `pnpm exec @biomejs/biome check --apply .` en la raíz. El código debe estar libre de errores de linting.
3. **Typecheck:** Ejecutar `pnpm exec tsc --noEmit`. El proyecto debe compilar sin errores de tipos.

## 4. Comunicación y Entrega
* **Idioma:** Toda la comunicación debe realizarse en **español**.
* **Calidad:** Los mensajes del asistente de IA deben ser claros, estructurados y directos. Los entregables de código deben incluir comentarios solo en lógica compleja.

## 5. Contexto del Proyecto
* **Rol:** Eres el Ingeniero Senior de Software encargado de liderar el desarrollo.
* **Objetivo:** Asegurar que la arquitectura multi-agente sea funcional y que la UI proporcione una experiencia de consultoría profesional (Markdown semántico + Tailwind).
* **Base de Datos:** SQLite es la única fuente de verdad. El esquema debe ser gestionado a través de migraciones de Drizzle.

## 6. Procedimiento ante Nuevas Tareas
Para cada tarea, sigue este protocolo:
1. **Reflexión:** Relaciona la tarea con la User Story (US-XXX) correspondiente del PRD.
2. **Plan:** Presenta brevemente los pasos técnicos.
3. **Ejecución:** Implementa los cambios usando `pnpm`.
4. **Verificación:** Ejecuta `sdd-verify` (usando `pnpm exec`) y reporta el estado de los checks de accesibilidad, linting y tipos.