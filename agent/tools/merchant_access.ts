import { defineTool, toolOutput } from "eve/tools";
import { z } from "zod";
import { baselayerConfigured } from "../../server/baselayer";
import { allowedMerchantUrl } from "../../server/merchant-access";
import { verifiedMerchantAccess } from "../../server/verified-merchant";
import {
	runBrowserOperation,
	runCancelableBrowserWork,
} from "../lib/browser-runtime";

export default defineTool({
	description:
		"Only for a URL on the deployment's Baselayer allowlist: open it with a fresh L2 credential and nonce-bound proof in this conversation's existing browser. For every other page, use run. Returns access status only. Snapshot and screenshot afterward. Later protected navigations need this tool again. Never purchases or checks out.",
	inputSchema: z.object({ url: z.string().url().max(2048) }),
	execute({ url }, ctx) {
		if (!baselayerConfigured())
			throw new Error(
				"Baselayer merchant access is not set up on this deployment. Open the page with run instead.",
			);
		const target = allowedMerchantUrl(url).href;
		return runCancelableBrowserWork(ctx.session.id, ctx.abortSignal, () =>
			runBrowserOperation(ctx.session.id, (browser) =>
				browser.withHostedPage(ctx.abortSignal, (page, connectUrl) =>
					verifiedMerchantAccess(page, connectUrl, target, ctx.abortSignal),
				),
			),
		);
	},
	toModelOutput(output) {
		return toolOutput.json(output.result);
	},
});
