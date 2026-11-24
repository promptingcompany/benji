"use client";

import { CircleAlert, CircleCheck, CircleDashed } from "lucide-react";

import { Markdown } from "@/components/markdown";
import {
	Trace,
	TraceCollapsible,
	TraceCollapsibleContent,
	TraceCollapsibleTrigger,
	TraceIcon,
	TraceLine,
	TraceTitle,
} from "@/components/ui/trace";
import type { ActivityStep, MessageBlock, ToolActivity } from "@/lib/eve-parts";

const TRACE_STATUS = {
	running: "running",
	waiting: "pending",
	error: "error",
	done: undefined,
} as const satisfies Record<ToolActivity["status"], string | undefined>;

const STATUS_ICON = {
	running: CircleDashed,
	waiting: CircleDashed,
	error: CircleAlert,
	done: CircleCheck,
} as const;

function ReasoningStep({
	text,
	streaming,
}: {
	text: string;
	streaming: boolean;
}) {
	const line = (
		<TraceLine status={streaming ? "running" : undefined}>
			<TraceTitle>{streaming ? "Thinking" : "Thought it through"}</TraceTitle>
		</TraceLine>
	);
	if (!text.trim()) return line;
	return (
		<TraceCollapsible>
			<TraceCollapsibleTrigger>{line}</TraceCollapsibleTrigger>
			<TraceCollapsibleContent className="whitespace-pre-wrap">
				{text}
			</TraceCollapsibleContent>
		</TraceCollapsible>
	);
}

function ToolStep({ label, status }: Pick<ToolActivity, "label" | "status">) {
	const Icon = STATUS_ICON[status];
	return (
		<TraceLine status={TRACE_STATUS[status]}>
			<TraceIcon>
				<Icon />
			</TraceIcon>
			<TraceTitle>{label}</TraceTitle>
		</TraceLine>
	);
}

function Step({ step }: { step: ActivityStep }) {
	return step.type === "reasoning" ? (
		<ReasoningStep text={step.text} streaming={step.streaming} />
	) : (
		<ToolStep label={step.label} status={step.status} />
	);
}

/** The agent's side of a message: prose, with the steps taken between it. */
export function MessageBlocks({ blocks }: { blocks: MessageBlock[] }) {
	return blocks.map((block) =>
		block.type === "text" ? (
			<Markdown key={block.id}>{block.text}</Markdown>
		) : (
			<Trace key={block.id}>
				{block.steps.map((step) => (
					<Step key={step.id} step={step} />
				))}
			</Trace>
		),
	);
}
