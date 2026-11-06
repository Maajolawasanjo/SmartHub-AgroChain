import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const tokens = read("src/styles/brand-tokens.css");
const global = read("src/app/globals.css");
const layout = read("src/app/layout.tsx");

test("the approved five-color palette lives in exactly one semantic token foundation", () => {
  for (const [name, hex] of Object.entries({
    forest: "#174C35",
    gold: "#D5A649",
    sage: "#E7EFE6",
    ivory: "#F8F7F1",
    agricultural: "#398453",
  })) {
    assert.match(tokens, new RegExp("--brand-" + name + ":\\s*" + hex + ";", "i"), name);
  }
  assert.match(global, /@import "\.\.\/styles\/brand-tokens\.css"/);
  assert.match(tokens, /--color-brand:\s*var\(--brand-forest\)/);
  assert.match(tokens, /--color-ink:\s*var\(--text-primary\)/);
  assert.doesNotMatch(tokens, /--brand-(?:charcoal|black):/i);
});

test("Satoshi is loaded once at the root with approved weights and bound to all app controls", () => {
  assert.match(layout, /api\.fontshare\.com\/v2\/css\?f\[\]=satoshi@300,400,500,700,900&display=swap/);
  assert.match(tokens, /--font-satoshi:\s*"Satoshi"/);
  assert.match(tokens, /--font-sans:\s*var\(--font-satoshi\)/);
  assert.match(tokens, /:where\(html, body, button, input, textarea, select, optgroup\)/);
  assert.match(global, /font-family:var\(--font-satoshi\)/);
  assert.doesNotMatch(global, /font-family:\s*(?:Georgia|Arial|Helvetica)/i);
  assert.doesNotMatch(global, /Georgia|Times New Roman/i);
  for (const path of ["src/app/help/page.tsx","src/app/faq/page.tsx"]) {
    const source = read(path);
    assert.doesNotMatch(source, /Georgia|Times New Roman/i,path);
    assert.match(source, /var\(--font-satoshi\)/,path);
  }
});

test("primary legacy brand hex codes are removed from global legacy styles", () => {
  assert.doesNotMatch(global, /#(?:123d2b|0b2c20|e8b34f|f5f7f5|1c2822)(?![0-9a-f])/i);
  assert.match(global, /\.action-primary\s*\{[^}]*var\(--brand-forest\)/);
  assert.match(global, /\.agro-sidebar\s*\{[^}]*var\(--brand-forest\)/);
  assert.match(global, /\.auth-submit\s*\{[^}]*var\(--brand-forest\)/);
  assert.match(global, /var\(--focus-accent\)/);
});

test("brand tokens preserve accessible typography and reduced-motion behavior", () => {
  for (const value of ["--type-display", "--type-section", "--type-page", "--type-body", "--radius-card", "--border-subtle"]) {
    assert.ok(tokens.includes(value),value);
  }
  assert.match(global, /prefers-reduced-motion:\s*reduce/);
});
