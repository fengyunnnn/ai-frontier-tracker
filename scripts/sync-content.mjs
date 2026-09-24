import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const defaultSource = path.resolve(
  projectRoot,
  "content",
  "行业动态追踪.md",
);
const source = process.env.SOURCE_MARKDOWN
  ? path.resolve(process.env.SOURCE_MARKDOWN)
  : defaultSource;

const raw = (await readFile(source, "utf8")).replace(/\r\n/g, "\n");
const sourceStat = await stat(source);
const headingPattern = /^(一|二|三|四|五|六|七|八)、([^\n]+)$/gm;
const contentHeadingPattern = /^(#{2,4})\s+(.+?)(?:\s+\{#([a-z0-9][a-z0-9-]*)\})?\s*$/gm;

const intelligenceTaxonomy = {
  terminals: [
    ["电视大屏", /电视|大屏|AI TV|Fire TV|webOS/i],
    ["机顶盒", /机顶盒|STB|set-top/i],
    ["家庭中屏", /中屏|智能屏/i],
    ["语音遥控器", /遥控器|remote control/i],
    ["家庭中枢", /家庭中枢|AI Home|SmartThings|ThinQ|智能家居/i],
    ["泛智能终端", /机器人|眼镜|可穿戴|智能硬件/i],
    ["PC/边缘设备", /PC|RTX|Jetson|边缘设备|局域网/i],
    ["平台/API", /API|SDK|平台|工作台|开发者/i],
  ],
  capabilities: [
    ["ASR", /ASR|语音识别|转写/i],
    ["TTS", /TTS|语音合成|音色/i],
    ["全双工", /全双工|插话|打断|turn-taking/i],
    ["唤醒与声学", /唤醒|误唤醒|AEC|VAD|降噪|远场|声学/i],
    ["内容搜索与播放", /搜片|内容搜索|搜索即播|播放闭环|EPG|媒资|内容发现/i],
    ["任务编排", /任务编排|工具调用|Agent|智能体|设备编排/i],
    ["端侧与端云", /端侧|端云|NPU|芯片|本地部署|边缘/i],
    ["多模态", /多模态|视觉|视频理解|屏幕上下文/i],
    ["声纹与身份", /声纹|Voice ID|身份|家庭成员/i],
    ["平台工程", /平台化|配置化|规模交付|多省|SDK|API/i],
    ["安全合规", /安全|合规|隐私|未成年人|权限/i],
    ["个性化与记忆", /个性化|记忆|偏好|主动推荐/i],
  ],
  competitors: [
    ["OpenAI", /OpenAI|GPT-/i],
    ["Google", /Google|Gemini/i],
    ["Microsoft", /Microsoft|微软|VibeVoice/i],
    ["NVIDIA", /NVIDIA|Nemotron|PAIR/i],
    ["Amazon/Alexa", /Amazon|Alexa|Fire TV/i],
    ["Samsung", /Samsung|三星/i],
    ["LG", /LG|ThinQ|webOS/i],
    ["酷开", /酷开|Coocaa|AIOS/i],
    ["中兴", /中兴|ZTE/i],
    ["阿里/Qwen", /阿里|Qwen|千问|CosyVoice/i],
    ["腾讯", /腾讯/i],
    ["字节/豆包", /字节|豆包|Seed/i],
    ["Deepgram", /Deepgram/i],
    ["LiveKit", /LiveKit/i],
    ["VUI Labs", /VUI Labs|Luna-TTS/i],
    ["海思", /海思|HiSilicon/i],
    ["晶晨", /晶晨|Amlogic/i],
    ["百视通", /百视通|BesTV/i],
    ["爱上传媒", /爱上传媒|爱上电视/i],
  ],
};

// 受控词表：标签取值的允许范围与别名/占位符登记（契约见 docs/CONTENT_SCHEMA.md §6.2）。
const facetTaxonomy = JSON.parse(
  await readFile(path.resolve(projectRoot, "content", "facet-taxonomy.json"), "utf8"),
);

const inferValues = (text, rules) => rules
  .filter(([, pattern]) => pattern.test(text))
  .map(([label]) => label);

/**
 * 标签取值归一：别名 → 规范值，占位符直接丢弃。
 *
 * 为什么必须在生成阶段做而不是留到页面匹配：页面与后续统计/分析都是精确字符串匹配，
 * 同一条情报写成 `中屏` 还是 `家庭中屏` 会各自成为独立的筛选桶，选任一个都漏检另一批。
 * 归一只改生成物，不改内容源——内容源的写法收敛是独立的一步。
 */
const normalizeFacetValues = (dimension, values) => {
  const spec = facetTaxonomy.dimensions[dimension];
  return [...new Set(values
    .map((value) => spec.aliases[value] ?? value)
    .filter((value) => !spec.placeholders.includes(value)))];
};

const parseIntelligenceMetadata = (body) => {
  const metadataLine = body.match(/^情报维度：(.+)$/m)?.[1];
  const metadata = {};
  if (metadataLine) {
    for (const group of metadataLine.split(/[；;]/)) {
      const [rawKey, rawValues] = group.split(/[=：:]/, 2).map((value) => value?.trim());
      if (!rawKey || !rawValues) continue;
      metadata[rawKey] = rawValues.split(/[、，,]/).map((value) => value.trim()).filter(Boolean);
    }
  }
  return {
    metadata,
    body: body.replace(/^情报维度：.+\n?/m, "").trim(),
  };
};

/**
 * 摘要要出现在卡片正面，必须只留正文。内容源里每条的首句都带一个字段名引导词
 * （结论先行／竞争判断／公司动作／产品动作／技术事件／本周期技术事件），直接透传会把
 * 内部工作流的字段名摆到读者面前。只按显式清单剥离，不能写成「首个冒号前一律去掉」——
 * 正文本身常以「Vinci2：围绕连续第一视角…」这类形式开头，通用规则会误伤。
 */
const summaryLeadingFieldPattern = /^(?:结论先行|竞争判断|公司动作|产品动作|技术事件|本周期技术事件)[：:]\s*/;

const summarizeDetail = (body) => {
  const line = body.split("\n")
    .map((item) => item
      .replace(/^\s*\d+[.)]\s*/, "")
      .replace(/^[-*>\s]+/, "")
      .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
      .replace(/[*_`|]/g, "")
      .trim())
    .find((item) => item.length >= 24
      && !/^(判断状态|标签|发布时间|核验状态|来源|证据标签|成熟度与证据边界|建议动作)[：:]/.test(item)
      && !item.startsWith("http"));
  if (!line) return "进入条目查看事实、判断边界与后续动作。";
  const summary = line.replace(summaryLeadingFieldPattern, "");
  return `${summary.slice(0, 110)}${summary.length > 110 ? "…" : ""}`;
};

const headings = [...raw.matchAll(headingPattern)];
const sections = headings.map((match, index) => {
  const id = `section-${index + 1}`;
  const body = raw.slice(
    match.index + match[0].length,
    headings[index + 1]?.index ?? raw.length,
  ).trim();
  let subsectionIndex = 0;
  let detailIndex = 0;
  const contentHeadingMatches = [...body.matchAll(contentHeadingPattern)];
  const contentHeadings = contentHeadingMatches.map((contentHeading) => {
    const level = contentHeading[1].length;
    if (level <= 3) subsectionIndex += 1;
    else detailIndex += 1;
    return {
      id: contentHeading[3] ?? (level <= 3
        ? `${id}-sub-${subsectionIndex}`
        : `${id}-detail-${detailIndex}`),
      title: contentHeading[2].trim(),
      level,
    };
  });
  const subsections = contentHeadings.filter((contentHeading) => contentHeading.level <= 3);
  return {
    id,
    numeral: match[1],
    title: match[2].trim(),
    body,
    subsections,
    contentHeadings,
    intelligenceItems: [],
  };
});

const intelligenceSectionTitles = new Set(["行业动态", "产品动态", "技术革新", "竞品与标杆公司动态"]);
for (const section of sections) {
  if (!intelligenceSectionTitles.has(section.title)) continue;
  const matches = [...section.body.matchAll(contentHeadingPattern)];
  let period = "持续观察";
  matches.forEach((match, index) => {
    const heading = section.contentHeadings[index];
    if (heading.level <= 3) {
      period = heading.title;
      return;
    }
    const detailBody = section.body.slice(
      match.index + match[0].length,
      matches[index + 1]?.index ?? section.body.length,
    ).trim();
    const parsed = parseIntelligenceMetadata(detailBody);
    const searchable = `${heading.title}\n${parsed.body}`;
    section.intelligenceItems.push({
      id: heading.id,
      sectionId: section.id,
      sectionTitle: section.title,
      period,
      title: heading.title,
      body: parsed.body,
      summary: summarizeDetail(parsed.body),
      terminals: normalizeFacetValues(
        "terminals",
        parsed.metadata["终端"] ?? inferValues(searchable, intelligenceTaxonomy.terminals),
      ),
      capabilities: normalizeFacetValues(
        "capabilities",
        parsed.metadata["能力"] ?? inferValues(searchable, intelligenceTaxonomy.capabilities),
      ),
      competitors: normalizeFacetValues(
        "competitors",
        parsed.metadata["竞对"] ?? inferValues(searchable, intelligenceTaxonomy.competitors),
      ),
      // 归因与层级是受枚举约束的封闭取值（tests/governance.test.mjs 用正则强校验），不做别名归一。
      attributions: parsed.metadata["归因"] ?? ["待归因"],
      level: parsed.metadata["层级"]?.[0] ?? "待分层",
    });
  });
}

const highlights = [];
const summaryBody = sections.find((section) => section.title === "重点摘要")?.body ?? "";
// 表格按 `## YYYY-MM-DD—YYYY-MM-DD` 分周；把周区间带给每条 highlight，
// 页面「本期值得优先关注」据此做周期切换 Tab，而不是把 8 个日期组纵向堆起来。
let highlightPeriod = "";
for (const line of summaryBody.split("\n")) {
  const periodMatch = line.match(/^##\s+(\d{4}-\d{2}-\d{2}—\d{4}-\d{2}-\d{2})\s*$/);
  if (periodMatch) {
    highlightPeriod = periodMatch[1];
    continue;
  }
  if (!line.startsWith("|") || /^\|[-|\s]+\|$/.test(line) || line.includes("| 事件 |")) continue;
  const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
  if (cells.length >= 6) {
    const detailId = cells[6]?.match(/\(#([a-z0-9][a-z0-9-]*)\)/)?.[1];
    highlights.push({
      event: cells[0],
      type: cells[1],
      keywords: cells[2],
      impact: cells[3],
      source: cells[4],
      date: cells[5],
      period: highlightPeriod,
      detailId,
    });
  }
}

const contentHeadingIds = new Set(
  sections.flatMap((section) => section.contentHeadings.map((contentHeading) => contentHeading.id)),
);
for (const highlight of highlights) {
  if (!highlight.detailId) {
    throw new Error(`Highlight “${highlight.event}” is missing a detailed-analysis anchor.`);
  }
  if (!contentHeadingIds.has(highlight.detailId)) {
    throw new Error(`Highlight “${highlight.event}” points to missing anchor #${highlight.detailId}.`);
  }
}

const coverage = raw.match(/(20\d{2}年\d{2}月\d{2}日\s*[—-]\s*20\d{2}年\d{2}月\d{2}日)/)?.[1] ?? "持续更新";
const officialLinks = new Set(raw.match(/https?:\/\/[^\s)]+/g) ?? []);
const report = {
  title: "语音交互与 AI 人机交互行业动态追踪",
  subtitle: "把外部变化转化为可核验的行业判断、平台能力输入与产品验证建议",
  coverage,
  sourceName: path.basename(source),
  sourceUpdatedAt: sourceStat.mtime.toISOString(),
  highlights,
  sections,
  intelligenceItems: sections.flatMap((section) => section.intelligenceItems),
  metrics: {
    highlights: highlights.length,
    sections: sections.length,
    sources: officialLinks.size,
    intelligence: sections.reduce((total, section) => total + section.intelligenceItems.length, 0),
  },
};

await writeFile(
  path.resolve(projectRoot, "app", "content.generated.ts"),
  `// AUTO-GENERATED by scripts/sync-content.mjs. DO NOT EDIT MANUALLY.\nexport const report = ${JSON.stringify(report, null, 2)} as const;\n`,
  "utf8",
);

console.log(`Synced ${path.basename(source)}: ${sections.length} sections, ${highlights.length} highlights.`);
