# Security Policy

## Reporting a vulnerability or a data concern

**Do not** open a public GitHub issue for security problems or for personal data you find in this repository.

Instead, email support@promptingcompany.com with:

- what you found and where (file and line, or commit)
- how to reproduce it, if it applies
- the potential impact

We respond within 48 hours and agree a timeline for the fix with you.

## What this repository holds

- The dealfinder agent, its tools and its web interface. No credentials: the app reads API keys from your own environment, and `.env.example` lists the names only.
- No personal data. Browser sessions, saved logins and conversation state are written to your own deployment, never to this repository. The local data folder `.dealfinder/` is ignored by git.
- Test fixtures use made-up people, hosts and keys.

## Running your own deployment

- Set operator sign-in before you expose a deployment to the internet. See [docs/browser-runtime.md](../docs/browser-runtime.md).
- dealfinder stops at the payment page and never enters payment details. You pay yourself.

## Bug bounty

We do not currently run a bug bounty program.

---

**Contact:** support@promptingcompany.com
