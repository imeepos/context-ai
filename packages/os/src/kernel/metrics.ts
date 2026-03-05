interface ServiceMetricsSnapshot {
	service: string;
	total: number;
	success: number;
	failure: number;
	p95DurationMs: number;
	successRate: number;
	errorRate: number;
}

interface MetricEntry {
	durationMs: number;
	success: boolean;
}

export class KernelMetrics {
	private readonly entriesByService = new Map<string, MetricEntry[]>();

	record(service: string, durationMs: number, success: boolean): void {
		const existing = this.entriesByService.get(service) ?? [];
		existing.push({ durationMs, success });
		this.entriesByService.set(service, existing);
	}

	snapshot(service: string): ServiceMetricsSnapshot {
		const entries = this.entriesByService.get(service) ?? [];
		const total = entries.length;
		const success = entries.filter((entry) => entry.success).length;
		const failure = total - success;
		const durations = entries.map((entry) => entry.durationMs).sort((a, b) => a - b);
		const p95Index = durations.length === 0 ? 0 : Math.max(0, Math.ceil(durations.length * 0.95) - 1);
		const p95DurationMs = durations.length === 0 ? 0 : durations[p95Index] ?? 0;
		return {
			service,
			total,
			success,
			failure,
			p95DurationMs,
			successRate: total === 0 ? 1 : success / total,
			errorRate: total === 0 ? 0 : failure / total,
		};
	}

	allSnapshots(): ServiceMetricsSnapshot[] {
		return [...this.entriesByService.keys()].map((service) => this.snapshot(service));
	}
}

export type { ServiceMetricsSnapshot };
