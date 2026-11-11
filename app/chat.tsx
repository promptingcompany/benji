"use client";

import { Client } from "eve/client";
import { useEveAgent } from "eve/react";
import {
	ArrowUp,
	Download,
	Globe,
	LoaderCircle,
	MessageSquare,
	Plus,
	ShoppingBag,
	SlidersHorizontal,
	Square,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import {
	ChatContainerContent,
	ChatContainerRoot,
} from "@/components/ui/chat-container";
import { Input } from "@/components/ui/input";
import { Message, MessageContent } from "@/components/ui/message";
import {
	PromptInput,
	PromptInputActions,
	PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { ScrollButton } from "@/components/ui/scroll-button";
import { cn } from "@/lib/utils";
import type { ShoppingConfiguration } from "../server/shopping-configuration";
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

export default function Chat({
	sessionId,
	configuration,
}: {
	sessionId?: string;
	configuration: ShoppingConfiguration;
}) {
	const router = useRouter();
	const [input, setInput] = useState("");
	const [budget, setBudget] = useState("");
	const [destination, setDestination] = useState("");
	const [error, setError] = useState("");
	const [retiring, setRetiring] = useState(false);
	const [stopping, setStopping] = useState(false);
	const [showPreferences, setShowPreferences] = useState(false);
	const [showBrowser, setShowBrowser] = useState(false);
	const composerRef = useRef<HTMLDivElement>(null);
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
	const busy = agent.status === "submitted" || agent.status === "streaming";
	const waiting = busy || agent.status === "resuming" || retiring;
	let activity = "Researching your options…";
	if (agent.status === "resuming") activity = "Loading conversation…";
	if (retiring) activity = "Closing research…";
	const preview = browserPreview(agent.events);
	const messages = agent.data.messages.filter(
		(message) => message.role === "user" || message.role === "assistant",
	);
	const pending = agent.data.messages
		.flatMap((message) => message.parts)
		.flatMap((part) => {
			if (part.type !== "dynamic-tool" || part.state !== "approval-requested")
				return [];
			const request = part.toolMetadata?.eve?.inputRequest;
			return request ? [request] : [];
		});

	async function send() {
		if (!input.trim() || waiting || configuration.missing.length) return;
		const draft = input;
		const brief = [
			input.trim(),
			budget.trim() && `Budget (including currency): ${budget.trim()}`,
			destination.trim() && `Delivery region: ${destination.trim()}`,
		]
			.filter(Boolean)
			.join("\n\n");
		setError("");
		setInput("");
		try {
			await agent.send(brief);
		} catch {
			setInput(draft);
			setError("The request failed. Check the local server and try again.");
		}
	}

	async function newConversation() {
		if (retiring) return;
		setRetiring(true);
		setError("");
		try {
			if (agent.session)
				await new Client({ host: "" }).sessions
					.attach(agent.session.sessionId)
					.reset({ signal: AbortSignal.timeout(10_000) });
			agent.reset();
			setInput("");
			setBudget("");
			setDestination("");
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
			await new Client({ host: "" }).sessions
				.attach(agent.session.sessionId)
				.cancel({ signal: AbortSignal.timeout(10_000) });
		} catch {
			setError(
				"The agent could not be stopped. Its local session may have been interrupted by a server restart. Open a fresh chat to continue.",
			);
		} finally {
			setStopping(false);
		}
	}

	function exportConversation() {
		const text = [
			"# dealfinder shopping research",
			...messages.map(
				(message) =>
					`## ${message.role === "user" ? "You" : "dealfinder"}\n\n${message.parts
						.filter((part) => part.type === "text")
						.map((part) => part.text)
						.join("\n\n")}`,
			),
		].join("\n\n");
		const url = URL.createObjectURL(
			new Blob([text], { type: "text/markdown;charset=utf-8" }),
		);
		const link = document.createElement("a");
		link.href = url;
		link.download = `dealfinder-shopping-${new Date().toISOString().slice(0, 10)}.md`;
		link.click();
		URL.revokeObjectURL(url);
	}

	return (
		<main className="mx-auto flex h-dvh max-w-[1800px] flex-col overflow-hidden">
			<header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
				<div className="flex items-center gap-2.5">
					<Image
						src="/dealfinder.svg"
						width={36}
						height={36}
						alt=""
						loading="eager"
					/>
					<div>
						<h1 className="text-xl font-semibold tracking-tight">dealfinder</h1>
						<p className="text-[10px] text-muted-foreground">
							by The Prompting Company
						</p>
					</div>
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
			{configuration.missing.length > 0 && (
				<div
					role="status"
					className="shrink-0 border-b border-border bg-muted px-4 py-3 text-sm"
				>
					<p className="font-medium">Connect the agent to start researching</p>
					<p className="mt-1 break-words text-muted-foreground">
						Set {configuration.missing.join(" and ")} in
						apps/shopping-agent/.env.local, then restart the server. You can
						prepare your brief below.
					</p>
				</div>
			)}
			<div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
				<section
					aria-label="Shopping conversation"
					className={cn(
						"min-h-0 min-w-0 flex-col",
						showBrowser ? "hidden lg:flex" : "flex",
					)}
				>
					<ChatContainerRoot className="min-h-0 flex-1" aria-label="Messages">
						<ChatContainerContent className="mx-auto max-w-3xl gap-7 px-4 py-8 sm:px-8">
							{messages.length === 0 && (
								<div className="py-8 sm:py-16">
									<Image
										src="/dealfinder.svg"
										width={56}
										height={56}
										alt="dealfinder: a D with a spark cut out of its center"
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
										Find the right fit, compare real offers, and check the
										details before you buy.
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
													composerRef.current
														?.querySelector("textarea")
														?.focus();
												}}
											>
												{starter.label}
											</Button>
										))}
									</div>
								</div>
							)}
							{messages.map((message) => (
								<Message
									key={message.id}
									className={cn(
										"min-w-0 flex-col",
										message.role === "user" && "ml-auto max-w-[90%]",
									)}
								>
									<p
										className={cn(
											"text-xs font-medium text-muted-foreground",
											message.role === "user" && "text-right",
										)}
									>
										{message.role === "user" ? "You" : "dealfinder"}
									</p>
									<MessageContent
										className={cn(
											"research-prose min-w-0",
											message.role === "user"
												? "rounded-3xl px-5 py-2"
												: "bg-transparent p-0",
										)}
									>
										<Markdown remarkPlugins={[remarkGfm]}>
											{message.parts
												.filter((part) => part.type === "text")
												.map((part) => part.text)
												.join("\n\n")}
										</Markdown>
									</MessageContent>
								</Message>
							))}
							{waiting && (
								<div
									role="status"
									className="flex items-center gap-2 text-sm text-muted-foreground"
								>
									<LoaderCircle className="size-4 motion-safe:animate-spin" />
									{activity}
								</div>
							)}
							{pending.map((request) => (
								<fieldset
									key={request.requestId}
									className="my-4 space-y-3 rounded-lg border border-border p-4"
								>
									<legend className="px-1 text-sm font-medium">
										{request.prompt}
									</legend>
									{request.options?.map((option) => (
										<Button
											key={option.id}
											variant="outline"
											onClick={() =>
												void agent
													.respond([
														{
															requestId: request.requestId,
															optionId: option.id,
														},
													])
													.catch(() => setError("Reply failed. Try again."))
											}
										>
											{option.label}
										</Button>
									))}
									{request.allowFreeform && (
										<form
											className="space-y-2"
											onSubmit={(event) => {
												event.preventDefault();
												const text = String(
													new FormData(event.currentTarget).get("reply") ?? "",
												).trim();
												if (text)
													void agent
														.respond([{ requestId: request.requestId, text }])
														.catch(() => setError("Reply failed. Try again."));
											}}
										>
											<label
												htmlFor={`reply-${request.requestId}`}
												className="text-sm"
											>
												Your reply
											</label>
											<Input
												id={`reply-${request.requestId}`}
												name="reply"
												required
											/>
											<Button type="submit">Send reply</Button>
										</form>
									)}
								</fieldset>
							))}
						</ChatContainerContent>
						<ScrollButton className="absolute bottom-4 left-1/2 -translate-x-1/2" />
					</ChatContainerRoot>
					<div
						ref={composerRef}
						className="mx-auto w-full max-w-3xl shrink-0 px-3 pb-3 pt-2 sm:px-8 sm:pb-5"
					>
						<PromptInput
							value={input}
							onValueChange={setInput}
							isLoading={waiting}
							onSubmit={() => void send()}
							className="rounded-3xl"
						>
							{(error || agent.error) && (
								<div
									role="alert"
									className="mx-3 mb-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
								>
									<p>
										{error ||
											"The agent request failed. Retry or open a fresh chat."}
									</p>
									<a
										href="/"
										className="mt-2 inline-block font-medium underline underline-offset-4"
									>
										Open a fresh chat
									</a>
								</div>
							)}
							<label htmlFor="message" className="sr-only">
								Your shopping brief
							</label>
							<PromptInputTextarea
								id="message"
								placeholder="What do you need, and what matters most? You can include product links."
								disabled={waiting}
								className="min-h-20"
							/>
							{showPreferences && (
								<div
									id="shopping-preferences"
									className="grid grid-cols-2 gap-3 border-t border-border px-3 py-3"
								>
									<div className="space-y-1.5">
										<label htmlFor="budget" className="text-sm">
											Budget{" "}
											<span className="text-muted-foreground">(optional)</span>
										</label>
										<Input
											id="budget"
											placeholder="e.g. USD 300"
											value={budget}
											onChange={(event) => setBudget(event.target.value)}
											disabled={waiting}
										/>
									</div>
									<div className="space-y-1.5">
										<label htmlFor="destination" className="text-sm">
											Deliver to{" "}
											<span className="text-muted-foreground">(optional)</span>
										</label>
										<Input
											id="destination"
											placeholder="Country or region"
											value={destination}
											onChange={(event) => setDestination(event.target.value)}
											disabled={waiting}
										/>
									</div>
								</div>
							)}
							<PromptInputActions className="justify-between px-1 pb-1">
								<Button
									variant="ghost"
									size="sm"
									className="rounded-full text-muted-foreground"
									aria-expanded={showPreferences}
									aria-controls={
										showPreferences ? "shopping-preferences" : undefined
									}
									onClick={() => setShowPreferences(!showPreferences)}
								>
									<SlidersHorizontal /> Preferences
									{(budget || destination) && (
										<span
											role="img"
											className="size-1.5 rounded-full bg-foreground"
											aria-label="Preferences set"
										/>
									)}
								</Button>
								<div className="flex gap-2">
									{busy && (
										<Button
											variant="outline"
											size="icon"
											className="rounded-full"
											aria-label="Stop research"
											disabled={stopping}
											onClick={() => void stopResearch()}
										>
											<Square className="size-3 fill-current" />
										</Button>
									)}
									<Button
										type="button"
										size="icon"
										className="size-9 rounded-full"
										aria-label={
											messages.length ? "Send message" : "Start research"
										}
										onClick={() => void send()}
										disabled={
											waiting ||
											!input.trim() ||
											configuration.missing.length > 0
										}
									>
										<ArrowUp className="size-4" />
									</Button>
								</div>
							</PromptInputActions>
						</PromptInput>
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
				<aside
					aria-label="Browser evidence"
					className={cn(
						"min-h-0 min-w-0 overflow-y-auto bg-muted/20 lg:border-l lg:border-border",
						showBrowser ? "block" : "hidden lg:block",
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
							{preview.url}
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
								Merchant pages appear here when the agent takes a screenshot
								during your research.
							</p>
						</div>
					)}
					<div className="space-y-2 border-t border-border bg-muted/40 px-5 py-4 text-xs leading-5 text-muted-foreground">
						<p>
							{configuration.searchEnabled
								? "Public web search and browser verification are configured."
								: "Research uses the browser. Add PARALLEL_API_KEY to enable public web search."}
						</p>
					</div>
				</aside>
			</div>
		</main>
	);
}
