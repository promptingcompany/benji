/**
 * Whether this process runs inside a Vercel deployment.
 *
 * `vercel env pull` writes the project's system variables into `.env.local`,
 * including `VERCEL=1` with `VERCEL_ENV=development`, so the `VERCEL` flag
 * alone also matches a local run that pulled its environment.
 */
export function onVercel(): boolean {
	return (
		Boolean(process.env.VERCEL) && process.env.VERCEL_ENV !== "development"
	);
}
