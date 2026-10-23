import type { Static } from "@sinclair/typebox";
import { Type } from "@sinclair/typebox";
import { NonEmptyString } from "./schema/primitives.js";

/**
 * AntarBridge rides the existing Gateway WebSocket (PROTOCOL_VERSION).
 * Handshake and per-message keypairs are documented in
 * docs/adr/ADR-010-antarbridge-gateway-protocol.md.
 *
 * These types are additive protocol surface only. Runtime handlers land with
 * the AntarBridge plugin; core must not special-case a messenger channel id.
 */

export const ANTARBRIDGE_GATEWAY_METHODS = [
  "antarbridge.send",
  "antarbridge.receive",
  "antarbridge.status",
  "antarbridge.disconnect",
] as const;

export type AntarBridgeGatewayMethod = (typeof ANTARBRIDGE_GATEWAY_METHODS)[number];

export const AntarBridgeOnionAddressSchema = Type.String({
  minLength: 1,
  description: "v3 onion address without http scheme",
});

export const AntarBridgeEncryptedPayloadSchema = Type.String({
  minLength: 1,
  description: "Base64url ciphertext sealed to the recipient per-message key",
});

export const AntarBridgeEnvelopeSchema = Type.Object(
  {
    id: NonEmptyString,
    from_onion: AntarBridgeOnionAddressSchema,
    to_onion: AntarBridgeOnionAddressSchema,
    payload_encrypted: AntarBridgeEncryptedPayloadSchema,
    timestamp: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export type AntarBridgeEnvelope = Static<typeof AntarBridgeEnvelopeSchema>;

export const AntarBridgeHandshakeHelloParamsSchema = Type.Object(
  {
    identityPublicKey: NonEmptyString,
    ephemeralPublicKey: NonEmptyString,
    nonce: NonEmptyString,
    signature: NonEmptyString,
    onion: AntarBridgeOnionAddressSchema,
    protocol: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

export type AntarBridgeHandshakeHelloParams = Static<typeof AntarBridgeHandshakeHelloParamsSchema>;

export const AntarBridgeHandshakeHelloResultSchema = Type.Object(
  {
    sessionId: NonEmptyString,
    serverEphemeralPublicKey: NonEmptyString,
    nonce: NonEmptyString,
    signature: NonEmptyString,
    expiresAt: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export type AntarBridgeHandshakeHelloResult = Static<typeof AntarBridgeHandshakeHelloResultSchema>;

export const AntarBridgeSendParamsSchema = Type.Object(
  {
    envelope: AntarBridgeEnvelopeSchema,
  },
  { additionalProperties: false },
);

export type AntarBridgeSendParams = Static<typeof AntarBridgeSendParamsSchema>;

export const AntarBridgeSendResultSchema = Type.Object(
  {
    accepted: Type.Boolean(),
    id: NonEmptyString,
  },
  { additionalProperties: false },
);

export type AntarBridgeSendResult = Static<typeof AntarBridgeSendResultSchema>;

export const AntarBridgeReceiveParamsSchema = Type.Object(
  {
    sinceTimestamp: Type.Optional(Type.Integer({ minimum: 0 })),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  },
  { additionalProperties: false },
);

export type AntarBridgeReceiveParams = Static<typeof AntarBridgeReceiveParamsSchema>;

export const AntarBridgeReceiveResultSchema = Type.Object(
  {
    envelopes: Type.Array(AntarBridgeEnvelopeSchema),
  },
  { additionalProperties: false },
);

export type AntarBridgeReceiveResult = Static<typeof AntarBridgeReceiveResultSchema>;

export const AntarBridgeStatusParamsSchema = Type.Object({}, { additionalProperties: false });

export type AntarBridgeStatusParams = Static<typeof AntarBridgeStatusParamsSchema>;

export const AntarBridgeStatusResultSchema = Type.Object(
  {
    connected: Type.Boolean(),
    onion: Type.Optional(AntarBridgeOnionAddressSchema),
    sessionId: Type.Optional(NonEmptyString),
    lastTimestamp: Type.Optional(Type.Integer({ minimum: 0 })),
  },
  { additionalProperties: false },
);

export type AntarBridgeStatusResult = Static<typeof AntarBridgeStatusResultSchema>;

export const AntarBridgeDisconnectParamsSchema = Type.Object(
  {
    reason: Type.Optional(NonEmptyString),
  },
  { additionalProperties: false },
);

export type AntarBridgeDisconnectParams = Static<typeof AntarBridgeDisconnectParamsSchema>;

export const AntarBridgeDisconnectResultSchema = Type.Object(
  {
    disconnected: Type.Literal(true),
  },
  { additionalProperties: false },
);

export type AntarBridgeDisconnectResult = Static<typeof AntarBridgeDisconnectResultSchema>;

/**
 * Inner plaintext before per-message seal. Cron/scheduler failure alerts use
 * `type: "status"` with an error payload; the wire envelope still carries only
 * `payload_encrypted`.
 */
export const AntarBridgeStatusErrorSchema = Type.Object(
  {
    code: NonEmptyString,
    message: NonEmptyString,
    scraper: Type.Optional(NonEmptyString),
  },
  { additionalProperties: false },
);

export type AntarBridgeStatusError = Static<typeof AntarBridgeStatusErrorSchema>;

export const AntarBridgeStatusMessageSchema = Type.Object(
  {
    type: Type.Literal("status"),
    text: Type.Optional(Type.String()),
    error: Type.Optional(AntarBridgeStatusErrorSchema),
  },
  { additionalProperties: false },
);

export type AntarBridgeStatusMessage = Static<typeof AntarBridgeStatusMessageSchema>;

export function encodeAntarBridgeStatusPayload(message: AntarBridgeStatusMessage): string {
  const json = JSON.stringify(message);
  return Buffer.from(json, "utf8").toString("base64url");
}
