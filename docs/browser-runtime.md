# Browser runtime

dealfinder's Eve by Vercel agent owns conversation history and tool execution. Browser tools share one in-process
Stagehand runtime per Eve session. Follow-up turns reuse the browser; saved Browserbase session
metadata supports reconnecting after a worker restart. Hosted launches request keep-alive, a
one-hour session, and CAPTCHA solving on every attempt. Without the session length a new
Browserbase project ends the browser after 5 minutes. Managed proxies and Verified Browsers are off unless their
settings turn them on, because the Browserbase free plan refuses both.

A launch that Browserbase refuses fails with Browserbase's HTTP status and reason. A refusal
with a 4xx status other than 429 is a plan, permission, or request problem, so dealfinder does
not retry it. dealfinder makes up to three attempts after a rate limit (429), a server error, or a
connection failure.

`snapshot` reads page text and short-lived targets, `run` performs typed browser actions, and
`screenshot` captures the page for dealfinder's viewer. Navigation accepts HTTP and HTTPS URLs without
embedded credentials. A destination URL cannot change the browser provider. Local fixtures
require `STAGEHAND_BROWSER=local`.

## Configuration

Copy the root [`.env.example`](../.env.example) for dealfinder and integration settings.
Hosted browser sessions always disable network logging and recording.

| Variable | Purpose |
| --- | --- |
| `STAGEHAND_BROWSER` | `browserbase`, `local`, or `auto`; `auto` uses Browserbase when its API key is present. |
| `BROWSERBASE_CONTEXT_ID` | Optional existing Context for saved browser state. |
| `DEALFINDER_BROWSERBASE_PROXIES` | `1` or `true` requests Browserbase managed proxies; off by default. Needs a paid Browserbase plan. A proxy location needs this setting, and a browser started with a location fails without it. |
| `DEALFINDER_BROWSERBASE_VERIFIED` | `1` or `true` requests a Browserbase Verified Browser; off by default. Needs the Browserbase Enterprise plan. |
| `DEALFINDER_PUBLIC_URL` | Reachable HTTPS dealfinder origin for handoff links; loopback HTTP is allowed locally. |
| `DEALFINDER_HANDOFF_SECRET` | Handoff encryption secret, at least 32 bytes. |
| `DEALFINDER_HEADLESS` | Local browser headless mode; defaults to `true`. |
| `DEALFINDER_BROWSER_IDLE_MS` | Browser inactivity timeout; defaults to 30 minutes. |
| `DEALFINDER_CAPTCHA_TIMEOUT_MS` | CAPTCHA wait timeout; defaults to 30 seconds. |
| `DEALFINDER_DRAFT_CONTEXT_TTL_MS` | Unused draft Context lifetime; defaults to seven days. |
| `DEALFINDER_CONTEXT_METADATA_PATH` | Context metadata file; defaults to `.dealfinder/contexts.json`. |
| `DEALFINDER_OPERATOR_USERNAME` / `DEALFINDER_OPERATOR_PASSWORD` | Optional HTTP Basic operator credentials for dealfinder; password must be at least 32 bytes. |
| `DEALFINDER_ONEPASSWORD_BACKEND` | `sdk` (default) or explicitly selected `cli`; there is no automatic fallback between accounts or backends. |
| `DEALFINDER_VAULT_FILE` | Existing encrypted local vault file; defaults to `.dealfinder/vault.enc.json`. |
| `DEALFINDER_VAULT_MASTER_KEY` | Local vault key: 32 bytes encoded as base64 or 64 hexadecimal characters. |

The HTTP channel also supports Vercel OIDC. Unauthenticated development access is restricted
to loopback hosts. Production deployments must protect the web interface and session routes.
Never commit credentials, `.env` files, or `.dealfinder` data. Keep the handoff secret
stable across restarts.

## Updating an existing deployment

This cleanup changes environment names, the default Context metadata path, and the browser
state namespace. Before deploying it, finish or reset active conversations using the previous
version and verify their Browserbase sessions are released. Start new conversations after updating;
do not resume sessions created by the previous version.

Use the variable names in the table above; old configuration names are no longer read.
To preserve saved Context labels, move the previous metadata file to `.dealfinder/contexts.json`,
or set `DEALFINDER_CONTEXT_METADATA_PATH` to its existing location. The file format is unchanged.
To retain an existing local vault, move its encrypted file to `.dealfinder/vault.enc.json` or set
`DEALFINDER_VAULT_FILE` to its location, and copy the existing key into `DEALFINDER_VAULT_MASTER_KEY`.
The encrypted file format is unchanged. Existing CLI users must explicitly select the CLI
backend and configure its account as described below; SDK failures no longer switch backends.

## Contexts and storage

Browserbase Contexts preserve cookies and site state; they do not store vault secrets. Hosted
tasks get a draft Context. dealfinder's `context_save` tool names and retains it, and `context_list`,
`context_create`, and `context_select` manage saved browser identities. Select a separate Context
for each identity or work boundary.

Eve stores durable conversation and browser state. Context labels use a local
file scoped to one trusted operator and one process. Preserve that file across restarts.
Writes are serialized within that process; this file is not a shared database. Multi-instance or
multi-user deployments need shared durable storage and user isolation before sharing these features.

## Credentials and OTP

Use `vault_login` or `human_handoff` for login. Never put secrets in generic `run` arguments:
Eve records tool inputs separately from the browser runtime's redacted activity traces.
The model receives login labels, host mappings, field availability, and opaque item references;
credentials resolve server-side immediately before filling.

For hosted 1Password access, set `OP_SERVICE_ACCOUNT_TOKEN` with access only to the required vault.
For local use, enable SDK integration in the 1Password desktop app and set `OP_ACCOUNT` to the
account name shown in its sidebar. Service-account mode takes precedence over desktop access.

Existing 1Password CLI setups can set `DEALFINDER_ONEPASSWORD_BACKEND=cli`. Install `op` and use an
explicit `OP_ACCOUNT` account UUID or sign-in address, or the scoped service token above. An
account UUID is accepted by both backends. CLI commands never use an implicit last-used account
or ambient Connect/session credentials, and SDK errors do not trigger a CLI fallback.
The SDK honors 1Password's Never-autofill policy. CLI access enforces saved website hosts but
cannot enforce autofill policies that the CLI does not expose; use the default SDK when those
policies are required. Both modes keep credential values out of model-visible results.

Existing encrypted local vaults remain readable through the `native` provider. No vault writer
or administration interface is shipped. Keep the master key private and protect the vault file
from modification: its legacy website mappings are trusted operator configuration outside the
encrypted payload. Only load files controlled by that operator. The tool reads credentials and
their website mapping from one file snapshot, and generates OTP codes server-side.

Vault login requires HTTPS and the saved hostname, checked before each credential fill and
submission, including an OTP step after navigation. Credential selectors must target the main page;
iframe and XPath selectors are rejected. A success selector is required to verify login.
Persisted sessions with unverified logging settings are replaced before automation resumes.
TOTP values resolve server-side. When a login needs an unavailable OTP, passkey, or human approval,
use `human_handoff`, complete the challenge in Live View, and reply in the original dealfinder conversation.

Handoff links expire after ten minutes by default and are not single-use. Expiry prevents opening
the link again; it does not revoke a Browserbase Live View already opened. That view can remain
usable until the browser session ends. Keep both URLs private and close the conversation when done.
The reachable dealfinder origin and handoff secret must be configured before issuing a link.
See [provider checks](provider-tests.md) for opt-in login and saved-Context regressions.
