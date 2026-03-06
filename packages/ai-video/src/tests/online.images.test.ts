import OpenAI from "openai";
import { describe, expect, it } from "vitest";

const baseURL = "https://ai.bowong.cc";
const token = "ur7T7a9dqcQVVAdX-4AtjOjog6FFLvWAJr1a-WL3";

const client = new OpenAI({
	apiKey: token,
	baseURL,
});

describe("online OpenAI SDK compatibility - images.generate", () => {
	it(
		"should call /images/generations with google-vertex-ai/gemini-3.1-flash-image-preview",
		{ timeout: 180_000 },
		async () => {
			const response = await client.images.generate({
				model: "google-vertex-ai/gemini-3.1-flash-image-preview",
				prompt: "A minimal flat icon of a red apple on white background.",
				n: 1,
				response_format: "url",
				// @ts-expect-error
				extra_body: {
					image_config: {
						output_mime_type: "image/png",
						aspect_ratio: "9:16",
						image_size: "2K",
					}
				}
			});

			expect(typeof response.created).toBe("number");
			expect(Array.isArray(response.data)).toBe(true);
			expect((response.data ?? []).length).toBeGreaterThan(0);

			const first = response.data?.[0];
			const hasImage = typeof first?.b64_json === "string" || typeof first?.url === "string";
			expect(hasImage).toBe(true);
		}
	);

	it(
		"should support extra_body.reference_images with multiple web URLs",
		{ timeout: 180_000 },
		async () => {
			const response = await client.images.generate({
				model: "google-vertex-ai/gemini-3.1-flash-image-preview",
				prompt: "Create a minimalist poster inspired by both reference images.",
				n: 1,
				response_format: "url",
				// @ts-expect-error extra_body is provider extension.
				extra_body: {
					reference_images: [
						"https://cdn.bowong.cc/material/779573dacff54f7393af426fbaa231e0.png",
						"https://cdn.roasmax.cn/material/1866795a2fcf4afe8c6fc745219b291f.png"
					],
					image_config: {
						output_mime_type: "image/png",
						aspect_ratio: "9:16",
						image_size: "2K",
					}
				}
			});
			console.log(response);
			expect(typeof response.created).toBe("number");
			expect(Array.isArray(response.data)).toBe(true);
			expect((response.data ?? []).length).toBeGreaterThan(0);

			const first = response.data?.[0];
			const hasImage = typeof first?.b64_json === "string" || typeof first?.url === "string";
			expect(hasImage).toBe(true);
		}
	);
});
