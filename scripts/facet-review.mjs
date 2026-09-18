#!/usr/bin/env node
/**
 * 标签审查报告：把受控词表的定案结果翻译成逐条待改清单。
 *
 * 为什么是一个脚本而不是一条门禁断言：
 * 2026-09-18 定案后，内容源里必然还有一批「旧写法等着逐条改」。如果直接把 deprecated
 * 变成硬拦截，构建立刻变红，红里混着 48 条待办，反而看不出进度；而且内容源修正要逐项
 * 由人拍板，门禁不该替人做决定。所以约定：门禁守「新增取值必须先登记」（防继续漂移），
 * 本脚本出「现存旧写法还剩哪些」（出清单）。内容源改完后，把词表里的 deprecated 条目
 * 删掉，门禁即自动转为硬拦截。
 *
 * 用法：
 *   node scripts/facet-review.mjs           # 输出 Markdown 清单
 *   node scripts/facet-review.mjs --json    # 输出结构化数据
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFile(path.resolve(projectRoot, relative), "utf8");

const DIMENSION_BY_KEY = {
  终端: "terminals",
  能力: "capabilities",
  竞对: "competitors",
  归因: "attributions",
  层级: "levels",
};

const COMPLIANCE_KEYWORDS = ["合规", "法务", "隐私", "法律", "监管", "版权", "牌照", "资质"];

const [markdown, taxonomyRaw] = await Promise.all([
  read("content/行业动态追踪.md"),
  read("content/facet-taxonomy.json"),
]);
const taxonomy = JSON.parse(taxonomyRaw);
const lines = markdown.replace(/\r\n/g, "\n").split("\n");

/** 逐条解析：#### 标题 + 其后的 情报维度 行 + 正文区间。 */
const items = [];
let heading = null;
for (let i = 0; i < lines.length; i += 1) {
  if (/^#### /.test(lines[i])) heading = { line: i + 1, text: lines[i].replace(/^#### /, "").replace(/\s*\{#[a-z0-9-]+\}\s*$/, "").trim() };
  if (!lines[i].startsWith("情报维度：")) continue;
  const fields = {};
  for (const group of lines[i].replace("情报维度：", "").split("；")) {
    const [key, value] = group.split("=");
    if (!value) continue;
    fields[key.trim()] = value.split(/[、,，]/).map((item) => item.trim()).filter(Boolean);
  }
  let end = i + 1;
  while (end < lines.length && !/^(####|###|##) /.test(lines[end])) end += 1;
  items.push({
    line: i + 1,
    headingLine: heading?.line ?? null,
    title: heading?.text ?? "(无标题)",
    fields,
    // 正文必须排除 情报维度 行本身：否则标签里的字会反过来「证明」自己成立，
    // 多挂筛查会恒为 0 处（2026-09-18 实测踩到过）。
    body: lines.slice(i + 1, end).join("\n"),
  });
}

const allPending = taxonomy.pendingDecisions ?? [];
const pendingKeys = new Set(allPending.flatMap((entry) => [entry.from, entry.candidate].filter(Boolean)));

const deprecatedHits = [];
const pendingHits = [];
const unsupported = [];
const missing = [];
const attributionCandidates = [];

for (const item of items) {
  const short = item.title.slice(0, 40);
  for (const [key, dimension] of Object.entries(DIMENSION_BY_KEY)) {
    const spec = taxonomy.dimensions[dimension];
    const attached = item.fields[key] ?? [];

    for (const value of attached) {
      const entry = (spec.deprecated ?? {})[value];
      if (entry) {
        deprecatedHits.push({ ...entry, dimension: key, value, line: item.line, title: short });
      }
      if (allPending.some((p) => p.dimension === dimension && p.from === value)) {
        pendingHits.push({
          dimension: key,
          value,
          line: item.line,
          title: short,
          reason: allPending.find((p) => p.dimension === dimension && p.from === value).reason,
        });
      }
      // 规则 1：正文明确讨论的对象才挂。挂了却在正文里找不到任何线索，即疑似「凑模板多挂」。
      const hints = spec.matchHints?.[value];
      if (hints && !hints.some((hint) => item.body.toLowerCase().includes(hint.toLowerCase()))) {
        unsupported.push({ dimension: key, value, line: item.line, title: short, hints: hints.join("／") });
      }
    }

    // 反向：只对词表点名要反查的取值做「有线索却没挂」。高频抽象能力做字面反查会产出上百条
    // 噪声（实测），所以 reverseCheck 只列低频、形态明确的取值，见词表 readme。
    for (const value of spec.reverseCheck ?? []) {
      if (attached.includes(value) || pendingKeys.has(value)) continue;
      const hints = spec.matchHints?.[value];
      if (!hints) continue;
      const hits = hints.filter((hint) => item.body.toLowerCase().includes(hint.toLowerCase()));
      if (hits.length > 0) {
        missing.push({ dimension: key, value, line: item.line, title: short, hits: hits.join("、") });
      }
    }
  }

  const attributions = item.fields["归因"] ?? [];
  if (!attributions.includes("合规/法务问题")) {
    const hits = COMPLIANCE_KEYWORDS.filter((word) => item.body.includes(word));
    if (hits.length > 0) {
      attributionCandidates.push({ line: item.line, title: short, current: attributions.join("、") || "(无)", hits: hits.join("、") });
    }
  }
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ itemCount: items.length, deprecatedHits, pendingHits, unsupported, missing, attributionCandidates }, null, 2));
  process.exit(0);
}

const table = (header, rows) => [
  `| ${header.join(" | ")} |`,
  `| ${header.map(() => "---").join(" | ")} |`,
  ...rows.map((row) => `| ${row.join(" | ")} |`),
].join("\n");

const out = [];
out.push(`# 标签审查报告（词表 v${taxonomy.version} · ${taxonomy.updatedAt}）`);
out.push("");
out.push(`共解析 ${items.length} 条情报。本报告由 \`scripts/facet-review.mjs\` 机械生成：`);
out.push("第 1、2 段是词表定案的直接结果；第 3、4、5 段是按规则 1／4 做的字面筛查，**可能有误报**，需人工确认。");
out.push("");

out.push(`## 1. 按规则 2 应移出该维度的取值（已登记为 deprecated）：${deprecatedHits.length} 处`);
out.push("");
if (deprecatedHits.length === 0) out.push("无。");
else out.push(table(["条目行", "情报", "维度", "取值", "它实际上是什么", "建议改成"],
  deprecatedHits.map((h) => [`L${h.line}`, h.title, h.dimension, h.value, h.category, h.action])));
out.push("");

out.push(`## 2. 处置未定，等你拍板（pendingDecisions）：${pendingHits.length} 处、${new Set(pendingHits.map((h) => `${h.dimension}/${h.value}`)).size} 个取值`);
out.push("");
if (pendingHits.length === 0) out.push("无。");
else {
  // 按取值聚合：同一个待定取值往往横跨十几条，逐条列会淹没真正需要拍板的那几个。
  const grouped = new Map();
  for (const hit of pendingHits) {
    const key = `${hit.dimension}/${hit.value}`;
    if (!grouped.has(key)) grouped.set(key, { ...hit, lines: [] });
    grouped.get(key).lines.push(hit.line);
  }
  out.push(table(["维度", "取值", "条数", "命中条目行", "为什么待定"],
    [...grouped.values()].map((g) => [
      g.dimension, g.value, String(g.lines.length), g.lines.map((l) => `L${l}`).join("、"), g.reason,
    ])));
}
out.push("");

out.push(`## 3. 挂了但正文找不到线索（疑似「凑模板多挂」，规则 1）：${unsupported.length} 处`);
out.push("");
if (unsupported.length === 0) out.push("无。");
else out.push(table(["条目行", "情报", "维度", "取值", "正文里应当出现的线索"],
  unsupported.map((h) => [`L${h.line}`, h.title, h.dimension, h.value, h.hints])));
out.push("");

out.push(`## 4. 正文有线索但没挂（疑似漏挂，规则 1）：${missing.length} 处`);
out.push("");
if (missing.length === 0) out.push("无。");
else out.push(table(["条目行", "情报", "维度", "取值", "命中的正文线索"],
  missing.map((h) => [`L${h.line}`, h.title, h.dimension, h.value, h.hits])));
out.push("");

out.push(`## 5. 归因第五值候选（规则 4「合规/法务问题」）：${attributionCandidates.length} 处`);
out.push("");
if (attributionCandidates.length === 0) out.push("无。");
else out.push(table(["条目行", "情报", "当前归因", "正文命中的合规类关键词"],
  attributionCandidates.map((h) => [`L${h.line}`, h.title, h.current, h.hits])));
out.push("");

out.push("## 6. 汇总");
out.push("");
out.push(table(["段", "含义", "处数"], [
  ["1", "按规则 2 定案应移除（改完即从词表删掉，门禁转硬拦截）", deprecatedHits.length],
  ["2", "处置未定，需你拍板", pendingHits.length],
  ["3", "疑似多挂（规则 1），需读正文确认", unsupported.length],
  ["4", "疑似漏挂（规则 1），需读正文确认", missing.length],
  ["5", "归因第五值候选（规则 4）", attributionCandidates.length],
]));

console.log(out.join("\n"));
