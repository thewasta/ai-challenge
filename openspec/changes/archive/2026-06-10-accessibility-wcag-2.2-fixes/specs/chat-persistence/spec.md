# Delta Spec: Chat Persistence — Image Alt Text Accessibility

**Change ID:** `accessibility-wcag-2.2-fixes`  
**Base Spec:** `chat-persistence/spec.md`

---

## MODIFIED Requirements

### Requirement: Message Serialization Includes Image Alt Text Validation

The system MUST store chat messages with complete preservation of markdown content, including validation that images referenced in markdown have alt text.

**(Previously: Message serialization only preserved UIMessage JSON; no markdown image alt text validation)**

#### Updated Requirement

When a message with markdown content is stored in `message_data`, the system MUST:
- Preserve the complete markdown text as-is
- Ensure that when messages are retrieved and rendered in MessageBubble, images have alt text fallback (handled by custom ReactMarkdown component)

**Note**: Alt text validation is primarily a rendering concern (MessageBubble component), but this requirement ensures the spec acknowledges the full lifecycle.

#### Scenario: Markdown with image is stored and retrieved correctly

- **GIVEN** an AI response containing markdown with an image: `![Chart](chart.png "Sales Q2")`
- **WHEN** the assistant message is serialized and stored in `message_data` via `saveMessage()`
- **THEN**:
  - Complete markdown text is stored unchanged in `message_data`
  - No alt text is stripped or modified during serialization
  - When `getMessagesByChat()` retrieves the message, markdown is intact
  - MessageBubble's custom image renderer applies fallback alt text if needed during render

#### Scenario: Markdown without image alt text is stored and retrieves fallback on render

- **GIVEN** an AI response with markdown: `![](chart.png)` (no alt text)
- **WHEN** the message is stored in database
- **THEN**:
  - Markdown is stored as-is: `![](chart.png)`
  - No modification or validation happens at storage level
  - When MessageBubble renders the message (via ReactMarkdown + custom image component)
  - MessageBubble applies fallback alt: `alt="Imagen generada por el asistente"`
  - Screen reader user hears: "image, Imagen generada por el asistente"

#### Scenario: Chat history with images is retrieved and rendered accessibly

- **GIVEN** a chat with 5 messages, 2 of which contain markdown images
- **WHEN** `GET /api/chats/[chatId]` retrieves the full history
- **THEN**:
  - Response includes all 5 messages with complete `message_data` JSON
  - Markdown in `message_data` for messages 3 and 4 includes image references
  - When ChatArea renders these messages in MessageBubble
  - MessageBubble applies alt text fallback for any images missing alt
  - All 5 messages display correctly with accessible images

---

## Non-Functional Behavior (Database Layer)

The database operations (`saveMessage`, `getMessagesByChat`, endpoints) do NOT validate or modify markdown content. They treat `message_data` as an opaque string serialized from the `UIMessage` object. Alt text fallback is a rendering concern, not a storage concern.

**Rationale**: Decoupling storage from presentation allows:
- Storage layer to remain agnostic to markdown parsing
- Rendering layer (MessageBubble) to flexibly apply alt fallback
- Future changes to fallback logic without database migration

#### Scenario: Database layer does not parse markdown

- **GIVEN** a message with complex markdown (tables, code blocks, images)
- **WHEN** `saveMessage()` stores it in database
- **THEN**:
  - Markdown string is JSON-serialized without parsing
  - No validation of image syntax or alt text happens
  - Message round-trips unchanged from DB
  - Rendering layer handles markdown parsing + alt fallback

---

## Summary of Changes

| Layer | Change | WCAG Criterion |
|-------|--------|----------------|
| Storage | Preserve complete markdown text during serialization | 1.1.1 |
| Retrieval | Return unchanged markdown text to frontend | 1.1.1 |
| Rendering | Custom ReactMarkdown image component applies alt fallback (MessageBubble) | 1.1.1 |

---

## Implementation Notes

- The database layer (`saveMessage`, `getMessagesByChat`) does NOT change behavior
- The API endpoints (`GET /api/chats/[id]`, `POST /api/chats/sendMessage`) return complete message_data unchanged
- The rendering layer (MessageBubble component) implements the custom image component for alt fallback
- No schema migrations needed; existing messages continue to work
- Alt text fallback applies to all retrieved messages, old and new

---

## Acceptance Criteria

- [ ] Messages with markdown images are stored and retrieved unchanged
- [ ] MessageBubble component applies alt text fallback for all images (handled separately in component spec)
- [ ] No alt text validation happens at database layer
- [ ] Chat history load returns complete, unchanged markdown content
- [ ] Screen reader user hears alt text for all images (fallback or original)
- [ ] Visual rendering of markdown images is unchanged
- [ ] No database migrations required
- [ ] Existing chat messages continue to work (backward compatible)
