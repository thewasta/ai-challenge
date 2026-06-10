# Delta for DataForSEO Mock Tools

## Overview

Five mock tools that simulate DataForSEO API responses for keyword research. Each tool accepts keyword input(s), applies coherence rules to generate realistic SEO metrics, and returns structured data with artificial latency (1000–2500ms).

## Coherence Rules (Cross-Cutting)

### Intent Detection Algorithm

All tools use this algorithm to classify keywords by user search intent:

```
If keyword contains: "cómo", "qué", "guía", "para qué", "beneficios", "funciona", "elegir"
  → Informational

If keyword contains: "cerca", "tienda", "Amazon", "dónde", "outlet", "MercadoLibre"
  → Navigational

If keyword contains: "mejores", "opiniones", "vs", "top", "calidad", "comparativa"
  → Commercial

If keyword contains: "comprar", "baratas", "precio", "oferta", "descuento"
  → Transactional

Else → Informational (default)
```

### CPC Range by Intent

| Intent | Min CPC | Max CPC | Reasoning |
|--------|---------|---------|-----------|
| Informational | $0.10 | $1.50 | Users researching, not ready to buy |
| Navigational | $0.50 | $2.00 | Users seeking specific vendors/brands |
| Commercial | $1.50 | $4.00 | Users comparing options, high intent |
| Transactional | $3.00 | $8.00 | Users ready to purchase, highest intent |

### Keyword Difficulty (KD) Coherence

Base KD calculation (applied by getKeywordDifficulty):
- 70% chance: random(50–90) — representing high competition
- 30% chance: random(10–49) — representing niche/low competition
- Clamp result to [0, 100]

This weighting simulates that most SEO keywords are highly competitive.

### Artificial Latency

All tools MUST introduce random delay: `1000 + random(0, 1500)` milliseconds (total: 1000–2500ms).

---

## ADDED Requirements

### Requirement: getKeywordIdeas Tool

The system MUST provide a `getKeywordIdeas` tool that accepts a seed keyword and returns exactly 5 keyword variations with different search intents.

**Input Schema (Zod):**
- `keyword: string` — Seed keyword (min 2 characters)

**Output Schema:**
```typescript
{
  seed_keyword: string;
  ideas: string[]; // exactly 5 elements
}
```

**Behavior:**
- Generate 5 keyword variations by applying modifiers from the table below
- Ensure at least 3 different intents among the 5 ideas
- Use Spanish-language modifiers (natural for the SEO market)
- Return seed keyword unchanged in `seed_keyword` field
- All 5 ideas MUST use the seed as a semantic base (not random replacements)

**Modifier Patterns by Intent:**

| Intent | Modifiers (prefix or suffix) | Example (seed: "running shoes") |
|--------|------------------------------|----------------------------------|
| Transactional | "comprar {}", "{} baratas", "precio {}", "oferta {}", "{} descuento", "{} en oferta" | "comprar running shoes", "running shoes baratas" |
| Commercial | "mejores {}", "{} opiniones", "{} vs", "top {}", "{} calidad precio", "comparativa {}" | "mejores running shoes", "running shoes opiniones" |
| Informational | "cómo elegir {}", "qué {} comprar", "para qué sirve {}", "cómo funciona {}", "{} beneficios", "guía de {}" | "cómo elegir running shoes", "qué running shoes comprar" |
| Navigational | "{} cerca de mí", "{} tienda", "{} Amazon", "dónde comprar {}", "{} MercadoLibre", "{} outlet" | "running shoes cerca de mí", "dónde comprar running shoes" |

**Algorithm:**
1. Randomly pick 5 modifiers from the combined pool of ~20
2. Apply each modifier to the seed keyword (replace `{}` with seed)
3. Ensure at least 3 different intents are represented among the 5
4. If distribution is skewed, re-sample until diversity goal is met
5. Return array of 5 ideas in random order

#### Scenario: Seed keyword generates 5 diverse ideas

- GIVEN seed keyword `"running shoes"`
- WHEN `getKeywordIdeas` is called
- THEN:
  - Result includes `seed_keyword: "running shoes"`
  - Result includes exactly 5 ideas
  - At least one idea contains "comprar" or "precio" (Transactional)
  - At least one idea contains "mejores" or "opiniones" (Commercial)
  - At least one idea contains "cómo" or "beneficios" (Informational)
  - At least one idea contains "cerca" or "tienda" (Navigational)

#### Scenario: Minimum length seed is accepted

- GIVEN seed keyword `"ai"` (2 characters)
- WHEN `getKeywordIdeas` is called
- THEN:
  - Result includes 5 valid ideas
  - All ideas contain the seed "ai" as a substring

#### Scenario: Artificial latency applies

- GIVEN `getKeywordIdeas` is called
- WHEN the function executes
- THEN:
  - Response time is between 1000–2500ms
  - Response includes complete result object (not truncated)

---

### Requirement: getSearchVolume Tool

The system MUST provide a `getSearchVolume` tool that accepts an array of keywords and returns search volume for each.

**Input Schema (Zod):**
- `keywords: string[]` — Array of keywords to query

**Output Schema:**
```typescript
{
  results: Array<{
    keyword: string;
    search_volume: number; // integer, rounded to nearest 10
  }>;
}
```

**Behavior:**
- For each keyword, generate a random search volume
- Volume range: 100–25,000 (inclusive)
- Round to nearest 10 (e.g., 1,234 → 1,230)
- Each keyword gets an independent random volume
- Preserve keyword casing and content exactly as input

#### Scenario: Multiple keywords receive independent volumes

- GIVEN keywords `["running shoes", "best running shoes", "running shoes near me"]`
- WHEN `getSearchVolume` is called
- THEN:
  - Result includes 3 results, one per keyword
  - Each result has a `search_volume` between 100–25,000
  - Volumes are NOT all identical (low probability of collision)
  - All volumes are multiples of 10

#### Scenario: Single keyword query

- GIVEN keywords `["ai"]`
- WHEN `getSearchVolume` is called
- THEN:
  - Result includes exactly 1 result
  - Result includes the keyword `"ai"` unchanged

---

### Requirement: getKeywordDifficulty Tool

The system MUST provide a `getKeywordDifficulty` tool that accepts an array of keywords and returns keyword difficulty (0–100) for each.

**Input Schema (Zod):**
- `keywords: string[]` — Array of keywords to evaluate

**Output Schema:**
```typescript
{
  results: Array<{
    keyword: string;
    keyword_difficulty: number; // integer, 0–100 inclusive
  }>;
}
```

**Behavior:**
- For each keyword, calculate KD using weighted random distribution:
  - 70% chance: random(50–90)
  - 30% chance: random(10–49)
- Clamp final KD to [0, 100]
- Round to nearest integer
- Each keyword gets an independent KD value
- Preserve keyword exactly as input

**Rationale:** This distribution simulates that most SEO keywords are competitive (higher KD typical), with occasional niche keywords (lower KD).

#### Scenario: KD scores reflect weighted distribution

- GIVEN 100 calls to `getKeywordDifficulty` with the same keyword
- WHEN all calls complete
- THEN:
  - Approximately 70% of results have KD in range [50–90]
  - Approximately 30% of results have KD in range [10–49]
  - All results are between 0–100

#### Scenario: Multiple keywords receive independent KD scores

- GIVEN keywords `["running shoes", "best running shoes", "rare niche keyword"]`
- WHEN `getKeywordDifficulty` is called
- THEN:
  - Result includes 3 results, one per keyword
  - All KD values are integers between 0–100
  - Keyword casing is preserved exactly

---

### Requirement: getCpcData Tool

The system MUST provide a `getCpcData` tool that accepts an array of keywords and returns CPC (cost-per-click) bid for each, coherent with search intent.

**Input Schema (Zod):**
- `keywords: string[]` — Array of keywords to evaluate

**Output Schema:**
```typescript
{
  results: Array<{
    keyword: string;
    cpc: number; // float, 2 decimal places (e.g., 2.50)
  }>;
}
```

**Behavior:**
- Detect search intent for each keyword using the Intent Detection Algorithm (see Cross-Cutting Rules)
- Assign CPC range based on detected intent (see CPC Range by Intent table)
- Generate random CPC within the range
- Round to 2 decimal places
- Each keyword gets an independent CPC
- Preserve keyword exactly as input

#### Scenario: Transactional keyword has highest CPC

- GIVEN keyword `"comprar running shoes"` (Transactional)
- WHEN `getCpcData` is called
- THEN:
  - Result includes `cpc` between $3.00–$8.00
  - CPC is formatted to 2 decimal places (e.g., 5.45)

#### Scenario: Informational keyword has lowest CPC

- GIVEN keyword `"cómo elegir running shoes"` (Informational)
- WHEN `getCpcData` is called
- THEN:
  - Result includes `cpc` between $0.10–$1.50
  - CPC is a valid float with 2 decimal places

#### Scenario: Multiple keywords with mixed intents

- GIVEN keywords `["running shoes", "comprar running shoes", "dónde comprar running shoes"]`
- WHEN `getCpcData` is called
- THEN:
  - First result (Informational default) has lower CPC (~$0.10–$1.50)
  - Second result (Transactional) has higher CPC (~$3.00–$8.00)
  - Third result (Navigational) has mid-range CPC (~$0.50–$2.00)

---

### Requirement: getSearchIntent Tool

The system MUST provide a `getSearchIntent` tool that accepts an array of keywords and returns the search intent (Informational, Navigational, Commercial, or Transactional) for each.

**Input Schema (Zod):**
- `keywords: string[]` — Array of keywords to classify

**Output Schema:**
```typescript
{
  results: Array<{
    keyword: string;
    search_intent: "Informational" | "Navigational" | "Commercial" | "Transactional";
  }>;
}
```

**Behavior:**
- Classify each keyword using the Intent Detection Algorithm (see Cross-Cutting Rules)
- Return exactly one of the four intent values
- If keyword matches no pattern, default to "Informational"
- Preserve keyword exactly as input

#### Scenario: Intent classification is consistent with keyword modifiers

- GIVEN keyword `"cómo elegir running shoes"` (contains "cómo elegir")
- WHEN `getSearchIntent` is called
- THEN:
  - Result includes `search_intent: "Informational"`

#### Scenario: Transactional keyword is correctly identified

- GIVEN keyword `"comprar running shoes baratas"` (contains "comprar" and "baratas")
- WHEN `getSearchIntent` is called
- THEN:
  - Result includes `search_intent: "Transactional"`

#### Scenario: Unknown keyword defaults to Informational

- GIVEN keyword `"xyz123 abc"` (matches no known patterns)
- WHEN `getSearchIntent` is called
- THEN:
  - Result includes `search_intent: "Informational"`

#### Scenario: Multiple keywords receive independent classifications

- GIVEN keywords `["running shoes", "comprar running shoes", "mejores running shoes"]`
- WHEN `getSearchIntent` is called
- THEN:
  - First result: "Informational"
  - Second result: "Transactional"
  - Third result: "Commercial"

---

## Implementation Rules

- **Schema Definition:** All tools MUST use Zod for input validation (no `any` types)
- **Tool Registration:** All tools MUST be defined using the `tool()` function from Vercel AI SDK
- **Error Handling:** For MVP, validate only structure (non-empty arrays/strings). No special handling for malformed input
- **Latency Simulation:** Use `new Promise(resolve => setTimeout(resolve, delay))` for delay
- **Export:** All tools MUST be exported individually and registered in `orchestratorAgent.tools`
- **TypeScript:** All code MUST pass `pnpm exec tsc --noEmit` with no errors
- **Linting:** All code MUST pass `pnpm exec @biomejs/biome check --apply .`

---

## Rules

- RFC 2119 keywords (MUST, SHALL, SHOULD, MAY) denote requirement strength
- All tools are mock implementations — no real API calls
- Artificial latency is intentional to simulate realistic API behavior
- Coherence rules ensure realistic data relationships (high volume → higher KD, intent → CPC)
- Each requirement MUST have at least one Given/When/Then scenario
