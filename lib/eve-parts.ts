import type { EveMessage, EveMessagePart, EveToolPart } from "eve/client";

/**
 * What the chat shows for one tool call: a fixed phrase and a status.
 *
 * Tool input, output, and error detail are never shown. Benji's tools handle
 * saved logins, page contents, and screenshots, so the chat names the step and
 * nothing else.
 */
export type ToolActivity = {
	id: string;
	label: string;
	status: "running" | "waiting" | "done" | "error";
};

/** One renderable run of a message: prose, or the steps taken between prose. */
export type MessageBlock =
	| { type: "text"; id: string; text: string }
	| { type: "activity"; id: string; steps: ActivityStep[] };

export type ActivityStep =
	| { type: "reasoning"; id: string; text: string; streaming: boolean }
	| ({ type: "tool" } & ToolActivity);

/** Present and past phrases for each tool in `agent/tools`. */
const TOOL_PHRASES: Record<string, readonly [active: string, done: string]> = {
	web_search: ["Searching the web", "Searched the web"],
	web_fetch: ["Reading a page", "Read a page"],
	run: ["Using the browser", "Used the browser"],
	snapshot: ["Reading the open page", "Read the open page"],
	screenshot: ["Capturing the page", "Captured the page"],
	compare_offers: ["Comparing offers", "Compared offers"],
	merchant_access: ["Checking merchant access", "Checked merchant access"],
	human_handoff: [
		"Preparing a browser handoff",
		"Asked you to take over the browser",
	],
	context_create: ["Creating a browser Context", "Created a browser Context"],
	context_list: ["Checking saved Contexts", "Checked saved Contexts"],
	context_select: ["Opening a saved Context", "Opened a saved Context"],
	context_save: ["Saving the browser Context", "Saved the browser Context"],
	vault_list_logins: ["Checking saved logins", "Checked saved logins"],
	vault_login: ["Signing in", "Signed in"],
	ask_question: ["Asking you a question", "Asked you a question"],
};

function phrases(name: string): readonly [string, string] {
	const known = TOOL_PHRASES[name];
	if (known) return known;
	const words = name.replace(/[_-]+/g, " ").trim() || "tool";
	return [`Running ${words}`, `Ran ${words}`];
}

/**
 * The line to show for a tool call, or nothing for a call its tool hides.
 * `live` is whether the turn can still make progress: a call left unfinished
 * by a turn that is no longer running shows as waiting, not as running.
 */
export function toolActivity(
	part: EveToolPart,
	live: boolean,
): ToolActivity | undefined {
	if (part.hidden) return undefined;
	const [active, done] = phrases(part.name);
	switch (part.state) {
		case "completed":
			return { id: part.callId, label: done, status: "done" };
		case "failed":
			return { id: part.callId, label: `${active} failed`, status: "error" };
		case "rejected":
		case "cancelled":
			return {
				id: part.callId,
				label: `${active} was stopped`,
				status: "error",
			};
		case "approval":
		case "blocked":
			return { id: part.callId, label: active, status: "waiting" };
		default:
			return {
				id: part.callId,
				label: active,
				status: live ? "running" : "waiting",
			};
	}
}

/** The prose of a message, as shown in the transcript and the export. */
export function messageText(message: Pick<EveMessage, "parts">): string {
	return message.parts
		.filter((part) => part.type === "text")
		.map((part) => part.text)
		.join("\n\n");
}

function step(
	part: EveMessagePart,
	index: number,
	live: boolean,
): ActivityStep | undefined {
	if (part.type === "reasoning") {
		if (!part.text.trim() && part.state !== "streaming") return undefined;
		return {
			type: "reasoning",
			id: part.id ?? `reasoning-${index}`,
			text: part.text,
			streaming: live && part.state === "streaming",
		};
	}
	if (part.type === "tool") {
		const activity = toolActivity(part, live);
		return activity && { type: "tool", ...activity };
	}
	// Interactions render from the session's open interactions, and files have
	// no place in this transcript.
	return undefined;
}

/**
 * Splits a message into prose and the steps between it, in the order the turn
 * produced them. Consecutive reasoning and tool parts form one activity block.
 */
export function messageBlocks(
	message: Pick<EveMessage, "parts">,
	live: boolean,
): MessageBlock[] {
	const blocks: MessageBlock[] = [];
	message.parts.forEach((part, index) => {
		if (part.type === "text") {
			if (!part.text) return;
			blocks.push({
				type: "text",
				id: part.id ?? `text-${index}`,
				text: part.text,
			});
			return;
		}
		const next = step(part, index, live);
		if (!next) return;
		const last = blocks.at(-1);
		if (last?.type === "activity") last.steps.push(next);
		else
			blocks.push({ type: "activity", id: `activity-${index}`, steps: [next] });
	});
	return blocks;
}
