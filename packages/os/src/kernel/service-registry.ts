import type { OSService } from "../types/os.js";
import { OSError } from "./errors.js";

export class ServiceRegistry {
	private readonly services = new Map<string, OSService<unknown, unknown>>();
	private readonly dependencies = new Map<string, string[]>();

	private assertNoCycles(): void {
		const visiting = new Set<string>();
		const visited = new Set<string>();

		const dfs = (node: string): void => {
			if (visiting.has(node)) {
				throw new OSError("E_DEPENDENCY_ERROR", `Service dependency cycle detected at: ${node}`);
			}
			if (visited.has(node)) return;
			visiting.add(node);
			for (const dep of this.dependencies.get(node) ?? []) {
				dfs(dep);
			}
			visiting.delete(node);
			visited.add(node);
		};

		for (const node of this.dependencies.keys()) {
			dfs(node);
		}
	}

	register<Request, Response>(service: OSService<Request, Response>): void {
		if (this.services.has(service.name)) {
			throw new OSError("E_DEPENDENCY_ERROR", `Service already registered: ${service.name}`);
		}
		const deps = service.dependencies ?? [];
		for (const dep of deps) {
			if (!this.services.has(dep)) {
				throw new OSError("E_DEPENDENCY_ERROR", `Service dependency missing: ${service.name} -> ${dep}`);
			}
		}
		this.services.set(service.name, service as OSService<unknown, unknown>);
		this.dependencies.set(service.name, [...deps]);
		this.assertNoCycles();
	}

	registerMany(services: OSService<unknown, unknown>[]): void {
		const pending = new Map<string, OSService<unknown, unknown>>();
		for (const service of services) {
			if (this.services.has(service.name) || pending.has(service.name)) {
				throw new OSError("E_DEPENDENCY_ERROR", `Service already registered: ${service.name}`);
			}
			pending.set(service.name, service);
		}

		while (pending.size > 0) {
			let progressed = false;
			for (const [name, service] of [...pending.entries()]) {
				const deps = service.dependencies ?? [];
				const depsSatisfied = deps.every((dep) => this.services.has(dep) || !pending.has(dep));
				const depsResolvable = deps.every((dep) => this.services.has(dep) || pending.has(dep));
				if (!depsResolvable) {
					const missing = deps.find((dep) => !this.services.has(dep) && !pending.has(dep));
					throw new OSError("E_DEPENDENCY_ERROR", `Service dependency missing: ${name} -> ${missing}`);
				}
				if (!depsSatisfied) {
					continue;
				}
				this.register(service);
				pending.delete(name);
				progressed = true;
			}
			if (!progressed) {
				throw new OSError("E_DEPENDENCY_ERROR", "Service dependency cycle detected in batch registration");
			}
		}
	}

	get<Request, Response>(name: string): OSService<Request, Response> {
		const service = this.services.get(name);
		if (!service) {
			throw new OSError("E_SERVICE_NOT_FOUND", `Service not found: ${name}`);
		}
		return service as OSService<Request, Response>;
	}

	list(): string[] {
		return [...this.services.keys()];
	}

	getDependencies(name: string): string[] {
		return [...(this.dependencies.get(name) ?? [])];
	}

	graph(): Record<string, string[]> {
		const graph: Record<string, string[]> = {};
		for (const name of this.list()) {
			graph[name] = this.getDependencies(name);
		}
		return graph;
	}

	bootOrder(): string[] {
		const indegree = new Map<string, number>();
		const reverseEdges = new Map<string, string[]>();
		for (const node of this.list()) {
			indegree.set(node, 0);
			reverseEdges.set(node, []);
		}
		for (const [node, deps] of this.dependencies.entries()) {
			for (const dep of deps) {
				indegree.set(node, (indegree.get(node) ?? 0) + 1);
				reverseEdges.set(dep, [...(reverseEdges.get(dep) ?? []), node]);
			}
		}
		const queue = [...indegree.entries()].filter(([, degree]) => degree === 0).map(([node]) => node);
		const order: string[] = [];
		while (queue.length > 0) {
			const node = queue.shift()!;
			order.push(node);
			for (const next of reverseEdges.get(node) ?? []) {
				const degree = (indegree.get(next) ?? 0) - 1;
				indegree.set(next, degree);
				if (degree === 0) queue.push(next);
			}
		}
		if (order.length !== this.list().length) {
			throw new OSError("E_DEPENDENCY_ERROR", "Service dependency cycle detected");
		}
		return order;
	}
}
