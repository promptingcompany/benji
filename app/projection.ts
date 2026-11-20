export function browserPreview(events: readonly unknown[]) {
	let screenshot: string | undefined;
	let url: string | undefined;
	let httpStatus: number | undefined;
	const toolNames = new Map<string, string>();
	for (const value of events) {
		if (!value || typeof value !== "object") continue;
		const event = value as {
			type?: string;
			data?: {
				callId?: string;
				capability?: { name?: string };
				outcome?: string;
				output?: unknown;
			};
		};
		const data = event.data;
		if (
			event.type === "call.requested" &&
			data?.callId &&
			data.capability?.name
		)
			toolNames.set(data.callId, data.capability.name);
		if (
			event.type !== "call.settled" ||
			data?.outcome !== "completed" ||
			!data.output ||
			typeof data.output !== "object"
		)
			continue;
		const envelope = data.output as {
			result?: Record<string, unknown>;
			workbench?: { screenshotDataUrl?: string; browser?: { url?: string } };
		};
		const output = envelope.result ?? (data.output as Record<string, unknown>);
		const workbench = envelope.workbench;
		const nextUrl =
			typeof output.url === "string" ? output.url : workbench?.browser?.url;
		if (
			(data.callId && toolNames.get(data.callId) === "run") ||
			(typeof nextUrl === "string" && nextUrl !== url)
		) {
			// Ordinary browser work can navigate without reporting an HTTP status.
			httpStatus = undefined;
			screenshot = undefined;
		}
		if (typeof nextUrl === "string") url = nextUrl;
		if (typeof output.httpStatus === "number") {
			httpStatus = output.httpStatus;
			screenshot = undefined;
		}
		if (
			typeof output.screenshot === "string" &&
			output.screenshot.startsWith("data:image/png;base64,")
		)
			screenshot = output.screenshot;
		if (workbench?.screenshotDataUrl?.startsWith("data:image/png;base64,"))
			screenshot = workbench.screenshotDataUrl;
		if (output.closed === true) {
			screenshot = undefined;
			url = undefined;
			httpStatus = undefined;
		}
	}
	return { screenshot, url, httpStatus };
}
