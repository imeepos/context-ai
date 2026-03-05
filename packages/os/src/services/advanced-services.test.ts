import { describe, expect, it } from "vitest";
import { HostAdapterRegistry } from "../host-adapter/index.js";
import { MediaService } from "../media-service/index.js";
import { ModelService } from "../model-service/index.js";
import { PackageService } from "../package-service/index.js";
import { SecurityService } from "../security-service/index.js";
import { UIService } from "../ui-service/index.js";

describe("ModelService", () => {
	it("invokes registered provider", async () => {
		const model = new ModelService();
		model.register({
			name: "echo",
			generate: async (req) => `ok:${req.prompt}`,
		});
		const output = await model.generate({ model: "echo", prompt: "hello" });
		expect(output.output).toBe("ok:hello");
	});
});

describe("PackageService", () => {
	it("installs and lists packages", () => {
		const service = new PackageService();
		service.install({ name: "demo", version: "1.0.0", source: "registry://demo" });
		expect(service.list()).toHaveLength(1);
	});

	it("validates package signature when enabled", () => {
		const security = new SecurityService();
		const secret = "pkg-secret";
		const payload = "demo@1.0.0:registry://demo";
		const signature = security.sign(payload, secret);
		const service = new PackageService({ security, signingSecret: secret });
		service.install({
			name: "demo",
			version: "1.0.0",
			source: "registry://demo",
			signature,
		});
		expect(service.list()).toHaveLength(1);
		expect(() =>
			service.install({
				name: "bad",
				version: "1.0.0",
				source: "registry://bad",
				signature: "deadbeef",
			}),
		).toThrow("Invalid package signature");
	});
});

describe("UIService", () => {
	it("returns structured render protocol", () => {
		const service = new UIService();
		const result = service.render({
			screen: "home",
			tree: {
				type: "column",
				children: [{ type: "text", text: "hello" }],
			},
		});
		expect(result.schemaVersion).toBe("1.0");
	});
});

describe("HostAdapterRegistry", () => {
	it("routes request to adapter", async () => {
		const registry = new HostAdapterRegistry();
		registry.register({
			name: "sensor",
			handle: async (action) => ({ action }),
		});
		const result = await registry.execute({ adapter: "sensor", action: "read" });
		expect(result).toEqual({ action: "read" });
	});
});

describe("MediaService", () => {
	it("inspects media mime kind", () => {
		const media = new MediaService();
		const result = media.inspect("photo.jpg");
		expect(result.kind).toBe("image");
	});
});
