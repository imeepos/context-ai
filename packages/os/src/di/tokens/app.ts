import type { AppManifestV1 } from "../../app-manager/manifest.js";
import type { AppQuota } from "../../app-manager/quota.js";
import { defineToken } from "./shared.js";

export const CURRENT_APP_ID = defineToken<string>("os.current-app-id");
export const CURRENT_APP_MANIFEST = defineToken<AppManifestV1>("os.current-app-manifest");
export const CURRENT_APP_PERMISSIONS = defineToken<string[]>("os.current-app-permissions");
export const CURRENT_APP_QUOTA = defineToken<AppQuota | undefined>("os.current-app-quota");
