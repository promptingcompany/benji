import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { shoppingConfiguration } from "../server/shopping-configuration.js";

const NOW = Date.UTC(2026, 0, 1);

function token(expiresAt: number) {
	const encode = (value: unknown) =>
		Buffer.from(JSON.stringify(value)).toString("base64url");
	return `${encode({ alg: "RS256" })}.${encode({ exp: Math.floor(expiresAt / 1000) })}.signature`;
}

describe("shopping configuration", () => {
	beforeEach(() => {
		for (const name of [
			"AI_GATEWAY_API_KEY",
			"VERCEL_OIDC_TOKEN",
			"VERCEL",
			"VERCEL_ENV",
			"BROWSERBASE_API_KEY",
			"STAGEHAND_BROWSER",
		])
			vi.stubEnv(name, undefined);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("is ready with a current OIDC token", () => {
		vi.stubEnv("VERCEL_OIDC_TOKEN", token(NOW + 60_000));
		expect(shoppingConfiguration(NOW)).toMatchObject({
			missing: [],
			gatewayAuth: "ready",
			ready: true,
			browserMode: "local",
		});
	});

	it("asks for an OIDC token when none is set", () => {
		expect(shoppingConfiguration(NOW)).toMatchObject({
			missing: ["VERCEL_OIDC_TOKEN"],
			gatewayAuth: "token-missing",
			ready: false,
		});
	});

	it("treats an unresolved token reference as missing", () => {
		vi.stubEnv("VERCEL_OIDC_TOKEN", "op://vault/item/token");
		expect(shoppingConfiguration(NOW).gatewayAuth).toBe("token-missing");
	});

	it("is ready on Vercel without a token in the environment", () => {
		vi.stubEnv("VERCEL", "1");
		expect(shoppingConfiguration(NOW)).toMatchObject({
			gatewayAuth: "ready",
			ready: true,
		});
	});

	it("still checks the token when a pulled environment sets VERCEL locally", () => {
		vi.stubEnv("VERCEL", "1");
		vi.stubEnv("VERCEL_ENV", "development");
		expect(shoppingConfiguration(NOW).gatewayAuth).toBe("token-missing");
		vi.stubEnv("VERCEL_OIDC_TOKEN", token(NOW - 60_000));
		expect(shoppingConfiguration(NOW).gatewayAuth).toBe("token-expired");
	});

	it("flags an expired token without blocking requests", () => {
		vi.stubEnv("VERCEL_OIDC_TOKEN", token(NOW - 60_000));
		expect(shoppingConfiguration(NOW)).toMatchObject({
			missing: [],
			gatewayAuth: "token-expired",
			ready: true,
		});
	});

	it("does not call a token it cannot read expired", () => {
		vi.stubEnv("VERCEL_OIDC_TOKEN", "not-a-jwt");
		expect(shoppingConfiguration(NOW).gatewayAuth).toBe("ready");
	});

	it("reports a leftover AI Gateway key, which overrides OIDC", () => {
		vi.stubEnv("VERCEL", "1");
		vi.stubEnv("AI_GATEWAY_API_KEY", "gateway-key");
		expect(shoppingConfiguration(NOW)).toMatchObject({
			gatewayAuth: "key-overrides",
			ready: true,
		});
	});

	it("blocks requests while a leftover key is an unresolved reference", () => {
		vi.stubEnv("VERCEL_OIDC_TOKEN", token(NOW + 60_000));
		vi.stubEnv("AI_GATEWAY_API_KEY", "op://vault/item/key");
		expect(shoppingConfiguration(NOW)).toMatchObject({
			missing: [],
			gatewayAuth: "key-unresolved",
			ready: false,
		});
	});

	it("requires a Browserbase key when the hosted browser is selected", () => {
		vi.stubEnv("VERCEL", "1");
		vi.stubEnv("STAGEHAND_BROWSER", "browserbase");
		expect(shoppingConfiguration(NOW)).toMatchObject({
			missing: ["BROWSERBASE_API_KEY"],
			ready: false,
			browserMode: "browserbase",
		});
	});
});
