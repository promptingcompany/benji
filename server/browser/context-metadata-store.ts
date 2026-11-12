import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as blob from "@vercel/blob";
import { z } from "zod";

const metadataSchema = z.object({
	selectedContextId: z.string().optional(),
	contexts: z.record(
		z.string(),
		z.object({
			name: z.string(),
			createdAt: z.iso.datetime(),
			updatedAt: z.iso.datetime(),
			status: z.enum(["draft", "saved"]).optional(),
			ownerSessionId: z.string().optional(),
			expiresAt: z.iso.datetime().optional(),
		}),
	),
});

export type ContextMetadataFile = z.infer<typeof metadataSchema>;

export interface StoredContextMetadata {
	contents: string;
	version?: string;
}

export interface ContextMetadataStorage {
	readonly key: string;
	load(): Promise<StoredContextMetadata | undefined>;
	/** Throws ContextMetadataConflictError when the stored version is no longer `version`. */
	save(contents: string, version: string | undefined): Promise<void>;
}

export class ContextMetadataConflictError extends Error {
	constructor() {
		super("Browser context metadata changed during the update.");
	}
}

const MAX_UPDATE_ATTEMPTS = 5;

// All instances in this process share the read/modify/write queue for a storage key.
const pendingWrites = new Map<string, Promise<void>>();

export class ContextMetadataStore {
	private readonly storage: ContextMetadataStorage;

	constructor(storage: string | ContextMetadataStorage = defaultStorage()) {
		this.storage =
			typeof storage === "string"
				? new FileContextMetadataStorage(storage)
				: storage;
	}

	async read(): Promise<ContextMetadataFile> {
		return parseMetadata(await this.storage.load());
	}

	async add(id: string, name: string, now = new Date()): Promise<void> {
		await this.update((current) => {
			const at = now.toISOString();
			current.contexts[id] = { name, createdAt: at, updatedAt: at };
			current.selectedContextId ??= id;
		});
	}

	async addDraft(
		id: string,
		name: string,
		ownerSessionId: string,
		expiresAt: Date,
		now = new Date(),
	): Promise<void> {
		await this.update((current) => {
			const at = now.toISOString();
			current.contexts[id] = {
				name,
				createdAt: at,
				updatedAt: at,
				status: "draft",
				ownerSessionId,
				expiresAt: expiresAt.toISOString(),
			};
		});
	}

	async touchDraft(
		id: string,
		expiresAt: Date,
		now = new Date(),
	): Promise<void> {
		await this.update((current) => {
			const context = current.contexts[id];
			if (!context || context.status !== "draft") return false;
			context.updatedAt = now.toISOString();
			context.expiresAt = expiresAt.toISOString();
		});
	}

	async promote(id: string, name: string, now = new Date()): Promise<void> {
		await this.update((current) => {
			const context = current.contexts[id];
			if (!context) throw new Error("Unknown Context.");
			context.name = name;
			context.updatedAt = now.toISOString();
			context.status = "saved";
			delete context.ownerSessionId;
			delete context.expiresAt;
			current.selectedContextId = id;
		});
	}

	async remove(id: string): Promise<void> {
		await this.update((current) => {
			delete current.contexts[id];
			if (current.selectedContextId === id)
				current.selectedContextId = Object.keys(current.contexts)[0];
		});
	}

	async select(id: string): Promise<void> {
		await this.update((current) => {
			if (!current.contexts[id]) throw new Error("Unknown Context.");
			current.selectedContextId = id;
			current.contexts[id].updatedAt = new Date().toISOString();
		});
	}

	private async update(
		mutate: (value: ContextMetadataFile) => void | false,
	): Promise<void> {
		const key = this.storage.key;
		const operation = (pendingWrites.get(key) ?? Promise.resolve()).then(
			async () => {
				for (let attempt = 1; ; attempt++) {
					const stored = await this.storage.load();
					const current = parseMetadata(stored);
					if (mutate(current) === false) return;
					try {
						await this.storage.save(
							JSON.stringify(current, null, 2),
							stored?.version,
						);
						return;
					} catch (error) {
						if (
							!(error instanceof ContextMetadataConflictError) ||
							attempt >= MAX_UPDATE_ATTEMPTS
						)
							throw error;
					}
				}
			},
		);
		const tail = operation.catch(() => undefined);
		pendingWrites.set(key, tail);
		try {
			await operation;
		} finally {
			if (pendingWrites.get(key) === tail) pendingWrites.delete(key);
		}
	}
}

function parseMetadata(
	stored: StoredContextMetadata | undefined,
): ContextMetadataFile {
	if (!stored) return { contexts: {} };
	try {
		return metadataSchema.parse(JSON.parse(stored.contents));
	} catch (error) {
		throw new Error(
			"Browser context metadata is invalid; refusing to overwrite it.",
			{ cause: error },
		);
	}
}

/** One process owns the file, so the in-process queue alone keeps writes ordered. */
export class FileContextMetadataStorage implements ContextMetadataStorage {
	readonly key: string;

	constructor(filePath: string) {
		this.key = path.resolve(filePath);
	}

	async load(): Promise<StoredContextMetadata | undefined> {
		try {
			return { contents: await readFile(this.key, "utf8") };
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
			throw error;
		}
	}

	async save(contents: string): Promise<void> {
		await mkdir(path.dirname(this.key), { recursive: true });
		const temporary = `${this.key}.${process.pid}.${randomUUID()}.tmp`;
		try {
			await writeFile(temporary, contents, { mode: 0o600, flag: "wx" });
			await rename(temporary, this.key);
		} finally {
			await rm(temporary, { force: true });
		}
	}
}

export type ContextMetadataBlobClient = Pick<typeof blob, "get" | "put">;

export const CONTEXT_METADATA_BLOB_PATH = "benji/contexts.json";

/**
 * Shared by every function instance. Each write is conditional on the ETag that was
 * read, so a concurrent writer on another instance forces a reread instead of a lost update.
 */
export class BlobContextMetadataStorage implements ContextMetadataStorage {
	readonly key: string;

	constructor(
		private readonly client: ContextMetadataBlobClient = blob,
		private readonly pathname = CONTEXT_METADATA_BLOB_PATH,
	) {
		this.key = `vercel-blob:${pathname}`;
	}

	async load(): Promise<StoredContextMetadata | undefined> {
		const result = await this.client.get(this.pathname, {
			access: "private",
			useCache: false,
		});
		if (!result) return undefined;
		if (result.statusCode !== 200)
			throw new Error(
				`Vercel Blob returned ${result.statusCode} for browser context metadata.`,
			);
		return {
			contents: await new Response(result.stream).text(),
			version: result.blob.etag,
		};
	}

	async save(contents: string, version: string | undefined): Promise<void> {
		try {
			await this.client.put(this.pathname, contents, {
				access: "private",
				addRandomSuffix: false,
				allowOverwrite: version !== undefined,
				contentType: "application/json",
				ifMatch: version,
			});
		} catch (error) {
			if (error instanceof blob.BlobPreconditionFailedError)
				throw new ContextMetadataConflictError();
			// Without a version this was a create, and it fails if another instance created it first.
			if (version === undefined && (await this.load()))
				throw new ContextMetadataConflictError();
			throw error;
		}
	}
}

declare global {
	var __benjiContextMetadataStore: ContextMetadataStore | undefined;
}

export function getContextMetadataStore(): ContextMetadataStore {
	globalThis.__benjiContextMetadataStore ??= new ContextMetadataStore();
	return globalThis.__benjiContextMetadataStore;
}

function defaultStorage(): string | ContextMetadataStorage {
	if (process.env.BENJI_CONTEXT_METADATA_PATH)
		return process.env.BENJI_CONTEXT_METADATA_PATH;
	if (hasBlobStore()) return new BlobContextMetadataStorage();
	return path.join(writableRoot(), ".benji", "contexts.json");
}

function hasBlobStore(): boolean {
	return Boolean(
		process.env.BLOB_STORE_ID?.trim() ||
			process.env.BLOB_READ_WRITE_TOKEN?.trim(),
	);
}

// Vercel functions can only write under /tmp; the deployed code directory is read-only.
function writableRoot(): string {
	return process.env.VERCEL ? os.tmpdir() : process.cwd();
}
