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
  // 源码是 CRLF，这里统一成 LF，便于对「空行分块」做逐字断言。
  const markdown = (await readProjectFile("content/行业动态追踪.md")).replace(/\r\n/g, "\n");

  // 一、文档说明 must declare a 内容覆盖 subsection.
  assert.match(markdown, /^## 内容覆盖$/m, "文档说明必须包含“内容覆盖”小节");

  // 内容覆盖 keeps the dual-track definition (previously buried under 更新方式),
  // so the report is not read as operator-acceptance-only.
  const docSection = markdown.split(/^二、总览$/m)[0];
  assert.match(docSection, /轨道 A｜交互体验与 AI 前沿战略雷达/);
  assert.match(docSection, /轨道 B｜业务落地与产业约束雷达/);

  // 2026-09-14：删掉「轨道划分决定一条情报要回答到什么程度…」和「信息源按固定源、
  // 专项源和线索源三类管理…」两段。理由：前者是对双轨制的二次解释，正文里读起来是
  // 重复；后者是信息源体系的管理说明，属于 docs/INFORMATION_SOURCES_AND_CONTENT_DIRECTION.md
  // 的职责，正文里只需要指路，不需要复述。反向断言防止加回。
  assert.doesNotMatch(docSection, /同一事件可同时进入两条轨道/);
  assert.doesNotMatch(docSection, /信息源按固定源、专项源和线索源三类管理/);

  // 分点必须与引导句之间留空行，否则 marked 会把引导句和列表并成一个 <p>。
  assert.match(docSection, /帮助OS平台部：\n\n- 了解语音交互/, "文档目的分点需换行");
  assert.match(docSection, /本报告主要为以下工作提供输入：\n\n- OS平台能力规划/, "服务对象分点需换行");
  assert.match(docSection, /^- 专题升级：同一方向积累足够证据后，形成专题研究。$/m);

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

test("总览 keeps the four numbered judgements that feed the directions cards", async () => {
  const markdown = (await readProjectFile("content/行业动态追踪.md")).replace(/\r\n/g, "\n");

  const overview = markdown.split(/^二、总览$/m)[1]?.split(/^三、本期重点摘要$/m)[0] ?? "";
  assert.ok(overview.length > 0, "总览 章节必须存在");

  // Contract only: these four numbered judgements are the sole data source of
  // the page's 竞争判断分层 cards (report.directions). sync-content.mjs reads
  // `^数字.` lines (number ≤ 4) and takes the next NON-EMPTY line as the card
  // detail, so the numbering must stay 1—4 and each entry keeps a detail line.
  // The surrounding narrative layers (【能力层】etc.) are presentation only and
  // are deliberately NOT asserted here — see docs/CONTENT_SCHEMA.md「总览结构」.
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
    // 与 sync-content.mjs 一致：跳过空行后取第一条非空行作为卡片说明。
    const line = overviewLines.findIndex((value) => value.trim() === `${index + 1}. ${title}`);
    const detail = (overviewLines.slice(line + 1).find((value) => value.trim()) ?? "").trim();
    assert.ok(detail.length > 0, `第 ${index + 1} 条判断必须紧跟一行说明`);
  });
});

test("章节渲染器不再向 Markdown 注入裸标题标签", async () => {
  const component = await readProjectFile("app/trend-explorer.tsx");

  // 把 Markdown 标题替换成裸 `<h2>` 会开启 CommonMark 的 HTML block：它会把标题
  // 后面直到空行为止的所有内容（列表、表格、正文）整段吞成纯文本。2026-09-14 之前
  // 线上表现就是「文档说明分点不换行」「总览挤成一坨」「本期重点摘要表格显示成
  // 一片竖线」。标题必须先由 marked 解析，再按文档顺序回填 id。反向断言防止回退。
  assert.doesNotMatch(component, /`<h\$\{level\}/, "不得再把标题替换成裸 HTML 标签");
  assert.match(component, /marked\.parse\(body, \{ gfm: true, breaks: true \}\)/);
});

test("总览正文以空行分块，避免整章被渲染成一整段", async () => {
  const markdown = (await readProjectFile("content/行业动态追踪.md")).replace(/\r\n/g, "\n");
  const overview = markdown.split(/^二、总览$/m)[1]?.split(/^三、本期重点摘要$/m)[0] ?? "";

  const rawLines = overview.split("\n").map((line) => line.trim());
  const unseparated = [];
  for (let index = 1; index < rawLines.length; index += 1) {
    if (rawLines[index] && rawLines[index - 1]) {
      unseparated.push(`${rawLines[index - 1]} ⟂ ${rawLines[index]}`);
    }
  }

  // 总览用不到 Markdown 标题：四个分层标记（【能力层】…）和「→ 对应章节：X」都是
  // 独立行，靠空行分隔才各自成为一块。相邻两行非空 = 会被 marked 并进同一个段落，
  // 页面就退回「挤成一坨」。补一行空行即可。
  assert.deepEqual(unseparated, [], `总览存在未用空行分隔的相邻行：\n${unseparated.join("\n")}`);
});
