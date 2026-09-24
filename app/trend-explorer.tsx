"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { report } from "./content.generated";

type Section = (typeof report.sections)[number];
type Subsection = Section["subsections"][number];
type ContentHeading = Section["contentHeadings"][number];
type IntelligenceItem = (typeof report.intelligenceItems)[number];
type ReadingMode = "single" | "all";

/** 左侧常驻导航栏的板块入口：与页面各 section 的 id 一一对应。 */
const railTargets = [
  { id: "weekly-highlights", label: "本期值得优先关注" },
  { id: "intelligence-hub", label: "多维筛选" },
  { id: "full-report", label: "完整报告" },
] as const;

/**
 * 把一章 Markdown 渲染成 HTML，并给标题挂上内容锚点。
 *
 * 关键约束：标题必须先剥掉源码里显式的 `{#anchor}` 标记，再交给 marked 当作普通
 * Markdown 标题解析，最后按文档顺序回填 id。绝不能把标题直接换成裸 `<h2>` 标签——
 * 裸标签会开启 CommonMark 的 HTML block，把它后面直到空行为止的所有内容（列表、
 * 表格、正文）整段吞成纯文本：这正是「文档说明分点不换行」「总览挤成一坨」
 * 「重点摘要表格显示成一片竖线」的共同原因。
 */
function renderMarkdown(section: Section) {
  const body = section.body.replace(
    /^(#{2,4}\s+.+?)\s+\{#[a-z0-9][a-z0-9-]*\}\s*$/gm,
    "$1",
  );
  let headingIndex = 0;
  const html = marked.parse(body, { gfm: true, breaks: true }) as string;
  return html
    .replace(/<(h[2-4])[^>]*>/g, (match, tag: string) => {
      const contentHeading = section.contentHeadings[headingIndex];
      headingIndex += 1;
      if (!contentHeading) return match;
      return `<${tag} id="${contentHeading.id}" tabindex="-1">`;
    })
    // 总览的分层标记（【能力层】…）渲染为分层小标题，避免整段正文被读成一块
    .replace(/<p>【([^】<]+)】([^<]*)<\/p>/g, (_match, badge: string, rest: string) => (
      `<h3 class="overview-layer">`
      + `<span class="overview-layer-badge">${badge}</span>`
      + (rest.trim() ? `<span class="overview-layer-title">${rest.trim()}</span>` : "")
      + `</h3>`
    ))
    // 「→ 对应章节：X」渲染为章节指向标记；箭头由 CSS 提供
    .replace(/<p>→\s*对应章节：(.+?)<\/p>/g, '<p class="overview-ref">对应章节：$1</p>');
}

/** 周期区间在 Tab 上压成短标签（2026-09-14—2026-09-20 → 09-14—09-20）更易扫读。 */
function shortPeriod(period: string) {
  return period.replace(/^\d{4}-/, "").replace(/—\d{4}-/, "—");
}

type InternalCapability = { id: string; title: string; body: string };
type InternalCategory = { id: string; title: string; body: string; capabilities: InternalCapability[] };
type InternalGroup = { id: string; title: string; body: string; categories: InternalCategory[]; capabilities: InternalCapability[] };

function parseInternalProgress(section: Section) {
  const result: { preamble: string; groups: InternalGroup[] } = { preamble: "", groups: [] };
  let group: InternalGroup | undefined;
  let category: InternalCategory | undefined;
  let capability: InternalCapability | undefined;
  let headingIndex = 0;
  let buffer: string[] = [];

  const flush = () => {
    const body = buffer.join("\n").trim();
    if (capability) capability.body = body;
    else if (category) category.body = body;
    else if (group) group.body = body;
    else result.preamble = body;
    buffer = [];
  };

  section.body.split("\n").forEach((line) => {
    const headingMatch = line.match(/^(#{2,4})\s+(.+?)(?:\s+\{#[a-z0-9][a-z0-9-]*\})?\s*$/);
    if (!headingMatch) {
      buffer.push(line);
      return;
    }
    flush();
    const heading = section.contentHeadings[headingIndex];
    headingIndex += 1;
    if (!heading) return;
    if (heading.level === 2) {
      group = { id: heading.id, title: heading.title, body: "", categories: [], capabilities: [] };
      result.groups.push(group);
      category = undefined;
      capability = undefined;
    } else if (heading.level === 3 && group) {
      category = { id: heading.id, title: heading.title, body: "", capabilities: [] };
      group.categories.push(category);
      capability = undefined;
    } else if (heading.level === 4 && group) {
      capability = { id: heading.id, title: heading.title, body: "" };
      if (category) category.capabilities.push(capability);
      else group.capabilities.push(capability);
    }
  });
  flush();
  return result;
}

function MarkdownFragment({ content }: { content: string }) {
  if (!content) return null;
  return <div dangerouslySetInnerHTML={{ __html: marked.parse(content, { gfm: true, breaks: true }) as string }} />;
}

function IntelligenceReport({ section }: { section: Section }) {
  const groups = useMemo(() => {
    const grouped = new Map<string, IntelligenceItem[]>();
    section.intelligenceItems.forEach((item) => {
      const items = grouped.get(item.period) ?? [];
      items.push(item);
      grouped.set(item.period, items);
    });
    return [...grouped.entries()];
  }, [section]);
  const preamble = section.body.split(/^##\s+/m)[0]?.trim();

  return (
    <div className="markdown-body intelligence-report">
      <MarkdownFragment content={preamble} />
      {groups.map(([period, items]) => (
        <section className="intelligence-period" key={period}>
          <div className="intelligence-period-heading">
            <h2 id={section.contentHeadings.find((heading) => heading.title === period)?.id} tabIndex={-1}>{period}</h2>
            <span>{items.length} 条情报</span>
          </div>
          <div className="intelligence-card-stack">
            {items.map((item) => (
              <details className="intelligence-card" id={item.id} key={item.id}>
                <summary>
                  <div className="intelligence-summary-copy">
                    <h3>{item.title}</h3>
                    <p>{item.summary}</p>
                  </div>
                  <div className="intelligence-summary-side">
                    {/* 卡片正面只留层级：终端／能力／竞对／归因仍参与筛选，但不在这里展示。 */}
                    <div className="facet-tag-row" aria-label="竞争层级">
                      <span className={`facet-chip level-chip level-${item.level.slice(0, 2).toLowerCase()}`}>{item.level}</span>
                    </div>
                    <span className="intelligence-expand">查看详情 <b aria-hidden="true">→</b></span>
                  </div>
                </summary>
                <div className="intelligence-body">
                  <MarkdownFragment content={item.body} />
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function InternalProgressReport({ section }: { section: Section }) {
  const internal = useMemo(() => parseInternalProgress(section), [section]);
  const renderCapability = (item: InternalCapability) => (
    <details className="internal-capability-card" id={item.id} key={item.id}>
      <summary>
        <span>{item.title}</span>
      </summary>
      <div className="internal-capability-body">
        <MarkdownFragment content={item.body} />
      </div>
    </details>
  );

  return (
    <div className="markdown-body internal-progress-report">
      <MarkdownFragment content={internal.preamble} />
      {internal.groups.map((group) => (
        <section className="internal-progress-group" key={group.id}>
          <h2 id={group.id} tabIndex={-1}>{group.title}</h2>
          <MarkdownFragment content={group.body} />
          {group.capabilities.length > 0 && (
            <div className="internal-capability-grid">{group.capabilities.map(renderCapability)}</div>
          )}
          {group.categories.map((item) => (
            <section className="internal-category" key={item.id}>
              <div className="internal-category-heading">
                <h3 id={item.id} tabIndex={-1}>{item.title}</h3>
              </div>
              <MarkdownFragment content={item.body} />
              <div className="internal-capability-grid">{item.capabilities.map(renderCapability)}</div>
            </section>
          ))}
        </section>
      ))}
    </div>
  );
}

function SectionBody({ section }: { section: Section }) {
  if (section.title === "公司内部进展") return <InternalProgressReport section={section} />;
  if (["行业动态", "产品动态", "技术革新", "竞品与标杆公司动态"].includes(section.title)) {
    return <IntelligenceReport section={section} />;
  }
  return (
    <div
      className={section.title === "总览" ? "markdown-body markdown-overview" : "markdown-body"}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(section) }}
    />
  );
}

export function TrendExplorer() {
  const initialSectionId = typeof window === "undefined"
    ? undefined
    : window.location.hash.replace("#", "");
  const initialSection = report.sections.find(
    (section) => section.id === initialSectionId
      || section.contentHeadings.some((contentHeading) => contentHeading.id === initialSectionId),
  );
  const [activeId, setActiveId] = useState(
    initialSection
      ? initialSection.id
      : report.sections[1]?.id ?? report.sections[0]?.id,
  );
  const [terminalFilter, setTerminalFilter] = useState("all");
  const [capabilityFilter, setCapabilityFilter] = useState("all");
  const [competitorFilter, setCompetitorFilter] = useState("all");
  const [attributionFilter, setAttributionFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [readingMode, setReadingMode] = useState<ReadingMode>("single");
  const [highlightPeriod, setHighlightPeriod] = useState("");
  const [railSection, setRailSection] = useState<string>(railTargets[0].id);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const filterDetailsRef = useRef<HTMLDetailsElement>(null);
  const active = report.sections.find((section) => section.id === activeId) ?? report.sections[0];
  const updatedAt = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(report.sourceUpdatedAt));

  useEffect(() => {
    const updateReadingProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      setReadingProgress(Math.min(100, Math.max(0, progress)));
      setShowBackToTop(window.scrollY > 720);
    };
    updateReadingProgress();
    window.addEventListener("scroll", updateReadingProgress, { passive: true });
    return () => window.removeEventListener("scroll", updateReadingProgress);
  }, []);

  // 左栏高亮跟读：滚动时把当前正在阅读的板块标出来，导航与内容始终对得上。
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setRailSection(visible.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    railTargets.forEach((target) => {
      const element = document.getElementById(target.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (readingMode !== "all") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];
        const sectionId = visible?.target.getAttribute("data-section-id");
        const section = report.sections.find((item) => item.id === sectionId);
        if (section) setActiveId(section.id);
      },
      { rootMargin: "-18% 0px -68% 0px" },
    );
    document.querySelectorAll(".all-report-chapter").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [readingMode]);

  useEffect(() => {
    const reportRoot = document.getElementById("full-report");
    const handleMarkdownLink = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      const detailId = anchor?.getAttribute("href")?.slice(1);
      if (!detailId) return;
      const section = report.sections.find((candidate) => (
        candidate.contentHeadings.some((heading) => heading.id === detailId)
      ));
      if (!section) return;
      event.preventDefault();
      window.history.replaceState(null, "", `#${detailId}`);
      if (readingMode === "all") {
        const target = document.getElementById(detailId);
        if (target instanceof HTMLDetailsElement) target.open = true;
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      setActiveId(section.id);
      setReadingMode("single");
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const target = document.getElementById(detailId);
          if (target instanceof HTMLDetailsElement) target.open = true;
          target?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    };
    reportRoot?.addEventListener("click", handleMarkdownLink);
    return () => reportRoot?.removeEventListener("click", handleMarkdownLink);
  }, [readingMode]);

  const highlightGroups = useMemo(() => {
    const groups = new Map<string, Array<(typeof report.highlights)[number]>>();
    report.highlights.forEach((item) => {
      const group = groups.get(item.period) ?? [];
      group.push(item);
      groups.set(item.period, group);
    });
    return [...groups.entries()]
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([period, items]) => ({ period, items }));
  }, []);

  const activeHighlightGroup = highlightGroups.find((group) => group.period === highlightPeriod)
    ?? highlightGroups[0];

  const facetOptions = useMemo(() => {
    const unique = (values: readonly (readonly string[])[]) => [...new Set(values.flat())].sort(
      (left, right) => left.localeCompare(right, "zh-CN"),
    );
    return {
      terminals: unique(report.intelligenceItems.map((item) => item.terminals)),
      capabilities: unique(report.intelligenceItems.map((item) => item.capabilities)),
      competitors: unique(report.intelligenceItems.map((item) => item.competitors)),
      attributions: unique(report.intelligenceItems.map((item) => item.attributions)),
      levels: [...new Set(report.intelligenceItems.map((item) => item.level))].sort(),
    };
  }, []);

  const filteredIntelligence = useMemo(() => report.intelligenceItems.filter((item) => (
    (terminalFilter === "all" || item.terminals.includes(terminalFilter as never))
    && (capabilityFilter === "all" || item.capabilities.includes(capabilityFilter as never))
    && (competitorFilter === "all" || item.competitors.includes(competitorFilter as never))
    && (attributionFilter === "all" || item.attributions.includes(attributionFilter as never))
    && (levelFilter === "all" || item.level === levelFilter)
  )), [terminalFilter, capabilityFilter, competitorFilter, attributionFilter, levelFilter]);

  const facetsAreActive = [terminalFilter, capabilityFilter, competitorFilter, attributionFilter, levelFilter]
    .some((value) => value !== "all");

  /**
   * 结果卡片底部的标签行。只显示「与当前筛选一致」的取值：该维度已被筛选就显示筛选值，
   * 未筛选才回落到该条目自己的首个取值。
   *
   * 为什么不直接取各维度的第一个取值：多维筛选用的是包含匹配，一条情报可以同时挂在多个
   * 终端／能力下。取 [0] 会出现「按电视大屏筛，卡片上却写着语音遥控器」——读者看到的是
   * 与自己筛选条件无关的标签，只会判成筛错了。
   */
  const facetTagLine = (item: IntelligenceItem) => [
    terminalFilter === "all" ? item.terminals[0] : terminalFilter,
    capabilityFilter === "all" ? item.capabilities[0] : capabilityFilter,
    competitorFilter === "all" ? "" : competitorFilter,
    attributionFilter === "all" ? item.attributions[0] : attributionFilter,
  ].filter(Boolean).join(" · ");

  // 「多维筛选」的筛选表单默认折叠。从左栏改完筛选却看不到结果是坏体验，
  // 因此只要有筛选条件生效就自动展开一次；用户随后手动收起则不再干预。
  useEffect(() => {
    if (facetsAreActive && filterDetailsRef.current) filterDetailsRef.current.open = true;
  }, [facetsAreActive]);

  const resetFacets = () => {
    setTerminalFilter("all");
    setCapabilityFilter("all");
    setCompetitorFilter("all");
    setAttributionFilter("all");
    setLevelFilter("all");
  };

  const chooseSection = (section: Section) => {
    setActiveId(section.id);
    setReadingMode("single");
    window.history.replaceState(null, "", `#${section.id}`);
    document.getElementById("report-explorer")?.scrollIntoView({ behavior: "smooth" });
  };

  /** 左栏板块导航：平滑滚动到目标板块，并立刻把高亮切过去（不等 observer 回填）。 */
  const jumpToRailTarget = (id: string) => {
    setRailSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const chooseContentHeading = (section: Section, contentHeading: ContentHeading) => {
    setActiveId(section.id);
    setReadingMode("single");
    window.history.replaceState(null, "", `#${contentHeading.id}`);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const target = document.getElementById(contentHeading.id);
          if (target instanceof HTMLDetailsElement) target.open = true;
          target?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  const chooseIntelligenceItem = (item: IntelligenceItem) => {
    const section = report.sections.find((candidate) => candidate.id === item.sectionId);
    const heading = section?.contentHeadings.find((candidate) => candidate.id === item.id);
    if (section && heading) chooseContentHeading(section, heading);
  };

  const chooseSubsection = (section: Section, subsection: Subsection) => (
    chooseContentHeading(section, subsection)
  );

  const showAllSections = () => {
    setReadingMode("all");
    window.history.replaceState(null, "", "#report-explorer");
    window.requestAnimationFrame(() => {
      document.getElementById("report-explorer")?.scrollIntoView({ behavior: "smooth" });
    });
  };

  const showSingleSection = () => {
    setReadingMode("single");
    window.history.replaceState(null, "", `#${active.id}`);
    window.requestAnimationFrame(() => {
      document.getElementById("report-explorer")?.scrollIntoView({ behavior: "smooth" });
    });
  };

  const findHighlightTarget = (event: string, detailId?: string) => {
    const preciseSection = detailId
      ? report.sections.find((section) => section.contentHeadings.some((heading) => heading.id === detailId))
      : undefined;
    const section = preciseSection ?? report.sections.find(
      (candidate) => candidate.title !== "重点摘要" && candidate.body.includes(event),
    ) ?? report.sections.find((candidate) => candidate.title === "重点摘要") ?? report.sections[0];
    return {
      section,
      contentHeading: detailId
        ? section.contentHeadings.find((heading) => heading.id === detailId)
        : undefined,
    };
  };

  return (
    <main className="site-shell">
      <div className="reading-progress" aria-hidden="true">
        <span style={{ width: `${readingProgress}%` }} />
      </div>
      <header className="hero">
        <div className="hero-inner">
          <p className="eyebrow">IFLYHOME OS · AI FRONTIER TRACKER</p>
          <h1>语音交互与 AI 人机交互行业动态报告</h1>
          <p className="hero-copy">{report.subtitle}</p>
          <div className="meta-row">
            <span className="meta-pill">观察周期：{report.coverage}</span>
            <span className="meta-pill">面向平台团队管理者、产品与研发</span>
            <span className="meta-pill">更新于 {updatedAt}</span>
          </div>
          <a className="hero-action" href="#full-report">浏览全部 {report.metrics.sections} 个章节 <span aria-hidden="true">↓</span></a>
        </div>
      </header>

      {/* 常驻左栏：整页可见的导航 + 分类筛选，滚动时固定在视口内。 */}
      <div className="shell-body">
        <aside className="site-rail" aria-label="报告导航与分类筛选">
          <nav className="rail-block" aria-label="板块导航">
            <p>QUICK JUMP</p>
            <div className="rail-link-list">
              {railTargets.map((target) => (
                <button
                  className={railSection === target.id ? "rail-link active" : "rail-link"}
                  key={target.id}
                  type="button"
                  aria-current={railSection === target.id ? "true" : undefined}
                  onClick={() => jumpToRailTarget(target.id)}
                >
                  {target.label}
                </button>
              ))}
            </div>
          </nav>

          <nav className="rail-block" aria-label="报告章节">
            <p>REPORT INDEX · {report.metrics.sections} CHAPTERS</p>
            <div className="primary-nav-list">
              {report.sections.map((section) => (
                <button
                  className={`nav-button ${section.id === active.id ? "active" : ""}`}
                  key={section.id}
                  onClick={() => readingMode === "all"
                    ? document.getElementById(`all-${section.id}`)?.scrollIntoView({ behavior: "smooth" })
                    : chooseSection(section)}
                  type="button"
                  aria-current={section.id === active.id ? "page" : undefined}
                >
                  {section.numeral}、{section.title}
                </button>
              ))}
            </div>
            {readingMode === "single" && active.subsections.length > 0 && (
              <div className="sub-nav" aria-label={`${active.title}二级导航`}>
                <span>本章目录</span>
                {active.subsections.map((subsection) => (
                  <button
                    className={(subsection.level as number) === 3 ? "sub-nav-button nested" : "sub-nav-button"}
                    key={subsection.id}
                    onClick={() => chooseSubsection(active, subsection)}
                    type="button"
                  >
                    {subsection.title}
                  </button>
                ))}
              </div>
            )}
          </nav>

          <section className="rail-block" aria-label="分类筛选">
            <p>FILTER · 分类筛选</p>
            <div className="rail-filters">
              <label>
                <span>终端类型</span>
                <select value={terminalFilter} onChange={(event) => setTerminalFilter(event.target.value)}>
                  <option value="all">全部终端</option>
                  {facetOptions.terminals.map((value) => <option value={value} key={value}>{value}</option>)}
                </select>
              </label>
              <label>
                <span>能力域</span>
                <select value={capabilityFilter} onChange={(event) => setCapabilityFilter(event.target.value)}>
                  <option value="all">全部能力</option>
                  {facetOptions.capabilities.map((value) => <option value={value} key={value}>{value}</option>)}
                </select>
              </label>
              <label>
                <span>竞对</span>
                <select value={competitorFilter} onChange={(event) => setCompetitorFilter(event.target.value)}>
                  <option value="all">全部竞对</option>
                  {facetOptions.competitors.map((value) => <option value={value} key={value}>{value}</option>)}
                </select>
              </label>
              <label>
                <span>问题归因</span>
                <select value={attributionFilter} onChange={(event) => setAttributionFilter(event.target.value)}>
                  <option value="all">全部归因</option>
                  {facetOptions.attributions.map((value) => <option value={value} key={value}>{value}</option>)}
                </select>
              </label>
              <label>
                <span>竞争层级</span>
                <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}>
                  <option value="all">全部层级</option>
                  {facetOptions.levels.map((value) => <option value={value} key={value}>{value}</option>)}
                </select>
              </label>
            </div>
            <div className="rail-filter-foot">
              <span>命中 <b>{filteredIntelligence.length}</b> 条情报</span>
              <button className="reset-facets" type="button" onClick={resetFacets} disabled={!facetsAreActive}>重置</button>
            </div>
            {facetsAreActive && (
              <button className="rail-more" type="button" onClick={() => jumpToRailTarget("intelligence-hub")}>
                查看筛选结果 <span aria-hidden="true">↓</span>
              </button>
            )}
          </section>
        </aside>

        <div className="dashboard">
        <section id="weekly-highlights">
          <p className="section-kicker">WEEKLY HIGHLIGHTS</p>
          <div className="section-heading-row">
            <div>
              <h2 className="section-title">本期值得优先关注</h2>
              <p className="section-description">先按周期切换，再扫读影响判断，按需展开来源并定位到完整报告。</p>
            </div>
          </div>
          <div className="highlight-tabs" aria-label="按周期切换本期重点">
            {highlightGroups.map((group) => (
              <button
                className={group.period === activeHighlightGroup?.period ? "active" : ""}
                key={group.period}
                type="button"
                title={group.period}
                aria-label={`${group.period}，${group.items.length} 条`}
                aria-pressed={group.period === activeHighlightGroup?.period}
                onClick={() => setHighlightPeriod(group.period)}
              >
                <span>{shortPeriod(group.period)}</span>
                <small>{group.items.length}</small>
              </button>
            ))}
          </div>
          {activeHighlightGroup && (
            <div className="highlight-grid">
              {activeHighlightGroup.items.map((item) => (
                <article className="highlight-card" key={`${item.event}-${item.date}`}>
                  <div className="highlight-meta">
                    <span>{item.type}</span>
                    <span>{item.source}</span>
                    <time dateTime={item.date}>{item.date}</time>
                  </div>
                  <a
                    className="highlight-link"
                    href={`#${item.detailId}`}
                    onClick={(event) => {
                      event.preventDefault();
                      const target = findHighlightTarget(item.event, item.detailId);
                      if (target.contentHeading) {
                        chooseContentHeading(target.section, target.contentHeading);
                      } else {
                        chooseSection(target.section);
                      }
                    }}
                  >
                    <h3>{item.event}</h3>
                    <p className="highlight-impact">{item.impact}</p>
                    <span className="highlight-cta">查看分析 <span aria-hidden="true">→</span></span>
                  </a>
                  <div className="tag-row" aria-label="关键词">
                    {item.keywords.split(/[、，,]/).slice(0, 2).map((keyword) => (
                      <span className="tag" key={keyword}>{keyword.trim()}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="intelligence-hub" id="intelligence-hub" aria-labelledby="intelligence-filter-title">
          <p className="section-kicker">MULTI-DIMENSION FILTER</p>
          <div className="section-heading-row">
            <div>
              <h2 className="section-title" id="intelligence-filter-title">多维筛选</h2>
              <p className="section-description">用结构化维度定位同一问题：在哪类终端、涉及什么能力、面对谁、该由谁解决、处于哪一竞争层。</p>
            </div>
            <span className="section-note">共 {report.metrics.intelligence} 条情报</span>
          </div>
          <div className="intelligence-panel">
            <details className="intelligence-filter-disclosure" ref={filterDetailsRef}>
              <summary className="intelligence-filter-summary">
                <span>
                  <strong>筛选条件</strong>
                </span>
              </summary>
              <div className="intelligence-filters">
                <label>
                  <span>终端类型</span>
                  <select value={terminalFilter} onChange={(event) => setTerminalFilter(event.target.value)}>
                    <option value="all">全部终端</option>
                    {facetOptions.terminals.map((value) => <option value={value} key={value}>{value}</option>)}
                  </select>
                </label>
                <label>
                  <span>能力域</span>
                  <select value={capabilityFilter} onChange={(event) => setCapabilityFilter(event.target.value)}>
                    <option value="all">全部能力</option>
                    {facetOptions.capabilities.map((value) => <option value={value} key={value}>{value}</option>)}
                  </select>
                </label>
                <label>
                  <span>竞对</span>
                  <select value={competitorFilter} onChange={(event) => setCompetitorFilter(event.target.value)}>
                    <option value="all">全部竞对</option>
                    {facetOptions.competitors.map((value) => <option value={value} key={value}>{value}</option>)}
                  </select>
                </label>
                <label>
                  <span>问题归因</span>
                  <select value={attributionFilter} onChange={(event) => setAttributionFilter(event.target.value)}>
                    <option value="all">全部归因</option>
                    {facetOptions.attributions.map((value) => <option value={value} key={value}>{value}</option>)}
                  </select>
                </label>
                <label>
                  <span>竞争层级</span>
                  <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}>
                    <option value="all">全部层级</option>
                    {facetOptions.levels.map((value) => <option value={value} key={value}>{value}</option>)}
                  </select>
                </label>
                <button className="reset-facets" type="button" onClick={resetFacets} disabled={!facetsAreActive}>重置筛选</button>
              </div>
            </details>
            {facetsAreActive && (
              <>
                <div className="intelligence-result-grid" aria-live="polite">
                  {filteredIntelligence.slice(0, 18).map((item) => (
                    <button className="intelligence-result-card" type="button" key={item.id} onClick={() => chooseIntelligenceItem(item)}>
                      <div>
                        <span>{item.sectionTitle}</span>
                      </div>
                      <strong>{item.title}</strong>
                      <p>{item.summary}</p>
                      <small>{facetTagLine(item)}</small>
                    </button>
                  ))}
                  {filteredIntelligence.length === 0 && (
                    <div className="intelligence-empty">当前组合没有匹配条目。可减少一个筛选条件，或把缺失维度列入下一轮输入任务。</div>
                  )}
                </div>
                {filteredIntelligence.length > 18 && (
                  <p className="intelligence-overflow">当前先展示前 18 条；继续收窄维度可定位具体情报。</p>
                )}
              </>
            )}
          </div>
        </section>

        <section className="report-section" id="full-report">
          <p className="section-kicker">FULL REPORT</p>
          <div className="section-heading-row report-heading">
            <div>
              <h2 className="section-title">完整报告</h2>
              <p className="section-description">通过章节目录选择单章阅读，或展开全部内容核对完整证据。</p>
            </div>
            <span className="section-note">共 {report.metrics.sections} 个章节</span>
          </div>

          <div className="report-reader-toolbar">
            <div>
              <span>阅读方式</span>
              <strong>{readingMode === "single" ? `当前：${active.numeral}、${active.title}` : "当前：全部章节"}</strong>
            </div>
            <div className="reading-mode-switch" aria-label="切换报告阅读方式">
              <button
                className={readingMode === "single" ? "active" : ""}
                type="button"
                aria-pressed={readingMode === "single"}
                onClick={showSingleSection}
              >单章阅读</button>
              <button
                className={readingMode === "all" ? "active" : ""}
                type="button"
                aria-pressed={readingMode === "all"}
                onClick={showAllSections}
              >展开全部</button>
            </div>
          </div>

          <div className={`explorer ${readingMode === "all" ? "all-mode" : ""}`} id="report-explorer">
            {readingMode === "single" ? (
              <div className="content-panel">
                <article className="article-card">
                  <h2>{active.numeral}、{active.title}</h2>
                  <SectionBody section={active} />
                </article>
              </div>
            ) : (
              <div className="all-report-stack">
                {report.sections.map((section) => (
                  <article
                    className="article-card all-report-chapter"
                    id={`all-${section.id}`}
                    data-section-id={section.id}
                    key={section.id}
                  >
                    <div className="all-report-heading">
                      <span>{section.numeral}</span>
                      <div>
                        <h2>{section.title}</h2>
                      </div>
                    </div>
                    <SectionBody section={section} />
                  </article>
                ))}
                <button className="collapse-all-button" type="button" onClick={showSingleSection}>
                  收起全部，返回单章阅读 <span aria-hidden="true">↑</span>
                </button>
              </div>
            )}
          </div>
        </section>

        <p className="footer-note">内容同步自 {report.sourceName} · Markdown 为唯一事实源 · GitHub Pages 静态发布</p>
        </div>
      </div>
      {showBackToTop && (
        <button className="back-to-top" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="返回页面顶部">
          <span aria-hidden="true">↑</span><small>顶部</small>
        </button>
      )}
    </main>
  );
}
