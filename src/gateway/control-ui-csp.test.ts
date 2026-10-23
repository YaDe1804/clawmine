import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildControlUiCspHeader,
  computeInlineScriptHashes,
  computeInlineStyleHashes,
} from "./control-ui-csp.js";

describe("buildControlUiCspHeader", () => {
  it("blocks inline scripts and inline styles by default", () => {
    const csp = buildControlUiCspHeader();
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).toContain("style-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com");
  });

  it("allows Google Fonts for style and font loading", () => {
    const csp = buildControlUiCspHeader();
    expect(csp).toContain("https://fonts.googleapis.com");
    expect(csp).toContain("font-src 'self' https://fonts.gstatic.com");
  });

  it("includes inline style hashes in style-src when provided", () => {
    const csp = buildControlUiCspHeader({
      inlineStyleHashes: ["sha256-xyz789"],
    });
    expect(csp).toContain("style-src 'self' 'sha256-xyz789' https://fonts.googleapis.com");
    expect(csp).not.toContain("'unsafe-inline'");
  });

  it("includes multiple inline style hashes", () => {
    const csp = buildControlUiCspHeader({
      inlineStyleHashes: ["sha256-sss", "sha256-ttt"],
    });
    expect(csp).toContain("style-src 'self' 'sha256-sss' 'sha256-ttt' https://fonts.googleapis.com");
  });

  it("includes inline script hashes in script-src when provided", () => {
    const csp = buildControlUiCspHeader({
      inlineScriptHashes: ["sha256-abc123"],
    });
    expect(csp).toContain("script-src 'self' 'sha256-abc123'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it("includes multiple inline script hashes", () => {
    const csp = buildControlUiCspHeader({
      inlineScriptHashes: ["sha256-aaa", "sha256-bbb"],
    });
    expect(csp).toContain("script-src 'self' 'sha256-aaa' 'sha256-bbb'");
  });

  it("falls back to plain script-src self when hashes array is empty", () => {
    const csp = buildControlUiCspHeader({ inlineScriptHashes: [] });
    expect(csp).toMatch(/script-src 'self'(?:;|$)/);
  });
});

describe("computeInlineScriptHashes", () => {
  it("returns empty for HTML without scripts", () => {
    expect(computeInlineScriptHashes("<html><body>hi</body></html>")).toEqual([]);
  });

  it("hashes inline script content", () => {
    const content = "alert(1)";
    const expected = createHash("sha256").update(content, "utf8").digest("base64");
    const hashes = computeInlineScriptHashes(`<html><script>${content}</script></html>`);
    expect(hashes).toEqual([`sha256-${expected}`]);
  });

  it("skips scripts with src attribute", () => {
    const hashes = computeInlineScriptHashes('<html><script src="/app.js"></script></html>');
    expect(hashes).toEqual([]);
  });

  it("does not treat data-src as an external script attribute", () => {
    const content = "console.log('inline')";
    const expected = createHash("sha256").update(content, "utf8").digest("base64");
    const hashes = computeInlineScriptHashes(
      `<html><script data-src="/app.js">${content}</script></html>`,
    );
    expect(hashes).toEqual([`sha256-${expected}`]);
  });

  it("hashes only inline scripts when mixed with external", () => {
    const inlineContent = "console.log('init')";
    const expected = createHash("sha256").update(inlineContent, "utf8").digest("base64");
    const html = [
      "<html><head>",
      `<script>${inlineContent}</script>`,
      '<script type="module" src="/app.js"></script>',
      "</head></html>",
    ].join("");
    const hashes = computeInlineScriptHashes(html);
    expect(hashes).toEqual([`sha256-${expected}`]);
  });

  it("handles multiline inline scripts", () => {
    const content = "\n  var x = 1;\n  console.log(x);\n";
    const expected = createHash("sha256").update(content, "utf8").digest("base64");
    const hashes = computeInlineScriptHashes(`<script>${content}</script>`);
    expect(hashes).toEqual([`sha256-${expected}`]);
  });

  it("skips empty inline scripts", () => {
    expect(computeInlineScriptHashes("<script></script>")).toEqual([]);
  });
});

describe("computeInlineStyleHashes", () => {
  it("returns empty for HTML without inline styles", () => {
    expect(computeInlineStyleHashes("<html><body>hi</body></html>")).toEqual([]);
  });

  it("hashes inline style content", () => {
    const content = "body { color: red; }";
    const expected = createHash("sha256").update(content, "utf8").digest("base64");
    const hashes = computeInlineStyleHashes(`<html><style>${content}</style></html>`);
    expect(hashes).toEqual([`sha256-${expected}`]);
  });

  it("hashes multiple inline styles", () => {
    const a = ".a { color: red; }";
    const b = ".b { color: blue; }";
    const expectedA = createHash("sha256").update(a, "utf8").digest("base64");
    const expectedB = createHash("sha256").update(b, "utf8").digest("base64");
    const html = `<html><style>${a}</style><style>${b}</style></html>`;
    expect(computeInlineStyleHashes(html)).toEqual([
      `sha256-${expectedA}`,
      `sha256-${expectedB}`,
    ]);
  });

  it("handles multiline inline styles", () => {
    const content = "\n  body {\n    color: red;\n  }\n";
    const expected = createHash("sha256").update(content, "utf8").digest("base64");
    const hashes = computeInlineStyleHashes(`<style>${content}</style>`);
    expect(hashes).toEqual([`sha256-${expected}`]);
  });

  it("skips empty inline styles", () => {
    expect(computeInlineStyleHashes("<style></style>")).toEqual([]);
  });
});
