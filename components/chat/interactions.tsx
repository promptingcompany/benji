"use client";

import type { openInteractions } from "eve/events";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemFooter,
	ItemTitle,
} from "@/components/ui/item";

type OpenInteraction = ReturnType<typeof openInteractions>[number];

export type InteractionAnswer =
	| { interactionId: string; optionId: string }
	| { interactionId: string; text: string };

function InteractionPrompt({
	interaction: { interactionId, request },
	onAnswer,
}: {
	interaction: OpenInteraction;
	onAnswer: (answer: InteractionAnswer) => Promise<void>;
}) {
	const titleId = useId();
	const replyId = useId();
	// The prompt stays until Eve settles the interaction, so block a second
	// answer while the first is on its way.
	const [sending, setSending] = useState(false);
	function submit(answer: InteractionAnswer) {
		if (sending) return;
		setSending(true);
		void onAnswer(answer).finally(() => setSending(false));
	}
	return (
		<Item
			variant="outline"
			role="group"
			aria-labelledby={titleId}
			className="items-start"
		>
			<ItemContent>
				<ItemTitle id={titleId}>{request.prompt}</ItemTitle>
			</ItemContent>
			{request.options && request.options.length > 0 && (
				<ItemActions className="basis-full flex-wrap">
					{request.options.map((option) => (
						<Button
							key={option.id}
							variant="outline"
							disabled={sending}
							onClick={() => submit({ interactionId, optionId: option.id })}
						>
							{option.label}
						</Button>
					))}
				</ItemActions>
			)}
			{request.allowFreeform && (
				<ItemFooter>
					<form
						className="flex w-full flex-wrap items-end gap-2"
						onSubmit={(event) => {
							event.preventDefault();
							const text = String(
								new FormData(event.currentTarget).get("reply") ?? "",
							).trim();
							if (text) submit({ interactionId, text });
						}}
					>
						<div className="min-w-48 flex-1 space-y-1.5">
							<label htmlFor={replyId} className="text-sm">
								Your reply
							</label>
							<Input id={replyId} name="reply" required disabled={sending} />
						</div>
						<Button type="submit" disabled={sending}>
							Send reply
						</Button>
					</form>
				</ItemFooter>
			)}
		</Item>
	);
}

/** Questions the agent is waiting on a person to answer. */
export function Interactions({
	interactions,
	onAnswer,
}: {
	interactions: readonly OpenInteraction[];
	onAnswer: (answer: InteractionAnswer) => Promise<void>;
}) {
	return interactions.map((interaction) => (
		<InteractionPrompt
			key={interaction.interactionId}
			interaction={interaction}
			onAnswer={onAnswer}
		/>
	));
}
