import {
	BrowserHandoffError,
	resolveBrowserHandoffLiveViewUrl,
} from "../../../../server/browser/handoff";

export const runtime = "nodejs";

export async function GET(
	_request: Request,
	context: { params: Promise<{ token: string }> },
) {
	const { token } = await context.params;
	try {
		const liveViewUrl = await resolveBrowserHandoffLiveViewUrl(token);
		return new Response(null, {
			status: 307,
			headers: {
				"cache-control": "no-store, private, max-age=0",
				location: liveViewUrl,
				"referrer-policy": "no-referrer",
				"x-content-type-options": "nosniff",
			},
		});
	} catch (error) {
		let status = 404;
		if (error instanceof BrowserHandoffError) {
			if (error.code === "expired") status = 410;
			else if (error.code === "configuration" || error.code === "unavailable")
				status = 503;
		}
		return Response.json(
			{
				error:
					status === 410
						? "This handoff link expired. Ask dealfinder for a new link."
						: "The live browser is not available.",
			},
			{
				status,
				headers: {
					"cache-control": "no-store, private, max-age=0",
					"referrer-policy": "no-referrer",
					"x-content-type-options": "nosniff",
				},
			},
		);
	}
}
