"use client";

import type { EveMessage } from "eve/client";
import type { ReactNode } from "react";

import { MessageBlocks } from "@/components/chat/message-parts";
import { Markdown } from "@/components/markdown";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
	Message,
	MessageContent,
	MessageHeader,
} from "@/components/ui/message";
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { TraceLine, TraceTitle } from "@/components/ui/trace";
import { type MessageBlock, messageBlocks, messageText } from "@/lib/eve-parts";

function UserMessage({ message }: { message: EveMessage }) {
	return (
		<Message align="end">
			<MessageContent>
				<MessageHeader className="justify-end">You</MessageHeader>
				<Bubble align="end" variant="secondary" className="max-w-[90%]">
					<BubbleContent className="rounded-3xl px-5">
						<Markdown>{messageText(message)}</Markdown>
					</BubbleContent>
				</Bubble>
			</MessageContent>
		</Message>
	);
}

function AgentMessage({ blocks }: { blocks: MessageBlock[] }) {
	return (
		<Message>
			<MessageContent className="gap-3">
				<MessageHeader className="px-0">Benji</MessageHeader>
				<MessageBlocks blocks={blocks} />
			</MessageContent>
		</Message>
	);
}

/**
 * The transcript. `live` is whether the session can still make progress, which
 * decides whether unfinished steps read as running. `activity` is the status
 * line shown while the agent works, and `children` follow the last message.
 */
export function MessageList({
	messages,
	live,
	activity,
	empty,
	children,
}: {
	messages: readonly EveMessage[];
	live: boolean;
	activity?: string;
	empty: ReactNode;
	children?: ReactNode;
}) {
	return (
		<MessageScrollerProvider autoScroll>
			<MessageScroller className="min-h-0 flex-1">
				<MessageScrollerViewport aria-label="Messages">
					<MessageScrollerContent className="mx-auto w-full max-w-3xl gap-7 px-4 py-8 sm:px-8">
						{messages.length === 0 && empty}
						{messages.map((message) => {
							if (message.role === "user")
								return (
									<MessageScrollerItem
										key={message.id}
										messageId={message.id}
										scrollAnchor
									>
										<UserMessage message={message} />
									</MessageScrollerItem>
								);
							// A message with only hidden or empty parts has nothing to
							// show, so it gets no item and leaves no gap.
							const blocks = messageBlocks(message, live);
							if (blocks.length === 0) return null;
							return (
								<MessageScrollerItem key={message.id} messageId={message.id}>
									<AgentMessage blocks={blocks} />
								</MessageScrollerItem>
							);
						})}
						{activity && (
							<TraceLine status="running" role="status">
								<TraceTitle>{activity}</TraceTitle>
							</TraceLine>
						)}
						{children}
					</MessageScrollerContent>
				</MessageScrollerViewport>
				<MessageScrollerButton />
			</MessageScroller>
		</MessageScrollerProvider>
	);
}
