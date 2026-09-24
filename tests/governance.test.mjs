import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readProjectFile = (path) => readFile(new URL(path, root), "utf8");

const requiredSections = [
  "一、文档说明",
  "二、总览",
  "三、重点摘要",
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

  assert.doesNotMatch(markdown, /暂时无法在.{0,12}文档外展示此内容|\[if !supportLists\]|\[endif\]|mso-/i);
  assert.match(markdown, /^#### .+ \{#[a-z0-9][a-z0-9-]*\}$/m);
  assert.match(
    markdown,
    /^情报维度：终端=.+；能力=.+；(?:竞对=.+；)?归因=(?:能力问题|体验问题|资源\/商务问题|交付问题|合规\/法务问题)(?:、(?:能力问题|体验问题|资源\/商务问题|交付问题|合规\/法务问题))*；层级=L[123]-(?:生存层|竞争层|未来层)$/m,
  );
  assert.match(markdown, /L1-生存层/);
  assert.match(markdown, /L2-竞争层/);
  assert.match(markdown, /L3-未来层/);
  // 归因五值的解释性载体（总览「五类问题对应五类资源」与七章「问题归因矩阵」表）已于
  // 2026-09-24 随总览整块与七章内部字段一并删除，因此这里不再断言正文里有两处解释。
  // 归因枚举本身仍是封闭五值，执行点是 content/facet-taxonomy.json 的逐行登记
  // （「情报维度取值必须登记在受控词表内」），口径记录在 docs/CONTENT_SCHEMA.md §6.1/§6.2。

  const periodHeadings = markdown.match(/^## \d{4}-\d{2}-\d{2}—\d{4}-\d{2}-\d{2}$/gm) ?? [];
  assert.ok(periodHeadings.length >= 1, "at least one normalized period heading is required");
  assert.match(markdown, /^八、公司内部进展[\s\S]*存量材料/m);
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
  assert.match(schema, /存量材料/);
  assert.match(schema, /情报维度/);
  assert.match(schema, /L1-生存层/);
  assert.match(schema, /资源\/商务问题/);
});

test("文档说明 covers scope and both content kinds", async () => {
  // 源码按 LF 处理，便于对「空行分块」做逐字断言。
  const markdown = (await readProjectFile("content/行业动态追踪.md")).replace(/\r\n/g, "\n");

  // 一、文档说明 must declare a 内容覆盖 subsection.
  assert.match(markdown, /^## 内容覆盖$/m, "文档说明必须包含“内容覆盖”小节");

  // 2026-09-24：内容覆盖由「双轨制（轨道 A／轨道 B）」改写为「五类外部变化 + 两类不同性质的变化」。
  // 断言的职责没有变——它守的是「报告不等于运营商验收口径」：必须同时声明前沿探索与业务落地
  // 两类内容。这里按新表述校验，不再锁定已删除的轨道命名。
  const docSection = markdown.split(/^二、总览$/m)[0];
  for (const dimension of ["模型与算法", "终端与硬件", "产品与体验", "政策与标准", "竞品与标杆公司"]) {
    assert.match(docSection, new RegExp(`^- \\*\\*${dimension}\\*\\*：`, "m"), `内容覆盖缺少「${dimension}」一类外部变化`);
  }
  assert.match(docSection, /两类不同性质的变化：\n\*\*前沿探索类\*\*：/, "内容覆盖必须声明「前沿探索类」");
  assert.match(docSection, /\*\*业务落地类\*\*：/, "内容覆盖必须声明「业务落地类」");

  // 2026-09-14：删掉「轨道划分决定一条情报要回答到什么程度…」和「信息源按固定源、
  // 专项源和线索源三类管理…」两段。理由：前者是对双轨制的二次解释，正文里读起来是
  // 重复；后者是信息源体系的管理说明，属于 docs/INFORMATION_SOURCES_AND_CONTENT_DIRECTION.md
  // 的职责，正文里只需要指路，不需要复述。反向断言防止加回。
  assert.doesNotMatch(docSection, /同一事件可同时进入两条轨道/);
  assert.doesNotMatch(docSection, /信息源按固定源、专项源和线索源三类管理/);

  // 分点必须与引导句之间留空行，否则 marked 会把引导句和列表并成一个 <p>。
  // 2026-09-23：引导句里的部门名已按公开面脱敏收敛为「平台团队」，断言随之更新；
  // 断言的职责是「留空行」，不是锁定组织名。
  assert.match(docSection, /帮助平台团队：\n\n- 了解语音交互/, "文档目的分点需换行");
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

test("总览只保留三个事实层，不再带优先级与行动判断整块", async () => {
  const markdown = (await readProjectFile("content/行业动态追踪.md")).replace(/\r\n/g, "\n");

  const overview = markdown.split(/^二、总览$/m)[1]?.split(/^三、重点摘要$/m)[0] ?? "";
  assert.ok(overview.length > 0, "总览 章节必须存在");

  // 2026-09-24：删去「我们自己｜优先级与行动判断」整块及其尾部章节标记，页面
  // 「竞争判断分层」卡片（report.directions）随之移除。三个事实层（能力层／产品层／产业层）
  // 与各自的「→ 对应章节：」标记保留。这里做反向断言，防止整块回流。
  for (const gone of ["【我们自己｜优先级与行动判断】", "【团队优先级与行动判断】",
    "Level 1｜", "Level 2｜", "Level 3｜", "横向诊断轴"]) {
    assert.doesNotMatch(overview, new RegExp(gone), `总览不应再包含「${gone}」`);
  }
  for (const layer of ["【能力层】", "【产品层】", "【产业层】"]) {
    assert.match(overview, new RegExp(`^${layer}`, "m"), `总览必须保留「${layer}」`);
  }
  assert.match(overview, /^→ 对应章节：六、技术革新$/m);
  assert.match(overview, /^→ 对应章节：五、产品动态、七、竞品与标杆公司动态$/m);
  assert.match(overview, /^→ 对应章节：四、行业动态$/m);
  assert.doesNotMatch(overview, /^→ 对应章节：八、公司内部进展$/m,
    "总览不应再指向第八章：该标记属于已删除的「我们自己」整块");
});

test("三、重点摘要只保留摘要表格，详细条目已移入四—七章", async () => {
  const markdown = (await readProjectFile("content/行业动态追踪.md")).replace(/\r\n/g, "\n");

  const summary = markdown.split(/^三、重点摘要$/m)[1]?.split(/^四、行业动态$/m)[0] ?? "";
  assert.ok(summary.length > 0, "重点摘要 章节必须存在");

  // 2026-09-24：三章曾同时承载「详细条目」与「摘要表格」，同一条信息出现三种形态。
  // 现在详细条目移到四—七章对应位置，三章只剩按周分组的摘要表。
  assert.doesNotMatch(summary, /^#### /m, "三章不应再出现 #### 详细条目");
  const periods = summary.match(/^## \d{4}-\d{2}-\d{2}—\d{4}-\d{2}-\d{2}$/gm) ?? [];
  assert.ok(periods.length >= 1, "三章必须保留按周分组的周期标题");
  assert.equal(new Set(periods).size, periods.length, `三章周期标题不得重复：${periods.join("、")}`);
  const rows = summary.split(/\r?\n/).filter((line) => line.startsWith("|")
    && !/^\|[-|\s]+\|$/.test(line) && !line.includes("| 事件 |"));
  assert.ok(rows.length > 0, "三章必须保留摘要表数据行");

  // 摘要表里的「查看详情」锚点必须在正文里能找到对应条目（sync-content 会硬失败，这里提前拦）。
  const anchors = [...summary.matchAll(/\[查看详情\]\(#([a-z0-9-]+)\)/g)].map((match) => match[1]);
  assert.ok(anchors.length > 0, "三章摘要表必须带 [查看详情](#锚点)");
  for (const anchor of anchors) {
    assert.match(markdown, new RegExp(`\\{#${anchor}\\}`),
      `摘要表锚点 #${anchor} 在正文里找不到对应条目`);
  }
});

test("四—七章展开区不再包含内部工作流字段", async () => {
  const markdown = (await readProjectFile("content/行业动态追踪.md")).replace(/\r\n/g, "\n");

  const live = markdown.split(/^四、行业动态$/m)[1]?.split(/^八、公司内部进展$/m)[0] ?? "";
  assert.ok(live.length > 0, "第四至第七章必须存在");

  // 2026-09-24 决策：保守口径，只删列出的四类内部字段。同义的其它字段名
  // （判断边界／证据边界／标签／技术剖析等）不在本轮范围，故不在此断言。
  for (const field of ["证据标签", "成熟度与证据边界", "建议动作", "核验状态"]) {
    assert.doesNotMatch(live, new RegExp(`^(?:\\d+\\.\\s*|- )?\\*{0,2}${field}[：:]`, "m"),
      `四—七章不应再出现「${field}」字段`);
  }

  // 「情报维度」整行必须保留：层级、终端、能力、竞对、归因仍由它供给筛选与卡片层级，
  // 只是不再在卡片正面与展开区展示（见 app/trend-explorer.tsx）。
  assert.match(live, /^情报维度：终端=.+；能力=.+；.*层级=L[123]-/m,
    "情报维度整行必须保留（它是筛选与层级的唯一数据源）");
  const dimensions = live.match(/^情报维度：.+$/gm) ?? [];
  assert.ok(dimensions.length >= 40, `四—七章 情报维度 行数异常：${dimensions.length}`);

  // §七 另有五个只出现在第七章（客户决策专题）的内部字段，同日一并删除。
  // 其中「来源与边界」原文提到内部材料名，属于公开面泄露面，这里连材料名一起反向断言。
  const ch7 = markdown.split(/^七、竞品与标杆公司动态$/m)[1]?.split(/^八、公司内部进展$/m)[0] ?? "";
  assert.ok(ch7.length > 0, "第七章必须存在");
  for (const field of ["客户为什么买单", "四类决策场景", "竞争位置", "问题归因矩阵", "来源与边界"]) {
    assert.doesNotMatch(ch7, new RegExp(`^(?:\\d+\\.\\s*|- )?\\*{0,2}${field}[：:]`, "m"),
      `七章不应再出现内部字段「${field}」`);
  }
  assert.match(ch7, /\*\*竞争判断：\*\*/, "七章必须保留「竞争判断」（读者最想看的部分）");
  assert.doesNotMatch(ch7, /前期客户需求调研/, "公开内容源不得出现内部材料名");
});

test("渲染层不再输出已删除的区块与内部字段名", async () => {
  const component = await readProjectFile("app/trend-explorer.tsx");
  const css = await readProjectFile("app/globals.css");

  // 2026-09-24 精简轮：这些区块/字段名只存在于组件与样式层，内容源侧断言拦不住，
  // 必须在这里守。它们一度被漏删（内容源已清、渲染层仍在），故逐项反向断言。
  for (const marker of ["core-signals", "竞争判断分层", "NEXT QUESTIONS", "待继续确认",
    "related-questions", "建议动作", "优先级与行动判断", "横向诊断轴",
    // 2026-09-24 第二轮：「搜索全部报告」整块下架，连同它的快捷键、作用域与派生索引。
    "search-hub", "搜索全部报告", "searchScopes", "cleanMarkdownLine", "searchRef",
    "searchIndex", "多维情报筛选", "intelligence-count"]) {
    assert.doesNotMatch(component, new RegExp(marker),
      `app/trend-explorer.tsx 不应再出现「${marker}」`);
  }
  for (const marker of [".direction-", "related-questions", "search-"]) {
    assert.doesNotMatch(css, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `app/globals.css 不应再出现「${marker}」样式`);
  }

  // 卡片正面精简后，展开入口文案必须是「查看详情 →」。
  assert.match(component, /查看详情/, "卡片展开入口应使用「查看详情」文案");
  assert.doesNotMatch(component, /展开分析/, "旧的「展开分析」文案应已替换");
});

test("多维筛选与完整报告同级，结果卡片不再显示与筛选无关的标签", async () => {
  const component = await readProjectFile("app/trend-explorer.tsx");

  // 「多维筛选」必须是章节级 h2（与「完整报告」同级）。它在 2026-09-24 之前只是 details
  // 的 summary 里一个 <strong>，视觉上不构成章节标题；页面同时不再有「搜索全部报告」。
  assert.equal(
    (component.match(/<h2 className="section-title" id="intelligence-filter-title">多维筛选<\/h2>/g) ?? []).length,
    1,
    "「多维筛选」必须以 section-title 级别的 h2 出现",
  );
  assert.match(component, /用结构化维度定位同一问题/, "章节说明应随标题上移到章节头");
  assert.match(component, /className="intelligence-panel"/, "筛选控件与结果区应合成一张卡");

  // 结果卡片底部的标签行按「与当前筛选一致」的取值生成。此前一律取各维度的第一个取值，
  // 一条情报挂在多个终端下时会出现「按电视大屏筛、卡片上却写着语音遥控器」——实测
  // 「电视大屏」命中的 18 条里有 6 条如此，读者只会判成筛错了。旧的 slice(0, 1) 写法
  // 一旦回流，这条断言转红。
  assert.match(component, /const facetTagLine = \(item: IntelligenceItem\) => \[/,
    "标签行必须由 facetTagLine 统一生成");
  assert.match(component, /terminalFilter === "all" \? item\.terminals\[0\] : terminalFilter/,
    "已筛选的维度必须显示筛选值");
  assert.doesNotMatch(component, /\.\.\.item\.terminals\.slice\(0, 1\)/,
    "旧的「取首个终端」写法应已删除");

  // 卡片正面同时去掉层级码（2026-09-24 决策）：层级仍参与筛选，但不再挂在结果卡片上。
  assert.doesNotMatch(component, /<b>\{item\.level\}<\/b>/, "结果卡片不应再显示层级码");
});

test("章节渲染器不再向 Markdown 注入裸标题标签", async () => {
  const component = await readProjectFile("app/trend-explorer.tsx");

  // 把 Markdown 标题替换成裸 `<h2>` 会开启 CommonMark 的 HTML block：它会把标题
  // 后面直到空行为止的所有内容（列表、表格、正文）整段吞成纯文本。2026-09-14 之前
  // 线上表现就是「文档说明分点不换行」「总览挤成一坨」「重点摘要表格显示成
  // 一片竖线」。标题必须先由 marked 解析，再按文档顺序回填 id。反向断言防止回退。
  assert.doesNotMatch(component, /`<h\$\{level\}/, "不得再把标题替换成裸 HTML 标签");
  assert.match(component, /marked\.parse\(body, \{ gfm: true, breaks: true \}\)/);
});

test("总览正文以空行分块，避免整章被渲染成一整段", async () => {
  const markdown = (await readProjectFile("content/行业动态追踪.md")).replace(/\r\n/g, "\n");
  const overview = markdown.split(/^二、总览$/m)[1]?.split(/^三、重点摘要$/m)[0] ?? "";

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
test("时间字段在页头与正文之间保持同步", async () => {
  // 规则见 docs/CONTENT_SCHEMA.md §4.1：页面顶部与正文共有 5 处时间，任何一次内容
  // 更新都必须让它们互相一致。漏改的典型症状是「页头写着刚更新、正文还停在旧日期」，
  // 或「覆盖时间已推进、本期周期还留在上一周」。下面把不变量固化为断言。
  const [markdown, generated] = await Promise.all([
    readProjectFile("content/行业动态追踪.md"),
    readProjectFile("app/content.generated.ts"),
  ]);
  const source = markdown.replace(/\r\n/g, "\n");

  // 1) 《覆盖时间》正文必须存在、格式规范、起止有序。
  const coverage = source.match(
    /^## 覆盖时间\n(\d{4})年(\d{2})月(\d{2})日—(\d{4})年(\d{2})月(\d{2})日$/m,
  );
  assert.ok(coverage, "《覆盖时间》正文必须是 YYYY年MM月DD日—YYYY年MM月DD日（月日补零）");
  const [, startYear, startMonth, startDay, endYear, endMonth, endDay] = coverage;
  const coverageStart = `${startYear}-${startMonth}-${startDay}`;
  const coverageEnd = `${endYear}-${endMonth}-${endDay}`;
  assert.ok(coverageStart <= coverageEnd, `覆盖时间起始日不得晚于结束日：${coverageStart} > ${coverageEnd}`);

  // 2) 页头「观察周期：」渲染的是 report.coverage，必须与《覆盖时间》逐字相同。
  //    sync-content.mjs 取的是内容源里第一个中文长日期区间，所以第 1 项必须是它。
  assert.match(
    generated,
    new RegExp(`"coverage": "${startYear}年${startMonth}月${startDay}日—${endYear}年${endMonth}月${endDay}日"`),
    "页头「观察周期」必须等于《覆盖时间》正文",
  );

  // 3) 总览首个「截至」日期必须等于覆盖时间结束日（该处月日不补零）。
  const asOf = source.match(/^截至(\d{4})年(\d{1,2})月(\d{1,2})日/m);
  assert.ok(asOf, "总览必须以「截至YYYY年M月D日…」开头");
  const asOfDate = `${asOf[1]}-${String(asOf[2]).padStart(2, "0")}-${String(asOf[3]).padStart(2, "0")}`;
  assert.equal(asOfDate, coverageEnd, `总览「截至」日期（${asOfDate}）必须等于覆盖时间结束日（${coverageEnd}）`);

  // 4) 「本期周期：A—B」必须是覆盖时间结束日所在的自然周（周一—周日）。
  const period = source.match(/^本期周期：(\d{4}-\d{2}-\d{2})—(\d{4}-\d{2}-\d{2})$/m);
  assert.ok(period, "重点摘要必须声明「本期周期：YYYY-MM-DD—YYYY-MM-DD」");
  const [, periodStart, periodEnd] = period;
  const weekStart = new Date(`${coverageEnd}T00:00:00Z`);
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  assert.equal(weekStart.toISOString().slice(0, 10), periodStart,
    `本期周期必须从覆盖时间结束日（${coverageEnd}）所在自然周的周一开始`);
  assert.ok(periodStart <= coverageEnd && coverageEnd <= periodEnd,
    `覆盖时间结束日（${coverageEnd}）必须落在本期周期（${periodStart}—${periodEnd}）内`);

  // 5) 覆盖时间必须覆盖正文中出现的最新周期，否则就是「新增了一周内容但忘了改时间」。
  const periodRanges = [...source.matchAll(/^## (\d{4}-\d{2}-\d{2})—(\d{4}-\d{2}-\d{2})$/gm)]
    .map(([, from, to]) => [from, to]);
  assert.ok(periodRanges.length > 0, "正文必须至少存在一个周期标题");
  const [latestStart] = periodRanges.reduce((latest, current) => (current[0] > latest[0] ? current : latest));
  assert.ok(coverageEnd >= latestStart,
    `覆盖时间结束日（${coverageEnd}）早于正文最新周期（${latestStart} 起）：新增一周内容时请同步刷新时间字段`);

  // 6) 「更新于」来自文件时间，不得手写进内容源。
  assert.doesNotMatch(markdown, /更新于/, "内容源不得手写「更新于」");
});

const facetDimensionByKey = {
  终端: "terminals",
  能力: "capabilities",
  竞对: "competitors",
  归因: "attributions",
  层级: "levels",
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("情报维度取值必须登记在受控词表内", async () => {
  // 动机（2026-09-18 抽样诊断）：标签本身可以在词表允许范围内，只要写法不统一，
  // 精确匹配的筛选就会漏检——`中屏` 与 `家庭中屏` 各自成一个桶。这里守住「新增取值
  // 必须先登记」这一条：登记是可评审的动作，顺手写一个新写法不是。
  // 契约与四类角色（canonical／aliases／placeholders／deprecated）见 docs/CONTENT_SCHEMA.md §6.2。
  const [markdown, taxonomyRaw] = await Promise.all([
    readProjectFile("content/行业动态追踪.md"),
    readProjectFile("content/facet-taxonomy.json"),
  ]);
  const taxonomy = JSON.parse(taxonomyRaw);

  // 词表自洽：别名与占位符的目标必须是已登记的规范值，否则归一后会掉出词表外。
  for (const [dimension, spec] of Object.entries(taxonomy.dimensions)) {
    for (const [variant, canonical] of Object.entries(spec.aliases)) {
      assert.ok(spec.canonical.includes(canonical),
        `${dimension}：别名「${variant}」指向的规范值「${canonical}」未登记在 canonical 里`);
      assert.ok(!spec.canonical.includes(variant),
        `${dimension}：「${variant}」既在 canonical 又作为别名来源，角色冲突`);
    }
    for (const placeholder of spec.placeholders) {
      assert.ok(!spec.canonical.includes(placeholder),
        `${dimension}：占位符「${placeholder}」不是取值，不应同时登记为 canonical`);
    }
    // deprecated 是「待改清单」而不是「已删除」：登记在这里的写法仍被视为已登记，构建不会变红；
    // 只有写明它实际上是什么（category）和应改成什么（action），它才是可评审的处置而不是无据的删除。
    // 逐条修正内容源后删掉这些条目，本测试即自动转为硬拦截。
    for (const [legacy, entry] of Object.entries(spec.deprecated ?? {})) {
      assert.ok(!spec.canonical.includes(legacy),
        `${dimension}：「${legacy}」既在 canonical 又被标为 deprecated，角色冲突`);
      assert.ok(!(legacy in spec.aliases),
        `${dimension}：「${legacy}」既在 aliases 又被标为 deprecated，角色冲突`);
      assert.ok(entry.category && entry.action,
        `${dimension}：deprecated 的「${legacy}」必须写明 category 与 action`);
    }
    // itemScoped 是条目级例外（同一取值在不同条目里角色不同）。它必须在内容源里定位到
    // 唯一一条 #### 标题，且该条目确实挂着这个取值：内容源改掉之后定位会失败 → 门禁转红
    // → 强制回来删登记，与 deprecated 是同一套闭环。用标题片段而非行号定位，因为行号会漂移。
    for (const entry of spec.itemScoped ?? []) {
      assert.ok(spec.canonical.includes(entry.value),
        `${dimension}：itemScoped 的「${entry.value}」不在 canonical 内`);
      assert.ok(entry.category && entry.action,
        `${dimension}：itemScoped 的「${entry.value}」必须写明 category 与 action`);
      assert.ok(Array.isArray(entry.headingContains) && entry.headingContains.length > 0,
        `${dimension}：itemScoped 的「${entry.value}」必须给出 headingContains 标题片段`);
      const sourceLines = markdown.replace(/\r\n/g, "\n").split("\n");
      for (const fragment of entry.headingContains) {
        const headingIndexes = sourceLines.reduce(
          (acc, line, index) => (line.startsWith("#### ") && line.includes(fragment) ? [...acc, index] : acc), []);
        assert.equal(headingIndexes.length, 1,
          `itemScoped 定位「${fragment}」应命中唯一一条 #### 标题，实际命中 ${headingIndexes.length} 条`);
        const start = headingIndexes[0];
        const nextBoundary = sourceLines.findIndex((line, index) => index > start && /^(####|###|##) /.test(line));
        const block = sourceLines.slice(start, nextBoundary === -1 ? sourceLines.length : nextBoundary);
        const metaLine = block.find((line) => line.startsWith("情报维度："));
        assert.ok(metaLine, `itemScoped 定位到的条目「${fragment}」缺少 情报维度 行`);
        const field = metaLine.slice(metaLine.indexOf(`${spec.label}=`) + spec.label.length + 1).split("；")[0];
        assert.ok(field.split(/[、，,]/).map((value) => value.trim()).includes(entry.value),
          `itemScoped：「${fragment}」这条条目并未挂「${entry.value}」，内容源已改的话请删除该登记`);
      }
    }
  }

  const source = markdown.replace(/\r\n/g, "\n");
  const metadataLines = source.match(/^情报维度：.+$/gm) ?? [];
  assert.ok(metadataLines.length > 0, "内容源必须至少有一条 情报维度 行");

  const unregistered = new Set();
  for (const line of metadataLines) {
    for (const group of line.replace(/^情报维度：/, "").split(/[；;]/)) {
      const [key, valuePart] = group.split(/[=：:]/, 2).map((value) => value?.trim());
      const dimension = facetDimensionByKey[key];
      if (!dimension || !valuePart) continue;
      const spec = taxonomy.dimensions[dimension];
      const registered = new Set([
        ...spec.canonical,
        ...Object.keys(spec.aliases),
        ...spec.placeholders,
        // deprecated 的写法仍算「已登记」——否则 2026-09-18 定案一落地，构建会立刻变红，
        // 反而看不出「还剩哪些条目没改」。待改清单由 scripts/facet-review.mjs 逐条列出。
        ...Object.keys(spec.deprecated ?? {}),
      ]);
      for (const value of valuePart.split(/[、，,]/).map((item) => item.trim()).filter(Boolean)) {
        if (!registered.has(value)) unregistered.add(`${key}=${value}`);
      }
    }
  }

  assert.deepEqual([...unregistered], [],
    `以下标签取值未登记在 content/facet-taxonomy.json：${[...unregistered].join("、")}\n`
    + "新增取值属于内容决策：请在词表里登记它的角色（canonical 还是某规范值的 aliases），"
    + "并在 docs/CONTENT_SCHEMA.md §6.2 记录意图，不要直接改内容源绕过评审。");
});

test("生成物里的标签取值已完成别名归一", async () => {
  // 与上一条互补：上一条查「内容源写了什么」，这一条查「下游拿到什么」。
  // 归一若失效，页面会重新出现同义并列的筛选桶——这是回归时最先被看见的症状。
  const [generated, taxonomyRaw] = await Promise.all([
    readProjectFile("app/content.generated.ts"),
    readProjectFile("content/facet-taxonomy.json"),
  ]);
  const taxonomy = JSON.parse(taxonomyRaw);

  for (const [dimension, spec] of Object.entries(taxonomy.dimensions)) {
    const shouldNotAppear = [...Object.keys(spec.aliases), ...spec.placeholders];
    for (const value of shouldNotAppear) {
      assert.doesNotMatch(generated, new RegExp(`^\\s*"${escapeRegExp(value)}",?$`, "m"),
        `${dimension}：「${value}」应被归一或丢弃，不应作为标签值出现在生成物里`);
    }
  }

  // 归一后的取值必须仍在词表内，避免把内容源里的登记项改成一个没人认得的写法。
  // deprecated 同样算「在词表内」：定案与内容源修正之间有窗口期，此期间旧写法还会流到生成物，
  // 那是待改项而不是回归——待改清单见 scripts/facet-review.mjs。
  for (const [dimension, spec] of Object.entries(taxonomy.dimensions)) {
    const field = { terminals: "terminals", capabilities: "capabilities", competitors: "competitors" }[dimension];
    if (!field) continue;
    const values = [...generated.matchAll(new RegExp(`"${field}": \\[\\n([^\\]]*?)\\n\\s*\\]`, "g"))]
      .flatMap(([, body]) => [...body.matchAll(/"([^"]+)"/g)].map(([, value]) => value));
    assert.ok(values.length > 0, `${field} 在生成物里必须有取值`);
    for (const value of new Set(values)) {
      assert.ok(spec.canonical.includes(value) || value in (spec.deprecated ?? {}),
        `${dimension}：生成物里的「${value}」既不在 canonical 内，也未登记为 deprecated`);
    }
  }
});
