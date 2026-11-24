import { onVercel } from "./vercel-runtime";

/**
 * How the model request will authenticate to AI Gateway.
 *
 * Benji uses the Vercel project's OIDC token. Eve still prefers
 * `AI_GATEWAY_API_KEY` when it is set, so a leftover key is reported rather
 * than ignored.
 */
export type GatewayAuth =
	| "ready"
	| "token-missing"
	| "token-expired"
	| "key-overrides"
	| "key-unresolved";

export type ShoppingConfiguration = {
	/** Environment variables that must be set before a request can be sent. */
	missing: string[];
	gatewayAuth: GatewayAuth;
	/** Whether a request can be sent with the current configuration. */
	ready: boolean;
	browserMode: "local" | "browserbase";
};

function configured(value: string | undefined) {
	return Boolean(value?.trim() && !value.includes("op://"));
}

function tokenExpired(token: string, now: number) {
	try {
		const payload: unknown = JSON.parse(
			Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"),
		);
		if (typeof payload !== "object" || payload === null) return false;
		const expiry = (payload as { exp?: unknown }).exp;
		return typeof expiry === "number" && expiry * 1000 <= now;
	} catch {
		return false;
	}
}

function gatewayAuth(now: number): GatewayAuth {
	const key = process.env.AI_GATEWAY_API_KEY?.trim();
	if (key) return configured(key) ? "key-overrides" : "key-unresolved";
	// A Vercel deployment receives a fresh token with every request.
	if (onVercel()) return "ready";
	const token = process.env.VERCEL_OIDC_TOKEN?.trim();
	if (!token || !configured(token)) return "token-missing";
	// Eve can refresh an expired token in a linked project, so this is a hint.
	return tokenExpired(token, now) ? "token-expired" : "ready";
}

export function shoppingConfiguration(
	now: number = Date.now(),
): ShoppingConfiguration {
	const browserMode =
		process.env.STAGEHAND_BROWSER === "local" ||
		(process.env.STAGEHAND_BROWSER !== "browserbase" &&
			!process.env.BROWSERBASE_API_KEY)
			? "local"
			: "browserbase";
	const missing: string[] = [];
	const auth = gatewayAuth(now);
	if (auth === "token-missing") missing.push("VERCEL_OIDC_TOKEN");
	if (
		browserMode === "browserbase" &&
		!configured(process.env.BROWSERBASE_API_KEY)
	)
		missing.push("BROWSERBASE_API_KEY");
	return {
		missing,
		gatewayAuth: auth,
		ready: missing.length === 0 && auth !== "key-unresolved",
		browserMode,
	};
}
