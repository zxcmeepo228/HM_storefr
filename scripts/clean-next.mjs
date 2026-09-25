import { rm } from "node:fs/promises";
import { resolve } from "node:path";

// Use only while the previous dev server is stopped. This prevents Next dev
// from reusing artifacts produced by `next build` during local testing.
await rm(resolve(".next"), { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
