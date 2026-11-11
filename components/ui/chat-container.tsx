"use client";

import type { ComponentProps } from "react";
import { StickToBottom } from "use-stick-to-bottom";
import { cn } from "@/lib/utils";

function ChatContainerRoot({
	className,
	...props
}: ComponentProps<typeof StickToBottom>) {
	return (
		<StickToBottom
			className={cn("relative flex overflow-hidden", className)}
			resize="smooth"
			initial="instant"
			role="log"
			{...props}
		/>
	);
}

function ChatContainerContent({
	className,
	...props
}: ComponentProps<typeof StickToBottom.Content>) {
	return (
		<StickToBottom.Content
			className={cn("flex w-full flex-col", className)}
			{...props}
		/>
	);
}

export { ChatContainerContent, ChatContainerRoot };
