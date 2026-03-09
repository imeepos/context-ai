export interface SystemChaosRunRequest {
	scenario: "policy_denied" | "scheduler_failure" | "alert_storm" | "scheduler_replay";
}

export interface SystemChaosRunResponse {
	scenario: SystemChaosRunRequest["scenario"];
	passed: boolean;
	details: Record<string, unknown>;
}

export interface SystemChaosBaselineCaptureRequest {
	name: string;
}

export interface SystemChaosBaselineCaptureResponse {
	name: string;
	baseline: {
		capturedAt: string;
		total: number;
		failure: number;
		errorRate: number;
	};
}

export interface SystemChaosBaselineVerifyRequest {
	name: string;
	maxErrorRateDelta?: number;
	maxFailureDelta?: number;
}

export interface SystemChaosBaselineVerifyResponse {
	name: string;
	passed: boolean;
	reason?: string;
	current: {
		total: number;
		failure: number;
		errorRate: number;
	};
	baseline?: {
		capturedAt: string;
		total: number;
		failure: number;
		errorRate: number;
	};
}
