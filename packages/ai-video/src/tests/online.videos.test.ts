import OpenAI from "openai";
import { describe, expect, it } from "vitest";

const baseURL = "https://ai.bowong.cc";
const token = "ur7T7a9dqcQVVAdX-4AtjOjog6FFLvWAJr1a-WL3";
const model = "google-vertex-ai/veo-3.1-fast-generate-001";

const client = new OpenAI({
	apiKey: token,
	baseURL,
});

describe("online OpenAI SDK compatibility - videos.create", () => {
	it(
		"should call /videos with google-vertex-ai/veo-3.1-fast-generate-001",
		{ timeout: 180_000 },
		async () => {
			const response = await client.videos.create({
				model,
				prompt: "A short cinematic shot of ocean waves at sunrise.",
				seconds: "4",
				size: "1280x720",
			});
			console.log(response);
			expect(typeof response.id).toBe("string");
			expect(response.object).toBe("video");
			expect(typeof response.model).toBe("string");
			expect(response.model ?? "").toContain("veo-3.1-fast-generate-001");
			expect(typeof response.status).toBe("string");
			expect(["queued", "in_progress", "completed", "failed"]).toContain(response.status);
		}
	);
	it(
		"should retrieve video job by id via OpenAI SDK videos.retrieve",
		{ timeout: 180_000 },
		async () => {
			const created = await client.videos.create({
				model,
				prompt: "A short cinematic shot of ocean waves at sunrise.",
				seconds: "4",
				size: "1280x720",
			});
			console.log(created);
			expect(typeof created.id).toBe("string");
			// const created = {
			//     id : "veo-3.1-fast-generate-001/operations/a96f2f05-e542-4223-82fe-2816d8f86a3c"
			// }
			const retrieved = await client.videos.retrieve(created.id);
			console.log(retrieved);
			expect(retrieved.id).toBe(created.id);
			expect(retrieved.object).toBe("video");
			expect(typeof retrieved.status).toBe("string");
			expect(["queued", "in_progress", "completed", "failed"]).toContain(retrieved.status);
		}
	);
	it(
		"should support video generation with multiple reference images via extra_body.reference_images",
		{ timeout: 180_000 },
		async () => {
			const response = await client.videos.create({
				model,
				prompt: "A short cinematic travel clip with the same style as the reference photos.",
				seconds: "4",
				size: "1280x720",
				// @ts-expect-error provider extension
				extra_body: {
					reference_images: [
						"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fronalpstock_big.jpg/640px-Fronalpstock_big.jpg",
						"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Example.jpg/640px-Example.jpg"
					]
				}
			});
			expect(typeof response.id).toBe("string");
			expect(response.object).toBe("video");
			expect(typeof response.status).toBe("string");
			expect(["queued", "in_progress", "completed", "failed"]).toContain(response.status);
		}
	);
});
