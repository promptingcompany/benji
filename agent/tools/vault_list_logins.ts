import { defineTool, toolOutput } from "eve/tools";
import { z } from "zod";
import { nativeVault } from "../../server/browser/vault/native.js";
import { onePasswordVault } from "../../server/browser/vault/onepassword.js";

export default defineTool({
	description:
		"List safe login metadata and opaque item IDs from configured vaults. No secret values are returned. Use the returned provider and IDs, and choose only an item whose allowedHosts contains the current page host.",
	inputSchema: z.object({
		provider: z.enum(["native", "onepassword"]).optional(),
	}),
	async execute({ provider }) {
		const items = [];
		if (
			provider === "native" ||
			(!provider && process.env.DEALFINDER_VAULT_MASTER_KEY?.trim())
		)
			items.push(...(await nativeVault.list()));
		if (
			provider === "onepassword" ||
			(!provider &&
				(process.env.OP_SERVICE_ACCOUNT_TOKEN?.trim() ||
					process.env.OP_ACCOUNT?.trim()))
		)
			items.push(
				...(await onePasswordVault.list()).map((item) => ({
					...item,
					provider: "onepassword" as const,
				})),
			);
		return { items };
	},
	toModelOutput(output) {
		return toolOutput.json(output);
	},
});
