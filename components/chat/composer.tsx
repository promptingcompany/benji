"use client";

import { ArrowUp, SlidersHorizontal, Square } from "lucide-react";
import { type RefObject, useId, useState } from "react";

import { Input } from "@/components/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from "@/components/ui/input-group";

export type ShoppingPreferences = { budget: string; destination: string };

/**
 * The shopping brief field, its optional budget and delivery preferences, and
 * the send and stop controls. Enter sends; Shift + Enter adds a line.
 */
export function Composer({
	value,
	onValueChange,
	preferences,
	onPreferencesChange,
	onSubmit,
	onStop,
	disabled,
	canSend,
	showStop,
	stopping,
	error,
	started,
	textareaRef,
}: {
	value: string;
	onValueChange: (value: string) => void;
	preferences: ShoppingPreferences;
	onPreferencesChange: (preferences: ShoppingPreferences) => void;
	onSubmit: () => void;
	onStop: () => void;
	/** The agent is working, so the brief cannot be edited or sent. */
	disabled: boolean;
	canSend: boolean;
	showStop: boolean;
	stopping: boolean;
	error?: string;
	/** Whether the conversation already has messages. */
	started: boolean;
	textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
	const [showPreferences, setShowPreferences] = useState(false);
	const preferencesId = useId();
	const budgetId = useId();
	const destinationId = useId();
	const preferencesSet = Boolean(
		preferences.budget.trim() || preferences.destination.trim(),
	);

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				onSubmit();
			}}
		>
			{error && (
				<div
					role="alert"
					className="mb-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
				>
					<p>{error}</p>
					<a
						href="/"
						className="mt-2 inline-block font-medium underline underline-offset-4"
					>
						Open a fresh chat
					</a>
				</div>
			)}
			{/* The group dims when anything inside is disabled, including Send.
			    Each control already shows its own disabled state. */}
			<InputGroup className="rounded-3xl bg-background has-disabled:bg-background has-disabled:opacity-100">
				<label htmlFor="message" className="sr-only">
					Your shopping brief
				</label>
				<InputGroupTextarea
					ref={textareaRef}
					id="message"
					value={value}
					onChange={(event) => onValueChange(event.target.value)}
					onKeyDown={(event) => {
						if (
							event.key === "Enter" &&
							!event.shiftKey &&
							!event.nativeEvent.isComposing
						) {
							event.preventDefault();
							onSubmit();
						}
					}}
					placeholder="What do you need, and what matters most? You can include product links."
					disabled={disabled}
					className="max-h-60 min-h-20 px-4 pt-3"
				/>
				{showPreferences && (
					<div
						id={preferencesId}
						className="grid w-full grid-cols-2 gap-3 border-t border-border px-4 py-3"
					>
						<div className="space-y-1.5">
							<label htmlFor={budgetId} className="text-sm">
								Budget <span className="text-muted-foreground">(optional)</span>
							</label>
							<Input
								id={budgetId}
								placeholder="e.g. USD 300"
								value={preferences.budget}
								onChange={(event) =>
									onPreferencesChange({
										...preferences,
										budget: event.target.value,
									})
								}
								disabled={disabled}
							/>
						</div>
						<div className="space-y-1.5">
							<label htmlFor={destinationId} className="text-sm">
								Deliver to{" "}
								<span className="text-muted-foreground">(optional)</span>
							</label>
							<Input
								id={destinationId}
								placeholder="Country or region"
								value={preferences.destination}
								onChange={(event) =>
									onPreferencesChange({
										...preferences,
										destination: event.target.value,
									})
								}
								disabled={disabled}
							/>
						</div>
					</div>
				)}
				<InputGroupAddon
					align="block-end"
					className="justify-between"
					onClick={(event) => {
						if (!(event.target as HTMLElement).closest("button"))
							textareaRef.current?.focus();
					}}
				>
					<InputGroupButton
						size="sm"
						className="rounded-full text-muted-foreground"
						aria-expanded={showPreferences}
						aria-controls={showPreferences ? preferencesId : undefined}
						onClick={() => setShowPreferences(!showPreferences)}
					>
						<SlidersHorizontal /> Preferences
						{preferencesSet && (
							<span
								role="img"
								className="size-1.5 rounded-full bg-foreground"
								aria-label="Preferences set"
							/>
						)}
					</InputGroupButton>
					<div className="flex gap-2">
						{showStop && (
							<InputGroupButton
								variant="outline"
								size="icon-sm"
								className="rounded-full"
								aria-label="Stop research"
								disabled={stopping}
								onClick={onStop}
							>
								<Square className="size-3 fill-current" />
							</InputGroupButton>
						)}
						<InputGroupButton
							type="submit"
							variant="default"
							size="icon-sm"
							className="rounded-full"
							aria-label={started ? "Send message" : "Start research"}
							disabled={!canSend}
						>
							<ArrowUp />
						</InputGroupButton>
					</div>
				</InputGroupAddon>
			</InputGroup>
		</form>
	);
}
