import { copyFile, glob, mkdir } from "node:fs/promises";
import { join } from "node:path";

// Eve's dependency tracing omits the archive Stagehand uploads when creating a hosted browser.
const source = new URL(
	"./assets/stagehand-extension.zip",
	import.meta.resolve("@browserbasehq/stagehand"),
);
// On Vercel, `next build` runs a second Eve build into its own service output, and that
// is the output that gets deployed, so every build output present gets the archive.
// Tools run in the workflow function under functions/.well-known, which `**` skips
// because it is a dot directory, so it has its own pattern.
const stagehandDirectories = glob(
	[
		".output",
		".vercel/output",
		".eve/vercel-services/*/.vercel/output",
	].flatMap((output) => [
		`${output}/**/node_modules/@browserbasehq/stagehand/dist`,
		`${output}/functions/.well-known/**/node_modules/@browserbasehq/stagehand/dist`,
	]),
);
let copied = 0;
for await (const directory of stagehandDirectories) {
	const destination = join(directory, "assets");
	await mkdir(destination, { recursive: true });
	await copyFile(source, join(destination, "stagehand-extension.zip"));
	copied++;
}
if (!copied)
	throw new Error(
		"The built Eve server is missing Stagehand; browser assets were not packaged.",
	);
