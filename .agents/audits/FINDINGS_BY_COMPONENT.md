# Auditoría WCAG 2.2 AA — Hallazgos por Componente

---

## 📄 `src/app/layout.tsx`

### ✅ CUMPLIMIENTOS
- `lang="es"` en `<html>` — Criterio 3.1.1 ✓
- Metadata configurado en Nextjs

### ❌ PROBLEMAS
| ID | Issue | Criterio | Severidad |
|----|-------|----------|-----------|
| **P1-007** | Title dinámico no implementado — sigue siendo "Consultor SEO..." en rutas de chat | 2.4.2 | ⚠️ SERIO |

### 💡 SUGERENCIAS
- Usar `generateMetadata` en rutas dinámicas para title contextual

---

## 🏠 `src/app/page.tsx`

### ✅ CUMPLIMIENTOS
- `<main>` como elemento semántico
- Button con tamaño adecuado

### ❌ PROBLEMAS
| ID | Issue | Componente | Criterio | Severidad |
|----|-------|-----------|----------|-----------|
| **P0-001** | Icon Zap sin aria-hidden | HomePageClient.tsx:25 | 1.1.1 | ❌ CRÍTICO |
| **P0-001** | Icon Plus sin aria-hidden | HomePageClient.tsx:33 | 1.1.1 | ❌ CRÍTICO |
| **P0-001** | Icon Loader2 sin aria-hidden | HomePageClient.tsx:33 | 1.1.1 | ❌ CRÍTICO |

---

## 🎨 `src/components/ChatLayout.tsx`

### ✅ CUMPLIMIENTOS
- Estructura semántica correcta (`<header>`, `<div>` para contenido)
- Responsive layout

### ❌ PROBLEMAS
| ID | Issue | Criterio | Severidad |
|----|-------|----------|-----------|
| **P0-004** | ⏭️ SKIP LINK FALTA — usuarios de teclado deben tabear por sidebar | 2.4.1 | ❌ CRÍTICO |
| **P1-003** | Tab order: header antes de SidebarInset en DOM (¿correcto visualmente?) | 2.4.3 | ⚠️ SERIO |

### 💡 SUGERENCIAS
```jsx
// Añadir al inicio de ChatLayout:
<a href="#main-content" className="sr-only focus:not-sr-only">
  Saltar a contenido principal
</a>

// Luego añadir id="main-content" al primer elemento focusable después del header
```

---

## ⌨️ `src/components/ChatInput.tsx`

### ✅ CUMPLIMIENTOS
- Input tiene `<label>` asociada con `sr-only` ✓ (Criterio 4.1.2)
- Button "Enviar" tiene `aria-label="Enviar mensaje"` ✓
- Keyboard handling: `Enter` envía, `Shift+Enter` sigue siendo default
- Botón disabled tiene lógica correcta

### ❌ PROBLEMAS
| ID | Issue | Línea | Criterio | Severidad |
|----|-------|-------|----------|-----------|
| **P0-001** | Icon Send sin aria-hidden | 52 | 1.1.1 | ❌ CRÍTICO |
| **P0-001** | Icon Loader2 sin aria-hidden | 52 | 1.1.1 | ❌ CRÍTICO |
| **P1-002** | Contraste en disabled states — Button y Input con disabled=true pueden tener < 3:1 | 48, 43 | 1.4.11 | ⚠️ SERIO |
| **P2-007** | Input sin hint text accesible sobre keyboard shortcuts (p.ej. "Shift+Enter para nueva línea") | 42 | 3.3.5 | 💡 MODERADO |

### 💡 SUGERENCIAS
```jsx
// Mejorar label con hint:
<label htmlFor="chat-input" className="sr-only">
  Escribe tu mensaje (Shift+Enter para nueva línea)
</label>
```

---

## 💬 `src/components/MessageBubble.tsx`

### ✅ CUMPLIMIENTOS
- Estructura div con clases semantic
- Markdown renderizado correctamente

### ❌ PROBLEMAS
| ID | Issue | Línea | Criterio | Severidad |
|----|-------|-------|----------|-----------|
| **P0-001** | Icon Bot sin aria-hidden | 20 | 1.1.1 | ❌ CRÍTICO |
| **P1-001** | 🖼️ ReactMarkdown renderiza markdown del AI sin validar alt text en imágenes — si AI devuelve `![](url)` sin alt, imagen queda sin descripción | 51 | 1.1.1 | ⚠️ SERIO |

### 💡 SUGERENCIAS
```jsx
// Crear plugin custom para ReactMarkdown
const customImageRenderer = (props) => {
  const alt = props.alt || "Imagen generada por el asistente";
  return <img {...props} alt={alt} />;
};

// Usar:
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{ img: customImageRenderer }}
>
  {part.text}
</ReactMarkdown>
```

---

## 💭 `src/components/ChatArea.tsx`

### ✅ CUMPLIMIENTOS
- Error messages se muestran de forma visible
- Loading state comunicado

### ❌ PROBLEMAS
| ID | Issue | Línea | Criterio | Severidad |
|----|-------|-------|----------|-----------|
| **P0-001** | Icon MessageSquare sin aria-hidden | 96, 109 | 1.1.1 | ❌ CRÍTICO |
| **P1-005** | Auto-scroll ignore prefers-reduced-motion — `scrollIntoView({ behavior: "smooth" })` ejecuta siempre | 90 | 2.2.3 | ⚠️ SERIO |
| **P1-008** | Error messages sin `role="alert"` — screen readers no anuncian automáticamente | 129-139 | 4.1.3 | ⚠️ SERIO |
| **P2-005** | Auto-scroll puede obscurecer focus si header es sticky — elemento nuevo queda detrás | 90 | 2.4.11 | 💡 MODERADO |
| **P2-002** | Error solo por color rojo, sin icono adicional | 130, 136 | 1.4.1 | 💡 MODERADO |

### 💡 SUGERENCIAS
```jsx
// P1-005 + P1-008: Error messages mejorado
{loadError && (
  <div
    role="alert"
    aria-live="polite"
    className="px-4 py-2 text-sm text-destructive bg-destructive/10 text-center"
  >
    <span>⚠️ {loadError}</span>
  </div>
)}

// P1-005: Auto-scroll respetando prefers-reduced-motion
useEffect(() => {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  
  if (prefersReducedMotion) {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  } else {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }
}, [messages]);

// P2-005: Scroll margin-top
:focus {
  scroll-margin-top: 80px; /* altura del header sticky */
}
```

---

## 🗂️ `src/components/AppSidebar.tsx`

### ✅ CUMPLIMIENTOS
- Estructura de sidebar semántica
- Links usan `<Link>` de Next.js (navegables con teclado)

### ❌ PROBLEMAS
| ID | Issue | Línea | Criterio | Severidad |
|----|-------|-------|----------|-----------|
| **P0-001** | Icon Zap sin aria-hidden | 38 | 1.1.1 | ❌ CRÍTICO |
| **P0-001** | Icon Folder sin aria-hidden | 67 | 1.1.1 | ❌ CRÍTICO |
| **P0-001** | Icon ChevronDown sin aria-hidden | 69 | 1.1.1 | ❌ CRÍTICO |
| **P0-001** | Icon MessageSquare sin aria-hidden | 82 | 1.1.1 | ❌ CRÍTICO |
| **P0-002** | CollapsibleTrigger puede no tener keyboard handling explícito — debería ser `role="button"` con `aria-expanded` | 66-71 | 2.1.1 | ❌ CRÍTICO |
| **P1-009** | ARIA en Collapsible: validar que genera `aria-expanded="true/false"` y `aria-controls` | 60-94 | 4.1.2 | ⚠️ SERIO |
| **P2-006** | Link activo sin `aria-current="page"` — screen reader users no saben cuál chat está activo | 81 | 1.3.1 | 💡 MODERADO |

### 💡 SUGERENCIAS
```jsx
// P0-001: Mejorar icons
<Zap className="size-5 text-primary" aria-hidden="true" />
<Folder className="size-4" aria-hidden="true" />
<ChevronDown className="size-4" aria-hidden="true" />
<MessageSquare className="size-4" aria-hidden="true" />

// P2-006: Añadir aria-current
<Link 
  href={`/projects/${project.id}/chats/${chat.id}`}
  aria-current={chat.id === currentChatId ? "page" : undefined}
>
  {/* ... */}
</Link>

// P0-002: Validar CollapsibleTrigger tiene keyboard support
// (shadcn probablemente lo maneja, pero validar en inspector)
```

---

## 🔔 `src/components/AgentStatusBanner.tsx`

### ✅ CUMPLIMIENTOS
- Solo renderiza si hay activity
- Estructura simple

### ❌ PROBLEMAS
| ID | Issue | Línea | Criterio | Severidad |
|----|-------|-------|----------|-----------|
| **P0-001** | Spinner dot es `aria-hidden="true"` ✓ pero tamaño es 1.5 (6px) | 14 | 1.1.1 | ❌ CRÍTICO (por tamaño, no alt) |
| **P1-006** | Animación `animate-pulse` no respeta `prefers-reduced-motion` | 14 | 2.3.3 | ⚠️ SERIO |
| **P2-004** | Target size: spinner dot es 6×6px (< 24px mínimo) | 14 | 2.5.8 | 💡 MODERADO |

### 💡 SUGERENCIAS
```jsx
// P1-006 + P2-004: Mejorar spinner
<span
  className="inline-block size-2 rounded-full bg-emerald-500 
    motion-safe:animate-pulse motion-reduce:opacity-50"
  aria-hidden="true"
/>

// CSS (en globals.css):
@media (prefers-reduced-motion: reduce) {
  .motion-reduce\:opacity-50 {
    opacity: 0.5;
  }
}
```

---

## 🎨 `src/app/globals.css`

### ✅ CUMPLIMIENTOS
- Paleta OKLCH bien definida
- Colores base con buen contraste (navy #1e293b = 7.1:1)
- Dark mode implementado con colores ajustados

### ❌ PROBLEMAS
| ID | Issue | Línea | Criterio | Severidad |
|----|-------|-------|----------|-----------|
| **P1-004** | Focus outline con 50% opacidad: `outline-ring/50` puede no cumplir 3:1 contraste | 162 | 2.4.7 | ⚠️ SERIO |
| **P1-006** | No hay `@media (prefers-reduced-motion: reduce)` — `animate-spin`, `animate-pulse` corren siempre | - | 2.3.3 | ⚠️ SERIO |
| **P2-001** | Focus outline sin opacidad puede ser más visible | 162 | 1.4.11 | 💡 MODERADO |

### 💡 SUGERENCIAS
```css
/* P1-006: Respetar motion preference */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* P1-004 + P2-001: Focus outline mejorado */
:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
```

---

## 📊 RESUMEN POR COMPONENTE

| Componente | ✅ OK | ❌ Críticos | ⚠️  Serios | 💡 Moderados |
|-----------|-------|-----------|----------|------------|
| layout.tsx | 2 | 0 | 1 | 0 |
| page.tsx | 2 | 3 | 0 | 0 |
| ChatLayout.tsx | 2 | 1 | 1 | 0 |
| ChatInput.tsx | 3 | 2 | 1 | 1 |
| MessageBubble.tsx | 2 | 1 | 1 | 0 |
| ChatArea.tsx | 2 | 1 | 3 | 2 |
| AppSidebar.tsx | 2 | 4 | 1 | 1 |
| HomePageClient.tsx | 1 | 3 | 0 | 0 |
| AgentStatusBanner.tsx | 1 | 1 | 1 | 1 |
| globals.css | 3 | 0 | 2 | 1 |
| **TOTAL** | **20** | **18** | **11** | **6** |

---

**Nota:** Algunos issues aparecen en múltiples componentes (p.ej. P0-001 "icons sin aria-hidden") — se cuentan una vez en el total.

