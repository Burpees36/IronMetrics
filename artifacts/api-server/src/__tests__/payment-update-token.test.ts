import { describe, it, expect } from "vitest";
import { PaymentUpdateTokenService } from "../services/payment-update-token";

describe("PaymentUpdateTokenService", () => {
  const service = new PaymentUpdateTokenService();

  describe("generateToken", () => {
    it("generates a 64-character hex string (32 bytes)", () => {
      const token = service.generateToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it("generates unique tokens", () => {
      const tokens = new Set(Array.from({ length: 100 }, () => service.generateToken()));
      expect(tokens.size).toBe(100);
    });

    it("uses cryptographic randomness (entropy check)", () => {
      const token = service.generateToken();
      const bytes = Buffer.from(token, "hex");
      expect(bytes.length).toBe(32);

      const uniqueBytes = new Set(Array.from(bytes));
      expect(uniqueBytes.size).toBeGreaterThan(10);
    });
  });

  describe("validateToken", () => {
    it("rejects empty token", async () => {
      const result = await service.validateToken("");
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("invalid");
    });

    it("rejects token shorter than 32 chars", async () => {
      const result = await service.validateToken("abc123");
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("invalid");
    });

    it("rejects non-string token", async () => {
      const result = await service.validateToken(null as any);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("invalid");
    });

    it("rejects non-existent token from DB", async () => {
      const fakeToken = "a".repeat(64);
      const result = await service.validateToken(fakeToken);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("invalid");
      expect(result.error).toContain("contact your gym");
    });
  });
});
