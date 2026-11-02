import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const paths = ["", "product", "products", "how-it-works", "for-buyers", "for-farmers", "about", "contact", "login", "signup"];

test("every publicly linked route has an App Router page", () => {
  for (const path of paths) {
    assert.ok(existsSync(join(root, "src/app", path, "page.tsx")), `Missing page /${path}`);
  }
});

test("authentication placeholders do not collect passwords or claim auth works", () => {
  for (const path of ["login", "signup"]) {
    const text = readFileSync(join(root, "src/app", path, "page.tsx"), "utf8");
    assert.ok(!text.includes('type="password"'));
    assert.ok(/not active|being configured|being prepared/.test(text));
  }
});

test("no real secret keys or database hosts committed as examples", () => {
  const config = readFileSync(join(root, ".env.example"), "utf8");
  assert.ok(!/eyJhbGciOi|sb_secret_|service_role|postgresql:\/\//.test(config));
});

test("Prisma model deployment is gated pending approval", () => {
  const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
  assert.ok(!/^model\s+/m.test(schema), "Found unapproved live tables in schema");
});
