import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const agentOrigin = "http://127.0.0.1:4321";
const children = new Set();
let shuttingDown = false;
let webStarted = false;
let startupTimeout;

function shutdown(code) {
	if (shuttingDown) return;
	shuttingDown = true;
	clearTimeout(startupTimeout);
	process.exitCode = code;
	for (const child of children) child.kill("SIGTERM");
}

function start(command, args, env = process.env) {
	const child = spawn(command, args, {
		env,
		stdio: ["ignore", "pipe", "pipe"],
	});
	children.add(child);
	child.stdout.pipe(process.stdout);
	child.stderr.pipe(process.stderr);
	child.once("error", (error) => {
		console.error(`Could not start ${command}:`, error.message);
		shutdown(1);
	});
	child.once("exit", (code, signal) => {
		children.delete(child);
		if (!shuttingDown) {
			console.error(
				`${command} exited (${signal ?? code}). Stopping the dev stack.`,
			);
			shutdown(code || 1);
		}
	});
	return child;
}

const agent = start("eve", [
	"dev",
	"--resume",
	"--no-ui",
	"--host",
	"127.0.0.1",
	"--port",
	"4321",
]);
startupTimeout = setTimeout(() => {
	console.error("Eve did not become ready within three minutes.");
	shutdown(1);
}, 180_000);

for (const stream of [agent.stdout, agent.stderr]) {
	createInterface({ input: stream }).on("line", (line) => {
		if (
			webStarted ||
			shuttingDown ||
			!line.includes("server listening at") ||
			!line.includes(agentOrigin)
		)
			return;
		webStarted = true;
		clearTimeout(startupTimeout);
		start("next", ["dev", "--hostname", "127.0.0.1", "--port", "4320"], {
			...process.env,
			EVE_BASE_URL: agentOrigin,
		});
	});
}

process.once("SIGINT", () => shutdown(130));
process.once("SIGTERM", () => shutdown(143));
