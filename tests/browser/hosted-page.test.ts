import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Readable } from "node:stream";
import { browserbase, localBrowser } from "@browserbasehq/stagehand";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	BrowserSession,
	browserbaseLaunchOptions,
} from "../../server/browser/browser-session";
import type { ConversationState } from "../../server/browser/types";

function fixture() {
	const state: ConversationState = {
		id: "shared-test",
		traces: [],
		browser: { provider: "not-started", status: "idle" },
	};
	const session = new BrowserSession(state);
	const page = {
		url: async () => "https://example.com/",
		title: async () => "Example",
	};
	vi.spyOn(session, "start").mockResolvedValue();
	vi.spyOn(
		session as unknown as { gateCaptcha(): Promise<void> },
		"gateCaptcha",
	).mockResolvedValue();
	Object.assign(session, {
		remoteSessionId: "private-session",
		browser: { context: { activePage: async () => page } },
		browserbase: {
			sessions: {
				retrieve: async () => ({ connectUrl: "wss://private-connection" }),
			},
		},
	});
	return { session, state, page };
}
function hostedLaunch(
	options: ConstructorParameters<typeof BrowserSession>[1] = {},
) {
	vi.useFakeTimers();
	vi.stubEnv("STAGEHAND_BROWSER", "browserbase");
	vi.stubEnv("BROWSERBASE_API_KEY", "test-key");
	vi.stubEnv("RICK_BROWSERBASE_PROXIES", "");
	vi.stubEnv("RICK_BROWSERBASE_VERIFIED", "");
	const launch = vi.spyOn(browserbase, "launch");
	const state: ConversationState = {
		id: "hosted-launch-test",
		traces: [],
		browser: { provider: "not-started", status: "idle" },
	};
	return { launch, state, session: new BrowserSession(state, options) };
}

async function refusingLaunch(
	options: Parameters<typeof browserbase.launch>[0],
): Promise<never> {
	await options.clientOptions?.fetch?.(
		"https://api.browserbase.com/v1/sessions",
		{ method: "POST" },
	);
	throw new Error("Failed to create a Browserbase session");
}

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});
describe("shared hosted-page integration boundary", () => {
	it("uses the existing page and exposes only the callback result", async () => {
		const { session, state, page } = fixture();
		const operation = vi.fn(async (active, connection, sessionId) => {
			expect(active).toBe(page);
			expect(connection).toBe("wss://private-connection");
			expect(sessionId).toBe("private-session");
			return { accepted: true };
		});
		expect(
			await session.withHostedPage(new AbortController().signal, operation),
		).toEqual({
			accepted: true,
		});
		expect(state.browser.url).toBe("https://example.com/");
		expect(JSON.stringify(state)).not.toContain("private-connection");
	});
	it("does not observe the page or run post-CAPTCHA snapshots after a private operation", async () => {
		const { session, state, page } = fixture();
		const title = vi.spyOn(page, "title"),
			url = vi.spyOn(page, "url");
		await session.withHostedPage(
			new AbortController().signal,
			async () => ({ submitted: true }),
			true,
		);
		expect(title).not.toHaveBeenCalled();
		expect(url).not.toHaveBeenCalled();
		expect(
			(session as unknown as { gateCaptcha: unknown }).gateCaptcha,
		).toHaveBeenCalledTimes(1);
		expect(state.browser.url).toBeUndefined();
	});
	it("does no work for an already-cancelled call", async () => {
		const { session } = fixture();
		const operation = vi.fn();
		await expect(
			session.withHostedPage(AbortSignal.abort(), operation),
		).rejects.toThrow();
		expect(operation).not.toHaveBeenCalled();
	});
	it("releases the operation lock after a failed callback", async () => {
		const { session } = fixture();
		await expect(
			session.withHostedPage(new AbortController().signal, async () => {
				throw new Error("failed");
			}),
		).rejects.toThrow("failed");
		await expect(
			session.withHostedPage(new AbortController().signal, async () => "next"),
		).resolves.toBe("next");
	});
	it("always disables hosted recording", () => {
		const options = browserbaseLaunchOptions("test-key", {
			proxies: false,
			verified: false,
		});
		expect(options.browserSettings.logSession).toBe(false);
		expect(options.browserSettings.recordSession).toBe(false);
		expect(options.userMetadata.networkLogging).toBe("false");
		expect(options.userMetadata.sessionRecording).toBe("false");
	});

	it.each([
		[{}, { proxies: false, verified: false }],
		[{ RICK_BROWSERBASE_PROXIES: "1" }, { proxies: true, verified: false }],
		[{ RICK_BROWSERBASE_VERIFIED: "true" }, { proxies: false, verified: true }],
		[
			{
				RICK_BROWSERBASE_PROXIES: "yes",
				RICK_BROWSERBASE_VERIFIED: "0",
			},
			{ proxies: false, verified: false },
		],
	])("launches with settings %j requesting %j", async (settings, expected) => {
		const { launch, session, state } = hostedLaunch();
		for (const [name, value] of Object.entries(settings))
			vi.stubEnv(name, value);
		launch.mockRejectedValue(new Error("stop after the request"));
		const failure = expect(session.start()).rejects.toThrow();
		await vi.runAllTimersAsync();
		await failure;
		const [options] = launch.mock.calls[0];
		expect("proxies" in options).toBe(expected.proxies);
		expect("verified" in (options.browserSettings ?? {})).toBe(
			expected.verified,
		);
		if (expected.proxies) expect(options.proxies).toBe(true);
		if (expected.verified) expect(options.browserSettings?.verified).toBe(true);
		expect(options.keepAlive).toBe(true);
		expect(options.api_timeout).toBe(3600);
		expect(
			state.traces.find((trace) => trace.name === "browser.start.retry")
				?.detail,
		).toMatchObject(expected);
	});

	it("passes a proxy location only when managed proxies are on", async () => {
		const location = { country: "US", state: "CA" };
		const { launch, session } = hostedLaunch({ proxyLocation: location });
		vi.stubEnv("RICK_BROWSERBASE_PROXIES", "1");
		launch.mockRejectedValue(new Error("stop after the request"));
		const failure = expect(session.start()).rejects.toThrow();
		await vi.runAllTimersAsync();
		await failure;
		expect(launch.mock.calls[0][0].proxies).toEqual([
			{ type: "browserbase", geolocation: location },
		]);
	});

	it("refuses a proxy location without managed proxies before contacting Browserbase", async () => {
		const ensureContext = vi.fn();
		const { launch, session } = hostedLaunch({
			proxyLocation: { country: "US" },
			ensureContext,
		});
		await expect(session.start()).rejects.toThrow("RICK_BROWSERBASE_PROXIES");
		expect(ensureContext).not.toHaveBeenCalled();
		expect(launch).not.toHaveBeenCalled();
	});

	it("reports a plan refusal with Browserbase's reason and does not retry it", async () => {
		const { launch, session } = hostedLaunch();
		vi.stubEnv("RICK_BROWSERBASE_PROXIES", "1");
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				Response.json(
					{
						statusCode: 402,
						message: "Proxies are not included in the free plan.",
					},
					{ status: 402 },
				),
			),
		);
		launch.mockImplementation(refusingLaunch);
		const failure = expect(session.start()).rejects.toMatchObject({
			name: "BrowserbaseRefusalError",
			status: 402,
			message: expect.stringContaining(
				"Proxies are not included in the free plan.",
			),
		});
		await vi.runAllTimersAsync();
		await failure;
		expect(launch).toHaveBeenCalledTimes(1);
	});

	it("sends a streamed upload through the launch's fetch", async () => {
		const received: string[] = [];
		const server = createServer((request, response) => {
			request.setEncoding("utf8");
			request.on("data", (chunk) => received.push(chunk));
			request.on("end", () => response.end("{}"));
		});
		await new Promise<void>((resolve) =>
			server.listen(0, "127.0.0.1", resolve),
		);
		const { port } = server.address() as AddressInfo;
		const { launch, session } = hostedLaunch();
		launch.mockImplementation(async (options) => {
			await options.clientOptions?.fetch?.(
				`http://127.0.0.1:${port}/v1/extensions`,
				{
					method: "POST",
					body: Readable.toWeb(Readable.from(["extension archive"])),
				} as RequestInit,
			);
			throw new Error("stop after the upload");
		});
		vi.useRealTimers();
		await session.start().catch(() => undefined);
		server.close();
		expect(received[0]).toBe("extension archive");
	}, 20_000);

	it("names the underlying reason when a launch fails", async () => {
		const { launch, session } = hostedLaunch();
		launch.mockRejectedValue(
			new Error("Failed to upload the Stagehand extension.", {
				cause: new Error("ENOENT: no such file or directory"),
			}),
		);
		const failure = expect(session.start()).rejects.toThrow(
			"Cause: ENOENT: no such file or directory",
		);
		await vi.runAllTimersAsync();
		await failure;
	});

	it("retries a rate-limited session request", async () => {
		const { launch, session } = hostedLaunch();
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response("Too many requests", {
						status: 429,
						statusText: "Too Many Requests",
					}),
			),
		);
		launch.mockImplementation(refusingLaunch);
		const failure = expect(session.start()).rejects.toThrow(
			"(HTTP 429): Too many requests",
		);
		await vi.runAllTimersAsync();
		await failure;
		expect(launch).toHaveBeenCalledTimes(3);
	});

	it("retries hosted failures and never falls back to local Chrome", async () => {
		const { launch } = hostedLaunch();
		launch.mockRejectedValue(new Error("Synthetic launch failure"));
		const localLaunch = vi.spyOn(localBrowser, "launch");
		const state: ConversationState = {
			id: "hosted-retry-test",
			traces: [],
			browser: { provider: "not-started", status: "idle" },
		};
		const session = new BrowserSession(state);
		const failure = expect(session.start()).rejects.toThrow(
			"Synthetic launch failure",
		);
		await vi.runAllTimersAsync();
		await failure;
		expect(launch).toHaveBeenCalledTimes(3);
		expect(localLaunch).not.toHaveBeenCalled();
	});
});
