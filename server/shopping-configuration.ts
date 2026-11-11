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
	const required =
		browserMode === "local"
			? ["OPENAI_API_KEY"]
			: ["OPENAI_API_KEY", "BROWSERBASE_API_KEY"];
	return {
		missing: required.filter((name) => !configured(process.env[name])),
		searchEnabled: configured(process.env.PARALLEL_API_KEY),
		browserMode,
	};
}
