import OpenAI from "openai";
import {describe, expect, it} from "vitest";

const baseURL = "https://ai.bowong.cc";
const token = "ur7T7a9dqcQVVAdX-4AtjOjog6FFLvWAJr1a-WL3";

const client = new OpenAI({
    apiKey: token,
    baseURL,
});

describe("online OpenAI SDK compatibility - responses", () => {
    it(
        "should call /responses with google-vertex-ai/gemini-3.1-pro-preview",
        {timeout: 120_000},
        async () => {
            const response = await client.responses.create({
                model: "google-vertex-ai/gemini-3.1-pro-preview",
                input: "Reply with exactly: online-responses-ok",
                instructions: "You are a strict test assistant. Return plain text only.",
                max_output_tokens: 64,
                stream: false,
            });

            expect(typeof response.id).toBe("string");
            expect(response.object).toBe("response");
            expect(typeof response.model).toBe("string");
            expect(response.model ?? "").toContain("gemini-3.1-pro-preview");
            expect(typeof response.output_text).toBe("string");
            expect((response.output_text ?? "").length).toBeGreaterThan(0);
        }
    );
    it(
        "文本模型输入参考图作为input测试",
        {timeout: 120_000},
        async () => {
            const response = await client.responses.create({
                model: "google-vertex-ai/gemini-3.1-pro-preview",
                input: [
                    {
                        type: "message",
                        role: "user",
                        content: [
                            {type: "input_text", text: "请识别这张图里最明显的主体，只回答一个短语。"},
                            {
                                type: "input_image",
                                detail: 'high',
                                image_url: "https://cdn.roasmax.cn/material/779573dacff54f7393af426fbaa231e0.png",
                            },
                        ],
                    },
                ],
                max_output_tokens: 512,
                stream: false,
            });
            console.log(response);
            expect(typeof response.id).toBe("string");
            expect(response.object).toBe("response");
            expect(typeof response.model).toBe("string");
            expect(response.model ?? "").toContain("gemini-3.1-pro-preview");
            expect(typeof response.output_text).toBe("string");
            expect((response.output_text ?? "").length).toBeGreaterThan(0);
        }
    );
});
