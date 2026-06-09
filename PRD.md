# PRD: Consultor de SEO y Marketing Digital Multi-Agente (MVP)

## 1. Introducción / Descripción General

Este proyecto consiste en un MVP de una plataforma de chat con Inteligencia Artificial especializada en SEO y Marketing Digital que funciona como un equipo de consultores internos. 

Al iniciar, la aplicación ofrece una interfaz visual sencilla para dar de alta un proyecto/marca con su contexto (buyer persona, competidores, producto). Una vez creado el proyecto, el usuario accede a un chat interactivo. En este chat, un **Agente Orquestador** central recibe las peticiones del usuario y, con acceso total al contexto de la marca, delega tareas de forma transparente a **Agentes Especializados** (ej. redactor de contenido, auditor técnico, estratega de backlinks) y hace uso de herramientas integradas (Mocks de Google Lighthouse y DataForSEO). El agente genera entregables estructurados en formato Markdown que la UI renderiza de forma atractiva transformándolos en HTML.

---

## 2. Objetivos

- **Onboarding Guiado por UI:** Permitir la creación rápida de un perfil de marca antes de iniciar la interacción de chat mediante un formulario interactivo.
- **Orquestador Multi-Agente:** Implementar un flujo donde un agente central subdivide la tarea y delega el contexto a sub-prompts (agentes especializados) de forma automática.
- **Herramientas de SEO Integradas (Mockeadas):** Simular el uso de la API de DataForSEO y auditorías técnicas de Lighthouse sin sobrecomplicar la infraestructura inicial.
- **Renderizado Limpio de Entregables:** Mostrar planes, copys y auditorías utilizando Markdown enriquecido transformado a HTML.
- **Persistencia Ligera:** Almacenar proyectos, chats y mensajes en una base de datos local SQLite.

---

## 3. Historias de Usuario (User Stories)

### US-001: Configuración de Base de Datos y Modelos (SQLite + Drizzle)
**Description:** Como desarrollador, quiero definir y migrar el esquema de base de datos para almacenar proyectos, chats y mensajes persistentes.

**Acceptance Criteria:**
- [ ] Base de datos SQLite inicializada localmente mediante archivo `.db`.
- [ ] Esquema Drizzle definido con las tablas `projects` (con `brand_context` en formato texto/JSON), `chats` y `messages`.
- [ ] Scripts para ejecutar y aplicar migraciones de Drizzle de forma exitosa (`drizzle-kit push` o `generate`).
- [ ] Los tests de conexión y el typecheck de TypeScript pasan sin errores.

---

### US-002: Interfaz de Creación de Proyecto (UI de Onboarding)
**Description:** Como usuario nuevo, quiero una interfaz sencilla para ingresar los datos de mi marca para que el equipo de consultores de IA entienda mi negocio antes de empezar.

**Acceptance Criteria:**
- [ ] Ruta `/projects/new` que muestra un formulario con los campos: *Nombre del Proyecto*, *Descripción del Producto*, *Buyer Persona* y *Competidores Principales*.
- [ ] Validación de campos obligatorios en el cliente.
- [ ] Al hacer clic en "Crear Proyecto", los datos se guardan en la tabla `projects` de SQLite con estado listo para chatear.
- [ ] Tras guardar con éxito, redirige al usuario a la vista de chat de ese proyecto (`/projects/[id]/chat`).
- [ ] El typecheck y el linter de Next.js pasan sin errores.
- [ ] **[UI]** Verify in browser using dev-browser skill

---

### US-003: Interfaz de Chat con Renderizado Markdown a HTML
**Description:** Como consultor, quiero una interfaz de chat donde pueda hablar con la IA y ver los planes de marketing o auditorías en un formato Markdown limpio y bien estructurado (títulos, listas, tablas).

**Acceptance Criteria:**
- [ ] Ruta `/projects/[id]/chat` que recupera el historial de chat de la base de datos para ese proyecto.
- [ ] Caja de entrada de texto que permite enviar mensajes con la tecla Enter o botón de envío.
- [ ] Los mensajes del asistente de IA se transmiten en tiempo real (streaming).
- [ ] El contenido del mensaje de la IA se procesa con una librería de Markdown (como `react-markdown` o similar) para transformarse en HTML semántico (h1, h2, list, pre, code).
- [ ] Scroll automático hacia abajo cuando llega un nuevo mensaje/stream.
- [ ] El linter de React/TypeScript pasa correctamente.
- [ ] **[UI]** Verify in browser using dev-browser skill

---

### US-004: Agente Orquestador y Flujo de Delegación (Backend API)
**Description:** Como desarrollador de IA, quiero implementar el endpoint de chat en Next.js utilizando Vercel AI SDK que cargue el contexto de la marca y simule la delegación a sub-agentes según la consulta.

**Acceptance Criteria:**
- [ ] El endpoint `POST /api/chat` recibe el `projectId`, `chatId` y los mensajes previos.
- [ ] Consulta en base de datos SQLite el contexto de la marca (`brand_context`) y lo inyecta como `System Prompt` base.
- [ ] Si la consulta requiere una auditoría técnica, el orquestador delega y llama a la herramienta mock de `lighthouse`.
- [ ] Si la consulta requiere análisis de palabras clave, el orquestador delega y llama a la herramienta mock de `dataforseo`.
- [ ] Si la consulta requiere redactar, el orquestador invoca internamente un sub-prompt especializado ("Copywriter SEO") antes de generar la respuesta final al usuario.
- [ ] El endpoint devuelve una respuesta en streaming compatible con la UI.
- [ ] El código de backend pasa el typecheck de TypeScript.

---

### US-005: Mock de Herramientas SEO (Lighthouse & DataForSEO)
**Description:** Como desarrollador, quiero implementar mocks estables y dinámicos para las herramientas de Lighthouse y DataForSEO, de modo que el LLM pueda "usar herramientas" y recibir datos estructurados simulados de rendimiento y volumen de búsqueda.

**Acceptance Criteria:**
- [ ] Herramienta `mockLighthouseAudit` que acepta una `url` y devuelve en un JSON estructurado puntuaciones de SEO, Performance, Accesibilidad y una lista de 3 problemas críticos comunes basados en la URL.
- [ ] Herramienta `mockDataForSeoKeywords` que acepta una `keyword` y devuelve una lista de 4 palabras clave relacionadas con volúmenes de búsqueda simulados (ej: de 500 a 10,000 búsquedas/mes), KD (Keyword Difficulty) y CPC estimado.
- [ ] Ambas herramientas se ejecutan de manera asíncrona simulando latencia real de API (entre 1 y 1.5 segundos).
- [ ] Los resultados devueltos por las herramientas son entendidos por el LLM y resumidos en el chat con formato Markdown/tablas HTML.
- [ ] El linter y typecheck de TypeScript pasan con éxito.

---

## 4. Requerimientos Funcionales

- **FR-1:** El sistema debe restringir el inicio del chat si el proyecto no tiene completado su perfil inicial en la base de datos.
- **FR-2:** El backend debe guardar todos los mensajes (tanto del usuario como del asistente e interacciones de herramientas) en la tabla `messages` de SQLite para mantener la persistencia entre recargas.
- **FR-3:** El orquestador debe ser capaz de activar múltiples herramientas en la misma sesión de chat si el usuario lo solicita de manera conjunta (ej: *"Haz un análisis SEO de mi home y busca palabras clave para calzado"* activa ambas herramientas).
- **FR-4:** El formateador Markdown del frontend debe dar soporte CSS a tablas HTML, listas ordenadas/desordenadas y bloques de código para que los entregables se visualicen como informes de consultoría profesional.

---

## 5. Non-Goals (Fuera del Alcance del MVP)

- Ejecuciones reales de Chromium/Puppeteer en el backend para Lighthouse (reemplazado por Mocks completos).
- Conexiones por API real de pago a DataForSEO (reemplazado por Mocks completos).
- Gestión de usuarios, autenticación o pasarelas de pago (Uso monousuario local).
- Exportación directa de informes en archivos PDF o Word (se asume que el usuario puede copiar el Markdown generado o imprimir en pantalla).

---

## 6. Consideraciones de Diseño (UI/UX)

- **Estética Limpia de Consultoría:** Usar Tailwind CSS con una paleta de colores corporativa (azules oscuros, gris pizarra, esmeralda para éxitos y rojo/ámbar para fallos en las auditorías técnicas).
- **Indicadores de Acción (Loading states):** Mostrar visualmente cuándo el orquestador está "delegando" o "consultando a Lighthouse/DataForSEO" con un spinner o un texto dinámico (ej: *"Consultor Técnico ejecutando auditoría en ejemplo.com..."*).
- **Tarjetas de Proyecto:** Una barra lateral donde se listen los proyectos creados para saltar rápidamente de un cliente/marca a otro.

---

## 7. Consideraciones Técnicas

- **Base de Datos Embebida:** SQLite no requiere instalación de servidor externa, lo que facilita levantar el proyecto con un simple comando de Node.js.
- **Vercel AI SDK Core:** Aprovechar el soporte nativo de `tools` para declarar los esquemas Zod de entrada de Lighthouse y DataForSEO, simplificando la orquestación del LLM.

---

## 8. Métricas de Éxito del MVP

- Creación completa de un proyecto en menos de 1 minuto a través del formulario de Onboarding.
- El agente orquestador es capaz de detectar la intención del usuario y activar la herramienta correcta (Lighthouse o DataForSEO Mock) de forma autónoma el 100% de las veces.
- Renderizado de entregables complejos (tablas de palabras clave o listas de auditoría técnica) de manera legible sin desconfiguraciones en la UI del chat.

---

## 9. Preguntas Abiertas / Por Definir

- ¿Qué modelo de IA específico (Claude 3.5 Sonnet, GPT-4o, Gemini 1.5 Pro) se utilizará para optimizar la relación calidad-precio y la precisión en llamadas a herramientas?
- ¿Permitiremos que el usuario edite la información de marca guardada en SQLite a mitad de una conversación si cambian las prioridades de su negocio?