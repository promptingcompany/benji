import assert from "node:assert/strict";
import Browserbase from "@browserbasehq/sdk";
import { Client, SessionNotActiveError } from "eve/client";

// Opt-in: requires a running local Benji and uses the configured model/browser.
if (
	process.env.BENJI_LIVE_RETIREMENT !== "1" ||
	!process.env.BROWSERBASE_API_KEY
)
	throw new Error(
		"Set BENJI_LIVE_RETIREMENT=1 and BROWSERBASE_API_KEY for this live test.",
	);
const origin = new URL(
	process.env.BENJI_TEST_ORIGIN || "http://127.0.0.1:4320",
);
if (
	origin.protocol !== "http:" ||
	!["127.0.0.1", "localhost"].includes(origin.hostname)
)
	throw new Error("This test accepts only a local Benji origin.");
const client = new Client({ baseUrl: origin.origin });
const browserbase = new Browserbase({
	apiKey: process.env.BROWSERBASE_API_KEY,
});
let session;
const browserIds = new Set();
const contextIds = new Set();
const remember = (events) => {
	for (const event of events) {
		const browser = event.data?.output?.workbench?.browser;
		if (browser?.sessionId) browserIds.add(browser.sessionId);
		if (browser?.contextId) contextIds.add(browser.contextId);
	}
};

try {
	const created = await client.sessions.create({
		message:
			"Bounded integration test: use run to visit https://example.com/, then snapshot. Reply with the page title. Do not visit other sites, use saved Contexts or vaults, or send messages.",
		signal: AbortSignal.timeout(90_000),
	});
	session = created.session;
	const first = await created.delivery.result();
	remember((await session.snapshot()).events);
	assert.equal(first.status, "completed");
	assert.ok(first.reply?.includes("Example Domain"));
	assert.equal(browserIds.size, 1);
	const second = await (
		await session.send(
			"Without navigating, use snapshot to confirm the current page title and URL. Reply briefly.",
			{ signal: AbortSignal.timeout(45_000) },
		)
	).result();
	remember((await session.snapshot()).events);
	assert.equal(second.status, "completed");
	assert.equal(
		browserIds.size,
		1,
		"Follow-up must reuse the same hosted browser",
	);
	const ended = await (
		await session.end({ reason: "Completed browser retirement regression" })
	).result();
	assert.ok(ended.sessionEnded, "End must retire the session");
	const completionDeadline = Date.now() + 20_000;
	let completed = false;
	do {
		const snapshot = await session.snapshot();
		const end = snapshot.events.find((event) => event.type === "session.ended");
		assert.notEqual(
			end?.data.outcome,
			"failed",
			"Session failed during retirement",
		);
		completed = end?.data.outcome === "completed";
		if (completed) break;
		await new Promise((resolve) => setTimeout(resolve, 500));
	} while (Date.now() < completionDeadline);
	assert.ok(completed, "End must publish a completed session.ended");
	for (const id of browserIds) {
		const deadline = Date.now() + 20_000;
		let status;
		do {
			status = (await browserbase.sessions.retrieve(id)).status;
			if (status === "COMPLETED") break;
			await new Promise((resolve) => setTimeout(resolve, 500));
		} while (Date.now() < deadline);
		assert.equal(status, "COMPLETED", "End must release the hosted browser");
	}
	console.log(
		"Live retirement passed: two turns shared one browser; end emitted completion and Browserbase confirmed COMPLETED.",
	);
} finally {
	const cleanupErrors = [];
	if (session) {
		// Recover IDs even if a model assertion fails. Do not print private events.
		try {
			remember((await session.snapshot()).events);
		} catch {
			/* Session may not have started. */
		}
		try {
			await session.end({ reason: "Integration test cleanup" });
		} catch (error) {
			if (!SessionNotActiveError.is(error))
				cleanupErrors.push("Eve session end failed");
		}
	}
	for (const id of browserIds) {
		try {
			if ((await browserbase.sessions.retrieve(id)).status !== "COMPLETED")
				await browserbase.sessions.update(id, { status: "REQUEST_RELEASE" });
		} catch {
			cleanupErrors.push("Browser release failed");
		}
	}
	for (const id of contextIds) {
		try {
			await browserbase.contexts.delete(id, {
				headers: { "Content-Type": null },
			});
		} catch {
			cleanupErrors.push("Temporary Context deletion failed");
		}
	}
	if (cleanupErrors.length) throw new Error(cleanupErrors.join("; "));
}
