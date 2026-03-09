// Core types
export type {
	NotificationSeverity,
	NotifyRequest,
	NotificationListRequest,
	NotificationServiceOptions,
	NotificationPolicyPatch,
	NotificationRecord,
	MuteTopicRequest,
	NotificationClearRequest,
	NotificationMuteRecord,
	NotificationAckRequest,
	NotificationAckAllRequest,
	NotificationCleanupRequest,
	NotificationStats,
	NotificationChannelAdapter,
	NotificationChannelsConfig,
	NotificationPolicy,
	ChannelStats,
} from "./types.js";

// Core service
export { NotificationService } from "./notification.service.js";

// Managers (for advanced use)
export { MuteManager } from "./mutes.js";
export { PolicyManager } from "./policy.js";
export { ChannelManager } from "./channels.js";

// Service factories
export {
	// Send
	NotificationSendOSService,
	createNotificationSendService,
	// List
	NotificationListOSService,
	createNotificationListService,
	// Ack
	NotificationAckOSService,
	createNotificationAckService,
	NotificationAckAllOSService,
	createNotificationAckAllService,
	// Mute
	NotificationMuteOSService,
	createNotificationMuteService,
	NotificationUnmuteOSService,
	createNotificationUnmuteService,
	NotificationMuteListOSService,
	createNotificationMuteListService,
	// Cleanup
	NotificationCleanupOSService,
	createNotificationCleanupService,
	// Stats
	NotificationStatsOSService,
	createNotificationStatsService,
	NotificationChannelStatsOSService,
	createNotificationChannelStatsService,
	// Policy
	NotificationPolicyUpdateOSService,
	createNotificationPolicyUpdateService,
	// Channel
	NotificationChannelConfigureOSService,
	createNotificationChannelConfigureService,
} from "./services/index.js";
