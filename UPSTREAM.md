# Upstream

dealfinder's browser runtime is adapted from Browserbase BELL.

- Source: https://github.com/browserbase/bell-stack
- Commit: `ae8bd1f8adb95f8b27f3263b5527858fbe719b11`
- Adapted on: November 10, 2026
- License: [MIT](LICENSE), with Browserbase's original notice retained.

## What comes from BELL

The browser session lifecycle, the browser tools (`run`, `snapshot`, `screenshot`),
reusable Browserbase Contexts, human handoff, the operator credential vault, Baselayer
merchant access, the Parallel search tools, and the tests for each. dealfinder does not
include BELL's messaging, payment, or monitoring integrations.

## What dealfinder adds

The shopping identity and rules in `agent/instructions.md` and
`agent/skills/shopping-research/SKILL.md`, the `compare_offers` tool, the shopping web
interface, the configuration readiness display, and conversation export.

## Differences in tooling

- Bun and Biome replace the upstream package manager and lint setup.
- The dev launcher starts Eve with `--resume` and passes its origin to Next.js through
  `EVE_BASE_URL`, so conversations survive a restart.
- `just-bash` is a declared dependency. Eve otherwise installs it during the first
  sandbox start, which changes dependencies while Next.js is running.

## Chat interface

The chat uses adapted [prompt-kit](https://prompt-kit.com) components in
`components/ui/`. Their MIT notice is in
[`components/ui/PROMPT-KIT-LICENSE.md`](components/ui/PROMPT-KIT-LICENSE.md).
