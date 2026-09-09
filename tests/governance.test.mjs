import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readProjectFile = (path) => readFile(new URL(path, root), "utf8");

const requiredSections = [
  "一、文档说明",
  "二、总览",
  "三、本期重点摘要",
  "四、行业动态",
  "五、产品动态",
  "六、技术革新",
  "七、竞品与标杆公司动态",
  "八、公司内部进展",
];

test("the Markdown source keeps the required report contract", async () => {
  const markdown = await readProjectFile("content/行业动态追踪.md");

  for (const heading of requiredSections) {
    const matches = markdown.match(new RegExp(`^${heading}$`, "gm")) ?? [];
    assert.equal(matches.length, 1, `${heading} must appear exactly once`);
  }

  assert.match(
    markdown,
    /^\| 事件 \| 类型 \| 关键词 \| 一句话影响判断 \| 来源 \| 发布时间 \| 详细分析 \|$/m,
  );

  assert.doesNotMatch(markdown, /暂时无法在i讯飞文档外展示此内容|\[if !supportLists\]|\[endif\]|mso-/i);
  assert.match(markdown, /^#### .+ \{#[a-z0-9][a-z0-9-]*\}$/m);
  assert.match(
    markdown,
    /^情报维度：终端=.+；能力=.+；(?:竞对=.+；)?归因=(?:能力问题|体验问题|资源\/商务问题|交付问题)(?:、(?:能力问题|体验问题|资源\/商务问题|交付问题))*；层级=L[123]-(?:生存层|竞争层|未来层)$/m,
  );
  assert.match(markdown, /L1-生存层/);
  assert.match(markdown, /L2-竞争层/);
  assert.match(markdown, /L3-未来层/);
  assert.match(markdown, /能力问题[\s\S]*体验问题[\s\S]*资源\/商务问题[\s\S]*交付问题/);

  const periodHeadings = markdown.match(/^## \d{4}-\d{2}-\d{2}—\d{4}-\d{2}-\d{2}$/gm) ?? [];
  assert.ok(periodHeadings.length >= 1, "at least one normalized period heading is required");
  assert.match(markdown, /^八、公司内部进展[\s\S]*待内部确认/m);
  assert.match(markdown, /^八、公司内部进展[\s\S]*^\*\*能力总览\*\*$/m);
  assert.match(markdown, /^八、公司内部进展[\s\S]*^### 语音合成（TTS）$/m);
  assert.match(markdown, /^八、公司内部进展[\s\S]*^#### 超拟人合成$/m);
});

test("generated and build outputs remain governed artifacts", async () => {
  const [generated, gitignore] = await Promise.all([
    readProjectFile("app/content.generated.ts"),
    readProjectFile(".gitignore"),
  ]);

  assert.match(generated, /^\/\/ AUTO-GENERATED .* DO NOT EDIT MANUALLY\./);
  assert.match(gitignore, /^\/dist\/$/m);

  const trackedDist = execFileSync("git", ["ls-files", "dist"], {
    cwd: new URL(".", root),
    encoding: "utf8",
  }).trim();
  assert.equal(trackedDist, "", "dist must not be tracked by Git");
});

test("governance documents describe the same source-of-truth boundary", async () => {
  const [agents, architecture, schema, contributing] = await Promise.all([
    readProjectFile("AGENTS.md"),
    readProjectFile("docs/ARCHITECTURE.md"),
    readProjectFile("docs/CONTENT_SCHEMA.md"),
    readProjectFile("CONTRIBUTING.md"),
  ]);

  for (const document of [agents, architecture, contributing]) {
    assert.match(document, /content\/行业动态追踪\.md/);
    assert.match(document, /content\.generated\.ts/);
    assert.match(document, /dist\//);
  }

  assert.match(schema, /固定一级章节/);
  assert.match(schema, /YYYY-MM-DD/);
  assert.match(schema, /待内部确认/);
  assert.match(schema, /情报维度/);
  assert.match(schema, /L1-生存层/);
  assert.match(schema, /资源\/商务问题/);
});
