# Archive: initial-ui-chat-setup

**Fecha de archivo:** 2026-06-09  
**Duración:** 1 sesión SDD completa (proposal → spec → design → tasks → apply → verify → sync → archive)  
**Líneas cambiadas:** ~1500 (18 archivos nuevos, 2 modificados)

## Summary

Primer cambio funcional del MVP. Se implementó el esqueleto visual y funcional de la plataforma:

- **Sidebar jerárquica** Proyectos → Chats con shadcn/ui
- **Chat con streaming** vía Vercel AI SDK (`useChat` + `streamText`)
- **Agente conversacional básico** GPT-4o-mini (sin tools ni system prompt)
- **CRUD de proyectos y chats** con SQLite + Drizzle
- **Renderizado Markdown** para respuestas del asistente

## Artifacts Preserved

```
openspec/
├── proposals/initial-ui-chat-setup.md
├── specs/initial-ui-chat-setup.md
├── designs/initial-ui-chat-setup.md
├── tasks/initial-ui-chat-setup.md
├── verify-reports/initial-ui-chat-setup.md
└── sync-reports/initial-ui-chat-setup.md
```

## Verification Snapshot

| Check | Result |
|-------|--------|
| TypeScript | 0 errores |
| Biome | 1 warning (shadcn) |
| Build | 5 rutas OK |
| pi-lens | 0 issues |
| A11y | Labels + aria present |

## Key Decisions

- shadcn/ui base-nova (Base UI) usa `render` prop, no `asChild`
- AI SDK v6: mensajes con `parts[]`, `useChat` maneja todo el estado
- Chat efímero: sin persistencia en tabla `messages`
- Sin formulario de onboarding → próximo cambio: system prompt para onboarding conversacional
