import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function Message({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("flex gap-3", className)} {...props} />;
}

function MessageContent({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"rounded-lg bg-secondary p-2 text-foreground break-words whitespace-normal",
				className,
			)}
			{...props}
		/>
	);
}

export { Message, MessageContent };
