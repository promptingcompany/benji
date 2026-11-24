import type { ShoppingConfiguration } from "@/server/shopping-configuration";

function Command({ children }: { children: string }) {
	return (
		<code className="rounded bg-background px-1 py-0.5 font-mono text-[0.8125rem]">
			{children}
		</code>
	);
}

function notices(configuration: ShoppingConfiguration) {
	const lines: React.ReactNode[] = [];
	if (configuration.gatewayAuth === "token-missing")
		lines.push(
			<li key="token-missing">
				Benji reaches the model through AI Gateway with your Vercel project's
				OIDC token. Run <Command>vercel link</Command>, then{" "}
				<Command>vercel env pull .env.local</Command>, and restart the server.
			</li>,
		);
	if (configuration.gatewayAuth === "key-unresolved")
		lines.push(
			<li key="key-unresolved">
				<Command>AI_GATEWAY_API_KEY</Command> is set to a reference that was not
				resolved. Remove it: Benji uses your Vercel project's OIDC token, and a
				key overrides it.
			</li>,
		);
	if (configuration.gatewayAuth === "key-overrides")
		lines.push(
			<li key="key-overrides">
				<Command>AI_GATEWAY_API_KEY</Command> is set and overrides Vercel OIDC.
				Remove it to authenticate with the project's OIDC token.
			</li>,
		);
	if (configuration.gatewayAuth === "token-expired")
		lines.push(
			<li key="token-expired">
				Your Vercel OIDC token has expired. If requests fail, run{" "}
				<Command>vercel env pull .env.local</Command> again.
			</li>,
		);
	if (configuration.missing.includes("BROWSERBASE_API_KEY"))
		lines.push(
			<li key="browserbase">
				Set <Command>BROWSERBASE_API_KEY</Command> in{" "}
				<Command>.env.local</Command> and restart the server, or set{" "}
				<Command>STAGEHAND_BROWSER=local</Command> to use Chrome on this
				machine.
			</li>,
		);
	return lines;
}

export function SetupBanner({
	configuration,
}: {
	configuration: ShoppingConfiguration;
}) {
	const lines = notices(configuration);
	if (lines.length === 0) return null;
	return (
		<div
			role="status"
			className="shrink-0 border-b border-border bg-muted px-4 py-3 text-sm"
		>
			<p className="font-medium">
				{configuration.ready
					? "Check the agent's setup"
					: "Connect the agent to start researching"}
			</p>
			<ul className="mt-1 space-y-1 break-words text-muted-foreground">
				{lines}
			</ul>
			{!configuration.ready && (
				<p className="mt-1 text-muted-foreground">
					You can prepare your brief below.
				</p>
			)}
		</div>
	);
}
