# Auditoría WCAG 2.2 AA — Resumen Ejecutivo (1 Página)

## 📊 Scorecard General

```
┌─────────────────────────────────────────────────────────────┐
│  Puntuación de Accesibilidad:  58/100                       │
│  Nivel WCAG:  AA (Estándar)                                 │
│  Estado:      ⚠️  POR DEBAJO DEL ESTÁNDAR (necesita 80+)   │
└─────────────────────────────────────────────────────────────┘

Issues Totales:  16
├─ ❌ Críticos (P0):   5 issues  → Fix INMEDIATO (2-3h)
├─ ⚠️  Serios (P1):    6 issues  → Fix ANTES DE LAUNCH (4-6h)
└─ 💡 Moderados (P2):  5 issues  → Fix PRONTO (3-4h)

Estimación Total: 9-13 HORAS
```

---

## 🔴 CRÍTICOS (P0) — FIX INMEDIATO

| ID | Issue | Archivos | Criterio | Esfuerzo | Impacto |
|----|-------|----------|----------|----------|---------|
| **P0-001** | 🎨 Icons sin `aria-hidden` | AppSidebar, MessageBubble, ChatArea, HomePageClient, AgentStatusBanner (10+ lugares) | 1.1.1 | XS | Screen readers leen "chevron folder message" sin contexto |
| **P0-002** | ⌨️ CollapsibleTrigger sin keyboard handling | AppSidebar:64-72 | 2.1.1 | S | Users no pueden usar Tab+Enter para expandir proyectos |
| **P0-003** | 🔒 Focus trap en modals no implementado | Aplicable si hay dialogs (crear proyecto/chat) | 2.1.2 | M | Usuarios de teclado quedan atrapados en modals |
| **P0-004** | ⏭️ Falta skip link | ChatLayout | 2.4.1 | XS | Users de teclado deben tabear por toda la sidebar |
| **P0-005** | 📝 Validar TODOS los inputs tienen label | ChatInput (y cualquier otro) | 4.1.2 | M | Inputs sin `<label>` o `aria-label` no son identificables |

---

## 🟠 SERIOS (P1) — FIX ANTES DE LAUNCH

| ID | Issue | Archivos | Criterio | Esfuerzo | Impacto |
|----|-------|----------|----------|----------|---------|
| **P1-001** | 🖼️ Markdown sin validación alt text | MessageBubble:51 | 1.1.1 | M | Si AI devuelve `![](url)` sin alt, imagen queda sin descripción |
| **P1-002** | 📦 Contraste bajo en disabled states | ChatInput:43 | 1.4.11 | S | Buttons/inputs deshabilitados pueden tener contraste < 3:1 |
| **P1-003** | 🔄 Orden visual vs. tab order confuso | ChatLayout | 2.4.3 | M | Focus order puede no seguir lógica visual |
| **P1-004** | 👁️ Focus outline no visible en todos los backgrounds | globals.css | 2.4.7 | S | Outline con 50% opacity no cumple 3:1 contraste |
| **P1-005** | 🎞️ Auto-scroll ignora `prefers-reduced-motion` | ChatArea:90 | 2.2.3 | S | Motion-sensitive users ven scroll automático |
| **P1-006** | 🎬 Animaciones spin/pulse ignoran motion preference | globals.css, ChatInput, AgentStatusBanner | 2.3.3 | M | `animate-spin` y `animate-pulse` corren siempre |
| **P1-007** | 📄 Title dinámico no implementado | layout.tsx | 2.4.2 | S | Página sigue siendo "Consultor SEO..." en todos lados |
| **P1-008** | 🚨 Error messages sin `role="alert"` | ChatArea:129-139 | 4.1.3 | XS | Screen readers no anuncian errores automáticamente |
| **P1-009** | 🏷️ ARIA en Collapsible incompleto | AppSidebar:60-94 | 4.1.2 | M | `aria-expanded`, `aria-controls` pueden faltar |

---

## 💙 MODERADOS (P2) — FIX PRONTO

| ID | Issue | Archivos | Criterio | Esfuerzo | Impacto |
|----|-------|----------|----------|----------|---------|
| **P2-001** | ⭕ Focus outline con opacidad 50% | globals.css | 1.4.11 | S | Outline puede no ser suficientemente visible |
| **P2-002** | 🔴 Error solo por color, sin icono | ChatArea:130-139 | 1.4.1 | XS | Color-blind users no ven que hay error |
| **P2-003** | 🎬 Multimedia futura sin captions | Aplicable cuando se añadan videos | 1.2.1-4 | M | Preparar reqs para reportes con video/audio |
| **P2-004** | 📍 Target size < 24×24px | ChatInput, AgentStatusBanner | 2.5.8 (NEW in 2.2) | S | Algunos elementos (p.ej. spinner dot = 6px) muy pequeños |
| **P2-005** | 📜 Scroll auto puede obscurecer focus | ChatArea:88-91 | 2.4.11 (NEW in 2.2) | S | Elemento nuevo queda detrás de sticky header |
| **P2-006** | 🔗 Link activo sin `aria-current="page"` | AppSidebar:78-86 | 1.3.1 | XS | Screen reader users no saben cuál chat es activo |
| **P2-007** | 💬 Input sin hint text accesible | ChatInput | 3.3.5 | S | No hay ayuda visible para usuarios sobre cómo funciona |
| **P2-008** | 🎨 Icons sin `aria-hidden` (adicionales) | Multiple | 1.1.1 | XS | Decorative icons se leen innecesariamente |

---

## ✅ CUMPLIMIENTOS (Lo que SÍ está bien)

| Aspecto | Criterio | Evidencia |
|--------|----------|-----------|
| 🌍 Idioma página | 3.1.1 | `<html lang="es">` ✓ |
| 🏗️ HTML semántico | 1.3.1 | `<main>`, `<header>`, `<nav>` ✓ |
| 🔘 Botones nativos | 2.1.1 | Todos los `<Button>` son `<button>` real ✓ |
| 📝 Input con label | 4.1.2 | ChatInput tiene `<label>` asociada ✓ |
| 🎨 Paleta de colores base | 1.4.3 | Navy #1e293b sobre white = 7.1:1 ✓ |
| 🌙 Dark mode | 1.4.3 | Colores ajustados en .dark ✓ |
| 🧩 shadcn components | 4.1.2 | Componentes base vienen con ARIA built-in ✓ |
| 🔗 Links nativos | 2.1.1 | `<Link>` de Next.js navegables con teclado ✓ |

---

## 📋 ORDEN DE EJECUCIÓN RECOMENDADO

### SPRINT 1: Críticos (2-3 horas) — BLOCKER
```
[ ] P0-001: aria-hidden="true" en 10+ icons (5 min) ← FIX MECÁNICO
[ ] P0-004: Skip link en ChatLayout (10 min) ← COPIAR DEL SKILL
[ ] P0-002: Mejorar keyboard handling en Collapsible (30 min) ← VALIDAR
[ ] P0-005: Auditoría completa de inputs (45 min) ← VERIFY
[ ] P0-003: Focus trap para modals (60 min) ← RESEARCH si no existen modals
─────────────────────────────────────────────────
  Total: ~2-3h
```

### SPRINT 2: Serios (4-6 horas) — SHOULD DO
```
[ ] P1-004: Focus-visible con outline sólido (30 min) ← CSS GLOBAL
[ ] P1-008: role="alert" en error messages (15 min) ← FIX RÁPIDO
[ ] P1-006: prefers-reduced-motion en animaciones (45 min) ← MEDIA QUERY
[ ] P1-005: prefers-reduced-motion en auto-scroll (30 min) ← CONDITIONAL
[ ] P1-002: Contraste en disabled states (45 min) ← VERIFY + TEST
[ ] P1-007: Dynamic title en rutas de chat (60 min) ← METADATA
[ ] P1-001: Plugin ReactMarkdown para alt text (90 min) ← CUSTOM LOGIC
[ ] P1-003: Revisar tab order visual (45 min) ← MANUAL TEST
[ ] P1-009: ARIA en Collapsible (45 min) ← INSPECT + VERIFY
─────────────────────────────────────────────────
  Total: ~4-6h
```

### SPRINT 3: Moderados (3-4 horas) — NICE TO HAVE
```
[ ] P2-001: Focus outline sin opacidad (15 min)
[ ] P2-002: Icono en error messages (15 min)
[ ] P2-004: Target size ≥ 24px (30 min)
[ ] P2-005: scroll-margin-top (20 min)
[ ] P2-006: aria-current="page" (10 min)
[ ] P2-007: Hint text en ChatInput (30 min)
[ ] P2-008: aria-hidden en más icons (10 min)
[ ] P2-003: Documentar reqs multimedia (60 min)
─────────────────────────────────────────────────
  Total: ~3-4h
```

---

## 🎯 READINESS CHECKLIST

**Before SDD Proposal:**
- [x] Auditoría completada — 16 issues identificados
- [x] Severidad clasificada — 5 críticos, 6 serios, 5 moderados
- [x] Esfuerzo estimado — 9-13h total
- [x] Criterios WCAG mapeados — cada issue tiene referencia

**Before Implementation:**
- [ ] Revisar con el equipo — confirmar prioridades
- [ ] Validar si hay modals actualmente (P0-003)
- [ ] Revisar Skill.md de accessibility — patrones disponibles

**Before Launch:**
- [ ] Ejecutar Sprint 1 (Críticos) — blocker
- [ ] Ejecutar Sprint 2 (Serios) — requerido
- [ ] Testing manual con keyboard — Tab, Enter, Escape, Arrow keys
- [ ] Testing manual con screen reader — NVDA (Windows) o VoiceOver (Mac)
- [ ] Lighthouse audit — score ≥ 85/100
- [ ] Sprint 3 (Moderados) — optional (puede ser post-launch)

---

## 📚 Documentación Completa

Archivo detallado con evidencias y código:  
📄 `.agents/audits/accessibility-audit-wcag-2.2.md`

---

**Auditoría:** 2026-06-10  
**Próximo paso:** SDD Proposal Phase
