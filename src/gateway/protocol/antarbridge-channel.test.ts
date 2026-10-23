import { describe, expect, it } from "vitest";
import {
  ANTARBRIDGE_GATEWAY_METHODS,
  AntarBridgeDisconnectParamsSchema,
  AntarBridgeEnvelopeSchema,
  AntarBridgeHandshakeHelloParamsSchema,
  AntarBridgeReceiveParamsSchema,
  AntarBridgeSendParamsSchema,
  AntarBridgeStatusMessageSchema,
  AntarBridgeStatusParamsSchema,
  encodeAntarBridgeStatusPayload,
} from "./antarbridge-channel.js";

describe("AntarBridge gateway channel protocol", () => {
  it("exposes the four wire commands", () => {
    expect([...ANTARBRIDGE_GATEWAY_METHODS]).toEqual([
      "antarbridge.send",
      "antarbridge.receive",
      "antarbridge.status",
      "antarbridge.disconnect",
    ]);
  });

  it("accepts the documented envelope shape", () => {
    const envelope = {
      id: "msg-1",
      from_onion: "aliceonionaddress.onion",
      to_onion: "bobonionaddress.onion",
      payload_encrypted: "base64url-ciphertext",
      timestamp: 1_779_145_200_000,
    };
    expect(AntarBridgeEnvelopeSchema).toMatchObject({ type: "object" });
    expect(envelope.from_onion).toContain(".onion");
    expect(AntarBridgeSendParamsSchema.properties.envelope).toBe(AntarBridgeEnvelopeSchema);
  });

  it("keeps handshake and command params closed objects", () => {
    expect(AntarBridgeHandshakeHelloParamsSchema.additionalProperties).toBe(false);
    expect(AntarBridgeReceiveParamsSchema.additionalProperties).toBe(false);
    expect(AntarBridgeStatusParamsSchema.additionalProperties).toBe(false);
    expect(AntarBridgeDisconnectParamsSchema.additionalProperties).toBe(false);
  });

  it("encodes a StatusMessage error payload as base64url", () => {
    const message = {
      type: "status" as const,
      error: { code: "scraper-failed", message: "exit 1", scraper: "lotto649" },
    };
    expect(AntarBridgeStatusMessageSchema.additionalProperties).toBe(false);
    const encoded = encodeAntarBridgeStatusPayload(message);
    expect(JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"))).toEqual(message);
  });
});
