export interface SystemAppInstallReportRequest {
	appId: string;
}

export interface SystemAppInstallReportResponse {
	appId: string;
	version: string;
	addedPages: string[];
	addedPolicies: string[];
	addedObservability: string[];
	rollbackToken: string;
	lastAction: "install" | "rollback";
	updatedAt: string;
}

export interface SystemAppDeltaRequest {
	appId?: string;
}

export interface SystemAppDeltaResponse {
	apps: Array<{
		appId: string;
		version: string;
		pages: string[];
		policies: string[];
		observability: string[];
	}>;
}

export interface SystemAppRollbackStatsRequest {
	appId?: string;
	soonToExpireWindowMs?: number;
}

export interface SystemAppRollbackStatsResponse {
	totalSnapshots: number;
	expiredSnapshots: number;
	activeSnapshots: number;
	soonToExpireSnapshots: number;
	oldestCreatedAt?: string;
	newestCreatedAt?: string;
	byApp: Array<{
		appId: string;
		total: number;
		expired: number;
		active: number;
		soonToExpire: number;
		oldestCreatedAt?: string;
		newestCreatedAt?: string;
		recentCreatedAt?: string;
	}>;
}
