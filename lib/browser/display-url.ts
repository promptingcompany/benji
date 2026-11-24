/**
 * A URL safe to show a person or write to a log: embedded credentials are
 * dropped and query values whose names look like secrets are replaced.
 */
export function redactUrl(value: string): string {
	try {
		const url = new URL(value);
		url.username = "";
		url.password = "";
		for (const key of url.searchParams.keys()) {
			if (/(?:auth|code|key|otp|password|secret|token)/i.test(key))
				url.searchParams.set(key, "[REDACTED]");
		}
		return url.toString();
	} catch {
		return value;
	}
}
