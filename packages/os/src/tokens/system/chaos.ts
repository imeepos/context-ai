import * as SystemService from "../../system-service/index.js";
import { token, type RequestOf, type ResponseOf } from "../shared.js";

// Chaos Engineering Tokens
export const SYSTEM_CHAOS_RUN = token<RequestOf<typeof SystemService.createSystemChaosRunService>, ResponseOf<typeof SystemService.createSystemChaosRunService>, "system.chaos.run">("system.chaos.run");
export const SYSTEM_CHAOS_BASELINE_CAPTURE = token<RequestOf<typeof SystemService.createSystemChaosBaselineCaptureService>, ResponseOf<typeof SystemService.createSystemChaosBaselineCaptureService>, "system.chaos.baseline.capture">("system.chaos.baseline.capture");
export const SYSTEM_CHAOS_BASELINE_VERIFY = token<RequestOf<typeof SystemService.createSystemChaosBaselineVerifyService>, ResponseOf<typeof SystemService.createSystemChaosBaselineVerifyService>, "system.chaos.baseline.verify">("system.chaos.baseline.verify");
