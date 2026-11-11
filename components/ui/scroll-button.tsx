"use client";

import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function ScrollButton({ className, ...props }: ComponentProps<typeof Button>) {
	const { isAtBottom, scrollToBottom } = useStickToBottomContext();
	if (isAtBottom) return null;
	return (
		<Button
			variant="outline"
			size="icon"
			aria-label="Scroll to latest message"
			className={cn("size-10 rounded-full shadow-sm", className)}
			onClick={() => void scrollToBottom()}
			{...props}
		>
			<ChevronDown className="size-5" />
		</Button>
	);
}

export { ScrollButton };
