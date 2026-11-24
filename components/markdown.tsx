import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/** Renders model or user prose. Styles live in `.research-prose`. */
export function Markdown({
	children,
	className,
}: {
	children: string;
	className?: string;
}) {
	return (
		<div className={cn("research-prose min-w-0", className)}>
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
		</div>
	);
}
