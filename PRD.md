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

## 3. Requerimientos Funcionales

- **FR-1:** El sistema debe restringir el inicio del chat si el proyecto no tiene completado su perfil inicial en la base de datos.
- **FR-2:** El backend debe guardar todos los mensajes (tanto del usuario como del asistente e interacciones de herramientas) en la tabla `messages` de SQLite para mantener la persistencia entre recargas.
- **FR-3:** El orquestador debe ser capaz de activar múltiples herramientas en la misma sesión de chat si el usuario lo solicita de manera conjunta (ej: *"Haz un análisis SEO de mi home y busca palabras clave para calzado"* activa ambas herramientas).
- **FR-4:** El formateador Markdown del frontend debe dar soporte CSS a tablas HTML, listas ordenadas/desordenadas y bloques de código para que los entregables se visualicen como informes de consultoría profesional.

---

## 4. Non-Goals (Fuera del Alcance del MVP)

- Ejecuciones reales de Chromium/Puppeteer en el backend para Lighthouse (reemplazado por Mocks completos).
- Conexiones por API real de pago a DataForSEO (reemplazado por Mocks completos).
- Gestión de usuarios, autenticación o pasarelas de pago (Uso monousuario local).
- Exportación directa de informes en archivos PDF o Word (se asume que el usuario puede copiar el Markdown generado o imprimir en pantalla).

---

## 5. Consideraciones de Diseño (UI/UX)

- **Estética Limpia de Consultoría:** Usar Tailwind CSS con una paleta de colores corporativa (azules oscuros, gris pizarra, esmeralda para éxitos y rojo/ámbar para fallos en las auditorías técnicas).
- **Indicadores de Acción (Loading states):** Mostrar visualmente cuándo el orquestador está "delegando" o "consultando a Lighthouse/DataForSEO" con un spinner o un texto dinámico (ej: *"Consultor Técnico ejecutando auditoría en ejemplo.com..."*).
- **Tarjetas de Proyecto:** Una barra lateral donde se listen los proyectos creados para saltar rápidamente de un cliente/marca a otro.

---

## 6. Consideraciones Técnicas

- **Base de Datos Embebida:** SQLite no requiere instalación de servidor externa, lo que facilita levantar el proyecto con un simple comando de Node.js.
- **Vercel AI SDK Core:** Aprovechar el soporte nativo de `tools` para declarar los esquemas Zod de entrada de Lighthouse y DataForSEO, simplificando la orquestación del LLM.

---

## 7. Métricas de Éxito del MVP

- Creación completa de un proyecto en menos de 1 minuto a través del formulario de Onboarding.
- El agente orquestador es capaz de detectar la intención del usuario y activar la herramienta correcta (Lighthouse o DataForSEO Mock) de forma autónoma el 100% de las veces.
- Renderizado de entregables complejos (tablas de palabras clave o listas de auditoría técnica) de manera legible sin desconfiguraciones en la UI del chat.

---

## 8. Preguntas Abiertas / Por Definir

- ¿Qué modelo de IA específico (Claude 3.5 Sonnet, GPT-4o, Gemini 1.5 Pro) se utilizará para optimizar la relación calidad-precio y la precisión en llamadas a herramientas?
- ¿Permitiremos que el usuario edite la información de marca guardada en SQLite a mitad de una conversación si cambian las prioridades de su negocio?