"use client";

import { Client } from "eve/client";
import { activeTurn, openInteractions } from "eve/events";
import { useEveAgent } from "eve/react";
import { Download, Globe, MessageSquare, Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { BrowserPanel } from "@/components/chat/browser-panel";
import { Composer, type ShoppingPreferences } from "@/components/chat/composer";
import {
	type InteractionAnswer,
	Interactions,
} from "@/components/chat/interactions";
import { MessageList } from "@/components/chat/message-list";
import { SetupBanner } from "@/components/chat/setup-banner";
import { Button } from "@/components/ui/button";
import { messageText } from "@/lib/eve-parts";
import { cn } from "@/lib/utils";
import type { ShoppingConfiguration } from "@/server/shopping-configuration";
import { browserPreview } from "./projection";

const starters = [
	{
		label: "Find the right product",
		prompt:
			"Find three noise-cancelling headphones for long flights. Prioritize comfort, battery life, and value. Compare current offers and explain the tradeoffs.",
	},
	{
		label: "Lowest delivered price",
		prompt:
			"Find the lowest delivered price for a product I name. Ask me for the product and delivery postcode, check the brand's store and at least two retailers, and compare item price, shipping, and tax.",
	},
	{
		label: "Take it to checkout",
		prompt:
			"Add a product to the cart and take it as far as the payment page as a guest. Ask me for the product, exact size or color, quantity, and store, confirm the cart matches, and tell me every step you completed. Do not pay.",
	},
	{
		label: "Compare two products",
		prompt:
			"Help me choose between two products. Ask me for their names or links and what matters most to me, then compare the exact variants and current offers.",
	},
	{
		label: "Check a listing",
		prompt:
			"Help me check a product listing before I buy. Ask me for the URL, then verify the seller, exact variant, price, shipping, returns, and warranty.",
	},
];

const NO_PREFERENCES: ShoppingPreferences = { budget: "", destination: "" };

export default function Chat({
	sessionId,
	configuration,
}: {
	sessionId?: string;
	configuration: ShoppingConfiguration;
}) {
	const router = useRouter();
	const [input, setInput] = useState("");
	const [preferences, setPreferences] = useState(NO_PREFERENCES);
	const [error, setError] = useState("");
	const [retiring, setRetiring] = useState(false);
	const [stopping, setStopping] = useState(false);
	const [showBrowser, setShowBrowser] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const agent = useEveAgent({
		initialSession: sessionId ? { sessionId, streamIndex: 0 } : undefined,
		resume: Boolean(sessionId),
		onSessionChange(session) {
			if (session && !sessionId) {
				window.history.replaceState(
					null,
					"",
					`/s/${encodeURIComponent(session.sessionId)}`,
				);
			}
		},
	});
	const busy = agent.status === "busy";
	const turnOpen = activeTurn(agent.view) !== undefined;
	const waiting = busy || agent.status === "resuming" || retiring;
	let activity = "Researching your options…";
	if (agent.status === "resuming") activity = "Loading conversation…";
	if (retiring) activity = "Closing research…";
	const preview = browserPreview(agent.events);
	const messages = agent.messages;
	const pending = openInteractions(agent.view).filter(
		(interaction) => interaction.request.kind !== "sign-in",
	);

	async function send() {
		if (!input.trim() || waiting || !configuration.ready) return;
		const draft = input;
		const budget = preferences.budget.trim();
		const destination = preferences.destination.trim();
		const brief = [
			input.trim(),
			budget && `Budget (including currency): ${budget}`,
			destination && `Delivery region: ${destination}`,
		]
			.filter(Boolean)
			.join("\n\n");
		setError("");
		setInput("");
		try {
			await agent.send(brief);
		} catch {
			setInput(draft);
			setError(
				"The request failed. Check that the agent is running and try again.",
			);
		}
	}

	async function newConversation() {
		if (retiring) return;
		setRetiring(true);
		setError("");
		try {
			if (agent.session)
				await new Client({ baseUrl: "" }).sessions
					.attach(agent.session.sessionId)
					.end({ signal: AbortSignal.timeout(10_000) });
			agent.newSession();
			setInput("");
			setPreferences(NO_PREFERENCES);
			router.push("/");
		} catch {
			setError(
				"This conversation could not be closed. Open a fresh chat to continue; this transcript stays at its current URL.",
			);
		} finally {
			setRetiring(false);
		}
	}

	async function stopResearch() {
		if (!agent.session || stopping) return;
		setStopping(true);
		setError("");
		try {
			await new Client({ baseUrl: "" }).sessions
				.attach(agent.session.sessionId)
				.cancel({ signal: AbortSignal.timeout(10_000) });
		} catch {
			setError(
				"The agent could not be stopped. Its session may have been interrupted by a restart. Open a fresh chat to continue.",
			);
		} finally {
			setStopping(false);
		}
	}

	async function answer(reply: InteractionAnswer) {
		try {
			await agent.respond([reply]);
		} catch {
			setError("Reply failed. Try again.");
		}
	}

	function exportConversation() {
		const text = [
			"# Benji shopping research",
			...messages.map(
				(message) =>
					`## ${message.role === "user" ? "You" : "Benji"}\n\n${messageText(message)}`,
			),
		].join("\n\n");
		const url = URL.createObjectURL(
			new Blob([text], { type: "text/markdown;charset=utf-8" }),
		);
		const link = document.createElement("a");
		link.href = url;
		link.download = `benji-shopping-${new Date().toISOString().slice(0, 10)}.md`;
		link.click();
		URL.revokeObjectURL(url);
	}

	return (
		<main className="mx-auto flex h-dvh max-w-[1800px] flex-col overflow-hidden">
			<header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-5 sm:px-6">
				<div className="flex items-center gap-2.5">
					<h1 className="shrink-0">
						<Image
							src="/brand/logo.svg"
							width={100}
							height={28}
							alt="Benji"
							loading="eager"
						/>
					</h1>
					<p className="max-w-20 text-[10px] text-muted-foreground sm:max-w-none">
						by The Prompting Company
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						variant="ghost"
						size="icon"
						className="lg:hidden"
						aria-label={
							showBrowser ? "Show conversation" : "Show browser evidence"
						}
						aria-pressed={showBrowser}
						onClick={() => setShowBrowser(!showBrowser)}
					>
						{showBrowser ? <MessageSquare /> : <Globe />}
					</Button>
					<Button
						variant="ghost"
						size="icon"
						aria-label="Export research"
						disabled={!messages.length}
						onClick={exportConversation}
					>
						<Download />
					</Button>
					<Button
						variant="outline"
						disabled={retiring}
						onClick={() => void newConversation()}
					>
						<Plus /> <span className="hidden sm:inline">New research</span>
						<span className="sr-only sm:hidden">New research</span>
					</Button>
				</div>
			</header>
			<SetupBanner configuration={configuration} />
			<div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
				<section
					aria-label="Shopping conversation"
					className={cn(
						"min-h-0 min-w-0 flex-col",
						showBrowser ? "hidden lg:flex" : "flex",
					)}
				>
					<MessageList
						messages={messages}
						live={busy || turnOpen}
						activity={waiting ? activity : undefined}
						empty={
							<div className="py-8 sm:py-16">
								<Image
									src="/brand/icon.svg"
									width={56}
									height={56}
									alt="Benji"
									loading="eager"
									className="mb-6"
								/>
								<p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
									A little research. A better buy.
								</p>
								<h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
									What are you shopping for?
								</h2>
								<p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
									Find the right fit, compare real offers, and check the details
									before you buy.
								</p>
								<div className="mt-4 flex flex-wrap gap-2">
									{starters.map((starter) => (
										<Button
											key={starter.label}
											variant="outline"
											className="rounded-full"
											size="sm"
											disabled={waiting}
											onClick={() => {
												setInput(starter.prompt);
												textareaRef.current?.focus();
											}}
										>
											{starter.label}
										</Button>
									))}
								</div>
							</div>
						}
					>
						<Interactions interactions={pending} onAnswer={answer} />
					</MessageList>
					<div className="mx-auto w-full max-w-3xl shrink-0 px-3 pb-3 pt-2 sm:px-8 sm:pb-5">
						<Composer
							value={input}
							onValueChange={setInput}
							preferences={preferences}
							onPreferencesChange={setPreferences}
							onSubmit={() => void send()}
							onStop={() => void stopResearch()}
							disabled={waiting}
							canSend={!waiting && Boolean(input.trim()) && configuration.ready}
							showStop={busy || turnOpen}
							stopping={stopping}
							error={
								error ||
								(agent.error
									? "The agent request failed. Retry or open a fresh chat."
									: undefined)
							}
							started={messages.length > 0}
							textareaRef={textareaRef}
						/>
						<p className="mt-2 text-center text-[11px] text-muted-foreground">
							{configuration.browserMode === "local"
								? "Local browser"
								: "Browserbase"}
							<span className="hidden sm:inline">
								{" "}
								· Enter to send, Shift + Enter for a new line
							</span>
						</p>
					</div>
				</section>
				<BrowserPanel
					preview={preview}
					className={showBrowser ? "block" : "hidden lg:block"}
				/>
			</div>
		</main>
	);
}
