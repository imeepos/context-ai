import {
	NotificationAckAllOSService,
	NotificationAckOSService,
	NotificationChannelConfigureOSService,
	NotificationChannelStatsOSService,
	NotificationCleanupOSService,
	NotificationListOSService,
	NotificationMuteListOSService,
	NotificationMuteOSService,
	NotificationPolicyUpdateOSService,
	NotificationSendOSService,
	NotificationStatsOSService,
	NotificationUnmuteOSService,
} from "../../notification-service/index.js";
import {
	NOTIFICATION_ACK,
	NOTIFICATION_ACK_ALL,
	NOTIFICATION_CHANNEL_CONFIGURE,
	NOTIFICATION_CHANNEL_STATS,
	NOTIFICATION_CLEANUP,
	NOTIFICATION_LIST,
	NOTIFICATION_MUTE,
	NOTIFICATION_MUTE_LIST,
	NOTIFICATION_POLICY_UPDATE,
	NOTIFICATION_SEND,
	NOTIFICATION_STATS,
	NOTIFICATION_UNMUTE,
} from "../../tokens.js";
import { OS_NOTIFICATION } from "../tokens.js";
import { defineInjectableOSService } from "./definition.js";

export const PLATFORM_NOTIFICATION_SERVICE_DEFINITIONS = [
	defineInjectableOSService(NOTIFICATION_SEND, NotificationSendOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(NOTIFICATION_ACK, NotificationAckOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(NOTIFICATION_ACK_ALL, NotificationAckAllOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(NOTIFICATION_CLEANUP, NotificationCleanupOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(
		NOTIFICATION_POLICY_UPDATE,
		NotificationPolicyUpdateOSService,
		[OS_NOTIFICATION] as const,
	),
	defineInjectableOSService(
		NOTIFICATION_CHANNEL_CONFIGURE,
		NotificationChannelConfigureOSService,
		[OS_NOTIFICATION] as const,
	),
	defineInjectableOSService(
		NOTIFICATION_CHANNEL_STATS,
		NotificationChannelStatsOSService,
		[OS_NOTIFICATION] as const,
	),
	defineInjectableOSService(NOTIFICATION_LIST, NotificationListOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(NOTIFICATION_MUTE, NotificationMuteOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(NOTIFICATION_MUTE_LIST, NotificationMuteListOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(NOTIFICATION_UNMUTE, NotificationUnmuteOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(NOTIFICATION_STATS, NotificationStatsOSService, [OS_NOTIFICATION] as const),
] as const;
