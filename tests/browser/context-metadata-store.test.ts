import {
	mkdir,
	mkdtemp,
	readdir,
	readFile,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { BlobPreconditionFailedError, type GetBlobResult } from "@vercel/blob";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	BlobContextMetadataStorage,
	type ContextMetadataBlobClient,
	ContextMetadataStore,
	FileContextMetadataStorage,
} from "../../server/browser/context-metadata-store";

let directory: string;
let filePath: string;

beforeEach(async () => {
	directory = await mkdtemp(path.join(os.tmpdir(), "benji-context-metadata-"));
	filePath = path.join(directory, "contexts.json");
});

afterEach(async () => {
	await rm(directory, { recursive: true, force: true });
});

describe("browser context metadata", () => {
	it("preserves concurrent additions across store instances and equivalent paths", async () => {
		const stores = [
			new ContextMetadataStore(filePath),
			new ContextMetadataStore(path.relative(process.cwd(), filePath)),
		];
		await Promise.all(
			Array.from({ length: 8 }, (_, index) =>
				stores[index % stores.length].add(
					`context_${index}`,
					`Context ${index}`,
				),
			),
		);

		const value = await stores[0].read();
		expect(Object.keys(value.contexts)).toEqual(
			Array.from({ length: 8 }, (_, index) => `context_${index}`),
		);
		expect(value.selectedContextId).toBe("context_0");
		expect(await readdir(directory)).toEqual(["contexts.json"]);
		expect((await stat(filePath)).mode & 0o777).toBe(0o600);
	});

	it("serializes draft promotion, renewal, selection, and removal with other writes", async () => {
		const first = new ContextMetadataStore(filePath);
		const second = new ContextMetadataStore(filePath);
		const expiresAt = new Date("2026-12-01T00:00:00.000Z");
		await first.add("context_old", "Old");
		await first.addDraft("context_saved", "Draft", "session_one", expiresAt);
		await first.addDraft("context_draft", "Draft", "session_two", expiresAt);
		const renewedAt = new Date("2026-12-02T00:00:00.000Z");

		await Promise.all([
			first.remove("context_old"),
			second.promote("context_saved", "Saved"),
			first.add("context_new", "New"),
			second.touchDraft("context_draft", renewedAt),
			first.select("context_saved"),
		]);

		const value = await second.read();
		expect(Object.keys(value.contexts).sort()).toEqual([
			"context_draft",
			"context_new",
			"context_saved",
		]);
		expect(value.selectedContextId).toBe("context_saved");
		expect(value.contexts.context_saved).toMatchObject({
			name: "Saved",
			status: "saved",
		});
		expect(value.contexts.context_saved).not.toHaveProperty("ownerSessionId");
		expect(value.contexts.context_saved).not.toHaveProperty("expiresAt");
		expect(value.contexts.context_draft.expiresAt).toBe(
			renewedAt.toISOString(),
		);
	});

	it("allows the next queued mutation to proceed after a failed mutation", async () => {
		const store = new ContextMetadataStore(filePath);
		const results = await Promise.allSettled([
			store.select("context_missing"),
			store.add("context_new", "New"),
		]);
		expect(results[0].status).toBe("rejected");
		expect(results[1].status).toBe("fulfilled");
		expect((await store.read()).contexts.context_new.name).toBe("New");
	});

	it.each([
		"{broken",
		JSON.stringify({}),
		JSON.stringify({ contexts: [] }),
		JSON.stringify({ contexts: { context_broken: null } }),
		JSON.stringify({
			contexts: {
				context_broken: { name: "Broken", createdAt: "bad", updatedAt: "bad" },
			},
		}),
	])("refuses to overwrite invalid existing data: %s", async (contents) => {
		await writeFile(filePath, contents);
		const store = new ContextMetadataStore(filePath);
		await expect(store.read()).rejects.toThrow("metadata is invalid");
		await expect(store.add("context_new", "New")).rejects.toThrow(
			"metadata is invalid",
		);
		expect(await readFile(filePath, "utf8")).toBe(contents);
		expect(await readdir(directory)).toEqual(["contexts.json"]);
	});

	it("propagates filesystem read errors instead of treating them as an empty store", async () => {
		await mkdir(filePath);
		const store = new ContextMetadataStore(filePath);
		await expect(store.read()).rejects.toMatchObject({ code: "EISDIR" });
		await expect(store.add("context_new", "New")).rejects.toMatchObject({
			code: "EISDIR",
		});
	});

	it("removes its temporary file when the atomic replacement fails", async () => {
		const storage = new FileContextMetadataStorage(filePath);
		const store = new ContextMetadataStore(storage);
		vi.spyOn(storage, "load").mockImplementationOnce(async () => {
			// Simulate another filesystem operation blocking replacement after the read.
			await mkdir(filePath);
			return undefined;
		});
		await expect(store.add("context_new", "New")).rejects.toThrow();
		expect(await readdir(directory)).toEqual(["contexts.json"]);

		await rm(filePath, { recursive: true });
		await store.add("context_new", "New");
		expect((await store.read()).contexts.context_new.name).toBe("New");
	});

	it("reads the existing metadata format, including saved contexts without status", async () => {
		const value = {
			selectedContextId: "context_legacy",
			contexts: {
				context_legacy: {
					name: "Existing login",
					createdAt: "2026-09-01T00:00:00.000Z",
					updatedAt: "2026-09-01T00:00:00.000Z",
				},
			},
		};
		await writeFile(filePath, JSON.stringify(value));
		expect(await new ContextMetadataStore(filePath).read()).toEqual(value);
	});
});

function saved(name: string) {
	const at = "2026-11-12T00:00:00.000Z";
	return { name, createdAt: at, updatedAt: at };
}

/** One private Blob store shared by every simulated function instance. */
function fakeBlobStore() {
	const blobs = new Map<string, { contents: string; etag: string }>();
	let revision = 0;
	const puts: { ifMatch?: string; allowOverwrite?: boolean }[] = [];
	const client = {
		async get(pathname: string, options: { access: string }) {
			expect(options.access).toBe("private");
			const stored = blobs.get(pathname);
			if (!stored) return null;
			return {
				statusCode: 200,
				stream: new Response(stored.contents).body,
				headers: new Headers(),
				blob: { etag: stored.etag },
			} as unknown as GetBlobResult;
		},
		async put(
			pathname: string,
			body: string,
			options: { access: string; allowOverwrite?: boolean; ifMatch?: string },
		) {
			expect(options.access).toBe("private");
			puts.push({
				ifMatch: options.ifMatch,
				allowOverwrite: options.allowOverwrite,
			});
			const stored = blobs.get(pathname);
			if (options.ifMatch !== undefined && stored?.etag !== options.ifMatch)
				throw new BlobPreconditionFailedError();
			if (stored && !options.allowOverwrite)
				throw new Error("This blob already exists.");
			const etag = `"etag-${++revision}"`;
			blobs.set(pathname, { contents: body, etag });
			return { etag };
		},
	};
	const read = client.get;
	return {
		blobs,
		puts,
		writeFromAnotherInstanceAfterNextRead(
			contexts: Record<string, ReturnType<typeof saved>>,
		) {
			client.get = async (pathname, options) => {
				client.get = read;
				const result = await read(pathname, options);
				blobs.set(pathname, {
					contents: JSON.stringify({ contexts }),
					etag: `"etag-${++revision}"`,
				});
				return result;
			};
		},
		instance: () =>
			new ContextMetadataStore(
				new BlobContextMetadataStorage(
					client as unknown as ContextMetadataBlobClient,
				),
			),
	};
}

describe("Vercel Blob metadata", () => {
	it("lets a later step on another instance read a Context saved by an earlier one", async () => {
		const store = fakeBlobStore();
		const expiresAt = new Date("2026-12-01T00:00:00.000Z");
		await store
			.instance()
			.addDraft("context_draft", "Draft", "session", expiresAt);
		await store.instance().promote("context_draft", "Target login");

		const value = await store.instance().read();
		expect(value.selectedContextId).toBe("context_draft");
		expect(value.contexts.context_draft).toMatchObject({
			name: "Target login",
			status: "saved",
		});
		expect(store.puts).toEqual([
			{ ifMatch: undefined, allowOverwrite: false },
			{ ifMatch: '"etag-1"', allowOverwrite: true },
		]);
	});

	it("rereads and retries instead of losing a write from another instance", async () => {
		const store = fakeBlobStore();
		await store.instance().add("context_first", "First");
		store.writeFromAnotherInstanceAfterNextRead({
			context_first: saved("First"),
			context_second: saved("Second"),
		});

		await store.instance().add("context_third", "Third");

		expect(
			Object.keys((await store.instance().read()).contexts).sort(),
		).toEqual(["context_first", "context_second", "context_third"]);
	});

	it("treats a lost create race as a conflict and keeps both records", async () => {
		const store = fakeBlobStore();
		store.writeFromAnotherInstanceAfterNextRead({
			context_other: saved("Other"),
		});

		await store.instance().add("context_mine", "Mine");

		expect(
			Object.keys((await store.instance().read()).contexts).sort(),
		).toEqual(["context_mine", "context_other"]);
	});

	it("refuses to overwrite invalid metadata in Blob", async () => {
		const store = fakeBlobStore();
		store.blobs.set("benji/contexts.json", {
			contents: "{broken",
			etag: '"x"',
		});
		await expect(store.instance().add("context_new", "New")).rejects.toThrow(
			"metadata is invalid",
		);
		expect(store.blobs.get("benji/contexts.json")?.contents).toBe("{broken");
		expect(store.puts).toEqual([]);
	});
});

describe("default location", () => {
	it("saves under the temp directory on Vercel, where the code directory is read-only", async () => {
		vi.stubEnv("VERCEL", "1");
		vi.stubEnv("BENJI_CONTEXT_METADATA_PATH", "");
		const cwd = vi
			.spyOn(process, "cwd")
			.mockReturnValue(path.join(directory, "read-only"));
		const tmpdir = vi.spyOn(os, "tmpdir").mockReturnValue(directory);
		try {
			await new ContextMetadataStore().add("ctx_1", "Benji");
			const saved = JSON.parse(
				await readFile(path.join(directory, ".benji", "contexts.json"), "utf8"),
			);
			expect(JSON.stringify(saved)).toContain("ctx_1");
		} finally {
			cwd.mockRestore();
			tmpdir.mockRestore();
			vi.unstubAllEnvs();
		}
	});
});
