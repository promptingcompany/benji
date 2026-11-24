import type { EveMessagePart, EveToolPart } from "eve/client";
import { describe, expect, it } from "vitest";

import { messageBlocks, messageText, toolActivity } from "../lib/eve-parts.js";

function tool(overrides: Partial<EveToolPart> & { name: string }): EveToolPart {
	return {
		type: "tool",
		callId: `call-${overrides.name}`,
		stepIndex: 0,
		kind: "tool",
		label: "Label chosen by Eve",
		state: "completed",
		...overrides,
	} as EveToolPart;
}

describe("tool activity", () => {
	it("names a known tool without its input, output, or Eve's label", () => {
		const activity = toolActivity(
			tool({
				name: "vault_login",
				input: { username: "person@example.com" },
				output: { password: "hunter2" },
			}),
			true,
		);
		expect(activity).toEqual({
			id: "call-vault_login",
			label: "Signed in",
			status: "done",
		});
		expect(JSON.stringify(activity)).not.toMatch(/example\.com|hunter2|Eve/);
	});

	it("falls back to the tool name for a tool it does not know", () => {
		expect(toolActivity(tool({ name: "price_history" }), true)?.label).toBe(
			"Ran price history",
		);
	});

	it("leaves out a call its tool hides", () => {
		expect(
			toolActivity(tool({ name: "web_search", hidden: true }), true),
		).toBeUndefined();
	});

	it.each([
		["streaming", true, "running", "Searching the web"],
		["requested", true, "running", "Searching the web"],
		["running", true, "running", "Searching the web"],
		["running", false, "waiting", "Searching the web"],
		["approval", true, "waiting", "Searching the web"],
		["blocked", true, "waiting", "Searching the web"],
		["completed", true, "done", "Searched the web"],
		["failed", true, "error", "Searching the web failed"],
		["rejected", true, "error", "Searching the web was stopped"],
		["cancelled", true, "error", "Searching the web was stopped"],
	] as const)("maps %s (live: %s) to %s", (state, live, status, label) => {
		const part =
			state === "streaming"
				? tool({ name: "web_search", state, inputText: '{"query":"secret' })
				: tool({ name: "web_search", state });
		expect(toolActivity(part, live)).toMatchObject({ status, label });
	});

	it("does not surface error detail", () => {
		const activity = toolActivity(
			tool({
				name: "run",
				state: "failed",
				error: { message: "token=abc123 rejected" },
			} as Partial<EveToolPart> & { name: string }),
			true,
		);
		expect(JSON.stringify(activity)).not.toContain("abc123");
	});
});

describe("message blocks", () => {
	const parts: EveMessagePart[] = [
		{ type: "reasoning", id: "r1", text: "Compare sellers.", state: "done" },
		tool({ name: "web_search" }),
		{ type: "text", id: "t1", text: "I found three offers." },
		tool({ name: "screenshot", state: "running" }),
		{ type: "text", id: "t2", text: "The lowest is $40." },
	];

	it("keeps prose and steps in the order the turn produced them", () => {
		expect(messageBlocks({ parts }, true)).toEqual([
			{
				type: "activity",
				id: "activity-0",
				steps: [
					{
						type: "reasoning",
						id: "r1",
						text: "Compare sellers.",
						streaming: false,
					},
					{
						type: "tool",
						id: "call-web_search",
						label: "Searched the web",
						status: "done",
					},
				],
			},
			{ type: "text", id: "t1", text: "I found three offers." },
			{
				type: "activity",
				id: "activity-3",
				steps: [
					{
						type: "tool",
						id: "call-screenshot",
						label: "Capturing the page",
						status: "running",
					},
				],
			},
			{ type: "text", id: "t2", text: "The lowest is $40." },
		]);
	});

	it("skips interactions, files, hidden calls, and empty reasoning", () => {
		const blocks = messageBlocks(
			{
				parts: [
					{ type: "interaction" } as EveMessagePart,
					{ type: "file", mediaType: "image/png" },
					tool({ name: "web_search", hidden: true }),
					{ type: "reasoning", text: " ", state: "done" },
				],
			},
			true,
		);
		expect(blocks).toEqual([]);
	});

	it("only streams reasoning while the turn is live", () => {
		const streaming: EveMessagePart[] = [
			{ type: "reasoning", text: "Thinking", state: "streaming" },
		];
		expect(messageBlocks({ parts: streaming }, true)[0]).toMatchObject({
			steps: [{ streaming: true }],
		});
		expect(messageBlocks({ parts: streaming }, false)[0]).toMatchObject({
			steps: [{ streaming: false }],
		});
	});

	it("joins the prose of a message for export", () => {
		expect(messageText({ parts })).toBe(
			"I found three offers.\n\nThe lowest is $40.",
		);
	});
});
