import { defineAgent } from "eve";

export default defineAgent({
	model: process.env.BENJI_MODEL ?? "openai/gpt-5.6-sol",
	build: {
		externalDependencies: [
			"@1password/sdk",
			"@browserbasehq/sdk",
			"@browserbasehq/stagehand",
			"playwright-core",
		],
	},
	limits: { sessionTimeoutMs: 24 * 60 * 60 * 1_000 },
});
