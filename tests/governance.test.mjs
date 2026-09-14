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

test("文档说明 covers scope and the dual-track definition", async () => {
  const markdown = await readProjectFile("content/行业动态追踪.md");

  // 一、文档说明 must declare a 内容覆盖 subsection.
  assert.match(markdown, /^## 内容覆盖$/m, "文档说明必须包含“内容覆盖”小节");

  // 内容覆盖 must carry the dual-track definition (previously buried under 更新方式)
  // and state the track/topic relationship, so the report is not read as
  // operator-acceptance-only.
  const docSection = markdown.split(/^二、总览$/m)[0];
  assert.match(docSection, /轨道 A｜交互体验与 AI 前沿战略雷达/);
  assert.match(docSection, /轨道 B｜业务落地与产业约束雷达/);
  assert.match(docSection, /不决定它属于哪个专题/);

  // The source title must stay aligned with the page title.
  assert.match(markdown, /语音交互与 AI 人机交互/);
});

test("the narrow-viewport nav wraps instead of clipping chapters", async () => {
  const css = await readProjectFile("app/globals.css");

  // Regression guard: the ≤860px nav once used `overflow-x: auto` on a single
  // line, which is 1114px wide inside a ~340px viewport — chapters 四—七 were
  // pushed out of view. It must now wrap into multiple rows instead.
  const narrowBlock = css.slice(css.indexOf("@media (max-width: 860px)"));
  const listStart = narrowBlock.indexOf(".primary-nav-list {");
  assert.ok(listStart > -1, "窄视口区块必须定义 .primary-nav-list");
  const navListBlock = narrowBlock.slice(listStart, narrowBlock.indexOf("}", listStart));
  assert.match(navListBlock, /flex-wrap: wrap/, "窄视口导航应换行，而不是横向滚动");
  assert.doesNotMatch(navListBlock, /overflow-x: auto/, "窄视口导航不应再使用横向滚动");
});

test("总览 covers capability, product, industry and internal layers", async () => {
  const markdown = await readProjectFile("content/行业动态追踪.md");

  // The overview must not read as operator-acceptance-only. It carries four
  // layer judgements, each pointing at the chapter holding the evidence.
  const overview = markdown.split(/^二、总览$/m)[1]?.split(/^三、本期重点摘要$/m)[0] ?? "";
  assert.ok(overview.length > 0, "总览 章节必须存在");

  const layers = ["【能力层】", "【产品层】", "【产业层】", "【我们自己】"];
  for (const layer of layers) {
    assert.match(overview, new RegExp(`^${layer}`, "m"), `总览必须包含“${layer}”层次`);
  }

  const chapterAnchors = overview.match(/^→ 对应章节：/gm) ?? [];
  assert.equal(chapterAnchors.length, layers.length, "每个层次各需一个“对应章节”标记");

  // The four original judgement entries stay intact — they are the sole data
  // source of the page's 竞争判断分层 cards (report.directions) — so the
  // framework is extended rather than replaced.
  const judgements = [
    "Level 1｜生存层：准入与内容闭环",
    "Level 2｜竞争层：自然交互与真实场景",
    "Level 3｜未来层：任务编排与跨端智能",
    "横向诊断轴｜先归因，再投入",
  ];
  const overviewLines = overview.split("\n");
  judgements.forEach((title, index) => {
    assert.match(overview, new RegExp(`^${index + 1}\\. ${title}$`, "m"),
      `总览必须保留第 ${index + 1} 条判断：${title}`);
    // sync-content.mjs reads the next non-empty line as the card detail.
    const line = overviewLines.findIndex((value) => value.trim() === `${index + 1}. ${title}`);
    const detail = (overviewLines[line + 1] ?? "").trim();
    assert.ok(detail.length > 0, `第 ${index + 1} 条判断必须紧跟一行说明`);
  });
});
