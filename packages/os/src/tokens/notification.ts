import type {
    MuteTopicRequest,
    NotificationAckAllRequest,
    NotificationAckRequest,
    NotificationChannelsConfig,
    NotificationCleanupRequest,
    NotificationListRequest,
    NotificationMuteRecord,
    NotificationPolicyPatch,
    NotificationRecord,
    NotificationStats,
    NotifyRequest,
} from "../notification-service/index.js";
import { token } from "./shared.js";

// Notification Service Response Types
export interface NotificationSendResponse {
    sent: boolean;
}

export interface NotificationListResponse {
    notifications: NotificationRecord[];
}

export interface NotificationMuteResponse {
    muted: true;
}

export interface NotificationUnmuteRequest {
    topic: string;
}

export interface NotificationUnmuteResponse {
    unmuted: boolean;
}

export interface NotificationMuteListResponse {
    mutes: NotificationMuteRecord[];
}

export interface NotificationStatsResponse {
    stats: NotificationStats;
}

export interface NotificationAckResponse {
    acknowledged: number;
}

export interface NotificationCleanupResponse {
    notifications: number;
    mutes: number;
}

export interface NotificationPolicyResponse {
    policy: {
        dedupeWindowMs: number;
        rateLimit?: {
            limit: number;
            windowMs: number;
        };
        retentionLimit?: number;
    };
}

export interface NotificationChannelConfigureResponse {
    configured: string[];
}

export interface NotificationChannelStatsResponse {
    channels: Record<
        string,
        {
            success: number;
            failure: number;
            retried: number;
        }
    >;
}

// Notification Tokens
export const NOTIFICATION_SEND = token<NotifyRequest, NotificationSendResponse, "notification.send">("notification.send");

export const NOTIFICATION_LIST = token<NotificationListRequest, NotificationListResponse, "notification.list">("notification.list");

export const NOTIFICATION_MUTE = token<MuteTopicRequest, NotificationMuteResponse, "notification.mute">("notification.mute");

export const NOTIFICATION_UNMUTE = token<NotificationUnmuteRequest, NotificationUnmuteResponse, "notification.unmute">(
    "notification.unmute",
);

export const NOTIFICATION_MUTE_LIST = token<Record<string, never>, NotificationMuteListResponse, "notification.mute.list">(
    "notification.mute.list",
);

export const NOTIFICATION_STATS = token<Record<string, never>, NotificationStatsResponse, "notification.stats">(
    "notification.stats",
);

export const NOTIFICATION_ACK = token<NotificationAckRequest, NotificationAckResponse, "notification.ack">("notification.ack");

export const NOTIFICATION_ACK_ALL = token<NotificationAckAllRequest, NotificationAckResponse, "notification.ackAll">(
    "notification.ackAll",
);

export const NOTIFICATION_CLEANUP = token<NotificationCleanupRequest, NotificationCleanupResponse, "notification.cleanup">(
    "notification.cleanup",
);

export const NOTIFICATION_POLICY_UPDATE = token<NotificationPolicyPatch, NotificationPolicyResponse, "notification.policy.update">(
    "notification.policy.update",
);

export const NOTIFICATION_CHANNEL_CONFIGURE = token<NotificationChannelsConfig, NotificationChannelConfigureResponse, "notification.channel.configure">(
    "notification.channel.configure",
);

export const NOTIFICATION_CHANNEL_STATS = token<Record<string, never>, NotificationChannelStatsResponse, "notification.channel.stats">(
    "notification.channel.stats",
);
