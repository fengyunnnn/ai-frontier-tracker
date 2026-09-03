import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const generatedPath = new URL("../app/content.generated.ts", import.meta.url);

test("Markdown is transformed into the complete visual-site dataset", async () => {
  const generated = await readFile(generatedPath, "utf8");

  assert.match(generated, /语音交互与 AI 人机交互行业动态追踪/);
  assert.match(generated, /"sections":/);
  assert.match(generated, /"highlights":/);
  assert.match(generated, /实时语音交互升级/);
  assert.doesNotMatch(generated, /SkeletonPreview|codex-preview/);
});
