# Upstream

Benji's browser runtime is adapted from Browserbase BELL.

- Source: https://github.com/browserbase/bell-stack
- Commit: `ae8bd1f8adb95f8b27f3263b5527858fbe719b11`
- Adapted on: November 10, 2026
- License: [MIT](LICENSE), with Browserbase's original notice retained.

## What comes from BELL

The browser session lifecycle, the browser tools (`run`, `snapshot`, `screenshot`),
reusable Browserbase Contexts, human handoff, the operator credential vault, Baselayer
merchant access, and the tests for each. BELL's Parallel search and extract tools are
replaced by Eve's built-in `web_search`, which runs Parallel through AI Gateway, and
`web_fetch`. Benji does not
include BELL's messaging, payment, or monitoring integrations.

## What Benji adds

The shopping identity and rules in `agent/instructions.md` and
`agent/skills/shopping-research/SKILL.md`, the `compare_offers` tool, the shopping web
interface, the configuration readiness display, and conversation export.

The app and README use Benji's supplied brand artwork in `public/brand/`, including
the wordmark, face icon, and app icon.

## Differences in tooling

- Bun and Biome replace the upstream package manager and lint setup.
- The dev launcher starts Eve with `--resume` and passes its origin to Next.js through
  `EVE_BASE_URL`, so conversations survive a restart.
- `just-bash` is a declared dependency. Eve otherwise installs it during the first
  sandbox start, which changes dependencies while Next.js is running.

## Chat interface

The chat follows the [shadcn/ui AI Elements](https://ui.shadcn.com/docs/ai-elements)
patterns. `components/ui/` holds unmodified shadcn/ui components in the Base UI
`base-nova` style, added with `bunx shadcn@latest add` and reformatted by Biome;
[`components.json`](components.json) records the configuration. `components/chat/`
composes them for Benji and renders Eve's message parts directly from `useEveAgent`,
with no AI SDK `useChat` layer. Tool calls show a fixed phrase per tool from
[`lib/eve-parts.ts`](lib/eve-parts.ts), never their input or output.
