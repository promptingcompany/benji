import { ShoppingBag } from "lucide-react";
import Image from "next/image";

import type { browserPreview } from "@/app/projection";
import { redactUrl } from "@/lib/browser/display-url";
import { cn } from "@/lib/utils";

/** The latest merchant page the agent captured, with its address and status. */
export function BrowserPanel({
	preview,
	className,
}: {
	preview: ReturnType<typeof browserPreview>;
	className?: string;
}) {
	return (
		<aside
			aria-label="Browser evidence"
			className={cn(
				"min-h-0 min-w-0 overflow-y-auto bg-muted/20 lg:border-l lg:border-border",
				className,
			)}
		>
			<div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
				<h2 className="text-sm font-medium">Browser evidence</h2>
				<span className="text-xs text-muted-foreground">
					{preview.httpStatus
						? `HTTP ${preview.httpStatus}`
						: "Captured on request"}
				</span>
			</div>
			{preview.url && (
				<p className="break-all border-b border-border px-5 py-3 text-xs text-muted-foreground">
					{redactUrl(preview.url)}
				</p>
			)}
			{preview.screenshot ? (
				<Image
					src={preview.screenshot}
					width={1360}
					height={900}
					unoptimized
					alt="Latest merchant page captured by the shopping agent"
					className="h-auto w-full"
				/>
			) : (
				<div className="flex min-h-64 flex-col items-center justify-center px-8 py-12 text-center sm:min-h-80">
					<ShoppingBag
						className="mb-4 size-8 text-muted-foreground"
						strokeWidth={1.25}
					/>
					<p className="font-medium">See the offer for yourself</p>
					<p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
						Merchant pages appear here when the agent takes a screenshot during
						your research.
					</p>
				</div>
			)}
			<div className="space-y-2 border-t border-border bg-muted/40 px-5 py-4 text-xs leading-5 text-muted-foreground">
				<p>Benji searches the public web, then checks offers in the browser.</p>
			</div>
		</aside>
	);
}
