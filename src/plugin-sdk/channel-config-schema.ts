/** Shared config-schema primitives for channel plugins with DM/group policy knobs. */
export {
  AllowFromListSchema,
  buildChannelConfigSchema,
  buildCatchallMultiAccountChannelSchema,
  buildNestedDmConfigSchema,
} from "../channels/plugins/config-schema.js";
export {
  BlockStreamingCoalesceSchema,
  ContextVisibilityModeSchema,
  DmConfigSchema,
  DmPolicySchema,
  GroupPolicySchema,
  MarkdownConfigSchema,
  ReplyRuntimeConfigSchemaShape,
  requireOpenAllowFrom,
} from "../config/zod-schema.core.js";
export { ToolPolicySchema } from "../config/zod-schema.agent-runtime.js";

/** @deprecated AntarBridge-Migration — entfernen wenn Plugin-SDK-Vertrag angepasst */
export { DiscordConfigSchema } from "../config/zod-schema.providers-core.js";
export {
  GoogleChatConfigSchema,
  MSTeamsConfigSchema,
  SignalConfigSchema,
} from "../config/zod-schema.providers-core.js";
/** @deprecated AntarBridge-Migration — entfernen wenn Plugin-SDK-Vertrag angepasst */
export { SlackConfigSchema } from "../config/zod-schema.providers-core.js";
/** @deprecated AntarBridge-Migration — entfernen wenn Plugin-SDK-Vertrag angepasst */
export { TelegramConfigSchema } from "../config/zod-schema.providers-core.js";

// WhatsAppConfigSchema / IMessageConfigSchema already removed from the public SDK.
// @deprecated AntarBridge-Migration — entfernen wenn Plugin-SDK-Vertrag angepasst
