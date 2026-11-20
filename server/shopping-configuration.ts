export type ShoppingConfiguration = {
	missing: string[];
	searchEnabled: boolean;
	browserMode: "local" | "browserbase";
};

function configured(value: string | undefined) {
	return Boolean(value?.trim() && !value.includes("op://"));
}

export function shoppingConfiguration(): ShoppingConfiguration {
	const browserMode =
		process.env.STAGEHAND_BROWSER === "local" ||
		(process.env.STAGEHAND_BROWSER !== "browserbase" &&
			!process.env.BROWSERBASE_API_KEY)
			? "local"
			: "browserbase";
	const missing: string[] = [];
	if (
		!configured(process.env.AI_GATEWAY_API_KEY) &&
		!configured(process.env.VERCEL_OIDC_TOKEN) &&
		process.env.VERCEL !== "1"
	)
		missing.push("AI_GATEWAY_API_KEY");
	if (
		browserMode === "browserbase" &&
		!configured(process.env.BROWSERBASE_API_KEY)
	)
		missing.push("BROWSERBASE_API_KEY");
	return {
		missing,
		searchEnabled: configured(process.env.PARALLEL_API_KEY),
		browserMode,
	};
}
