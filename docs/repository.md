# Benji repository

One Next.js application serves the web interface. One Eve by Vercel agent owns the web
conversations and uses Benji's browser runtime directly.

```text
agent/                  Eve agent, tools, hooks, runtime, and channels
app/                    Benji web interface and handoff routes
server/browser/         Browser sessions, Context metadata, credentials, and handoff
lib/browser/            Browser URL and CAPTCHA helpers
tests/browser/          Browser runtime regression tests and local fixtures
package.json            Application dependencies and commands
bun.lock                One dependency resolution tree
```

## Eve by Vercel

[Eve by Vercel](https://eve.dev/docs) runs Benji's agent, conversation state, tools, and channels.
Configure the model and session limits in [`agent/agent.ts`](../agent/agent.ts), behavior in
[`agent/instructions.md`](../agent/instructions.md), and tools in [`agent/tools/`](../agent/tools/).
The [web channel](../agent/channels/eve.ts) is the only channel. [Hooks](../agent/hooks/) maintain task state and browser
lifecycle; channel callbacks also handle terminal-session cleanup. Restart Benji after runtime edits.

## Integration implementation

| Integration | Implementation | Guide |
| --- | --- | --- |
| Browserbase + Stagehand | [Browser runtime](../agent/lib/browser-runtime.ts), [session management](../server/browser/browser-session.ts) | [Browser configuration](browser-runtime.md) |
| Eve by Vercel | [Agent](../agent/agent.ts), [channels](../agent/channels/), [hooks](../agent/hooks/) | [Eve in Benji](#eve-by-vercel) |
| 1Password | [Operator SDK/CLI access](../server/browser/vault/onepassword.ts) | [Operator credentials](browser-runtime.md#credentials-and-otp) |
| Baselayer | [Agent tool](../agent/tools/merchant_access.ts), [credential minting](../server/baselayer.ts), [merchant verification](../server/verified-merchant.ts) | [Merchant access](baselayer.md) |

## Development

Use Node.js 24 and Bun 1.4.4:

```sh
bun install --frozen-lockfile
bun run dev
```

`bun run dev` and `bun run build` compile the browser runtime directly. There is no separate browser
package, generated library, or second agent application. Run `bun run check` for tests, TypeScript,
lint, and the Benji production build. Provider-backed tests remain opt-in; see
[provider regression checks](provider-tests.md). Keep generated `.eve`, `.next`, `.output`,
dependencies, environment files, and browser data untracked.

Browser tools must use `runBrowserOperation` and `runCancelableBrowserWork` from
`agent/lib/browser-runtime`. A server integration can call `browser.withHostedPage(signal, callback)`
under the same operation lock. Keep credentials and browser connection URLs out of tool results.
See [browser configuration and credential handling](browser-runtime.md).

## License and ownership

Benji maintains its browser implementation directly in this repository. There is no submodule
or separately maintained application to install. The root [MIT license](../LICENSE) preserves
the Browserbase copyright and license terms covering the browser source.

## Browser retirement

The web channel releases the hosted browser on terminal session events, including
when cleanup runs in a fresh worker. Eve 0.79.1 skips global stream hooks for completion outside
a turn, so cleanup uses channel callbacks. A failed release retains the browser ID and reaches
Eve's error logging; failed callbacks are not automatically retried. Starting a new conversation
resets the prior session and releases its browser. Browserbase sessions still have provider
lifetimes, so this does not guarantee an indefinitely running browser.

With Benji running locally and its provider credentials loaded, run the opt-in regression:

```sh
BENJI_LIVE_RETIREMENT=1 bun run test:retirement:live
```

The test opens example.com, checks browser reuse across two turns, resets the session, verifies
provider release, and deletes its temporary Context. It uses the configured model and Browserbase.
