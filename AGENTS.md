# dealfinder

Read `README.md` and `UPSTREAM.md` before changing this app.

- Run commands from this workspace with Bun; the root `bun.lock` owns dependencies.
- `bun run test` runs the imported Vitest suite. Do not run it with `bun test`.
- Browser tools share one operation lock and persistent session runtime.
  Read `docs/browser-runtime.md` before changing lifecycle or credentials.
- Shopping behavior lives in `agent/skills/shopping-research/SKILL.md`.
- Verify the actual Next.js app with the browser-verification skill. Use `bun run dev`
  and the printed loopback URL; nothing else needs to run.
- Retain Browserbase attribution and record upstream changes in `UPSTREAM.md`.
