"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { report } from "./content.generated";

type Section = (typeof report.sections)[number];
type Subsection = Section["subsections"][number];

function escapeHtml(content: string) {
  return content
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderMarkdown(section: Section) {
  let headingIndex = 0;
  const contentWithAnchors = section.body.replace(
    /^(#{2,3})\s+(.+)$/gm,
    (line, markers: string, title: string) => {
      const subsection = section.subsections[headingIndex];
      headingIndex += 1;
      if (!subsection) return line;
      const level = markers.length;
      return `<h${level} id="${subsection.id}" tabindex="-1">${escapeHtml(title.trim())}</h${level}>`;
    },
  );
  return marked.parse(contentWithAnchors, { gfm: true, breaks: true }) as string;
}

export function TrendExplorer() {
  const initialSectionId = typeof window === "undefined"
    ? undefined
    : window.location.hash.replace("#", "");
  const initialSection = report.sections.find(
    (section) => section.id === initialSectionId
      || section.subsections.some((subsection) => subsection.id === initialSectionId),
  );
  const [activeId, setActiveId] = useState(
    initialSection
      ? initialSection.id
      : report.sections[1]?.id ?? report.sections[0]?.id,
  );
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [expandedHighlight, setExpandedHighlight] = useState<string | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const active = report.sections.find((section) => section.id === activeId) ?? report.sections[0];
  const updatedAt = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(report.sourceUpdatedAt));

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setQuery("");
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

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

  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return [];
    return report.sections.flatMap((section) => {
      const lines = section.body.split("\n").filter((line) => line.toLowerCase().includes(keyword));
      return lines.slice(0, 3).map((line) => ({ section, line: line.replace(/^[-\s]+/, "").slice(0, 150) }));
    }).slice(0, 12);
  }, [query]);

  const monthOptions = useMemo(() => {
    const counts = new Map<string, number>();
    report.highlights.forEach((item) => {
      const month = item.date.slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(month)) counts.set(month, (counts.get(month) ?? 0) + 1);
    });
    return [...counts.entries()]
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([value, count]) => ({
        value,
        count,
        label: `${value.slice(0, 4)}年${Number(value.slice(5, 7))}月`,
      }));
  }, []);

  const filteredHighlights = useMemo(
    () => dateFilter === "all"
      ? report.highlights
      : report.highlights.filter((item) => item.date.startsWith(dateFilter)),
    [dateFilter],
  );

  const chooseSection = (section: Section) => {
    setActiveId(section.id);
    setQuery("");
    window.history.replaceState(null, "", `#${section.id}`);
    document.getElementById("report-explorer")?.scrollIntoView({ behavior: "smooth" });
  };

  const chooseSubsection = (section: Section, subsection: Subsection) => {
    setActiveId(section.id);
    setQuery("");
    window.history.replaceState(null, "", `#${subsection.id}`);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(subsection.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  const findHighlightSection = (event: string) => (
    report.sections.find(
      (section) => section.title !== "本期重点摘要" && section.body.includes(event),
    ) ?? report.sections.find((section) => section.title === "本期重点摘要") ?? report.sections[0]
  );

  const overviewSection = report.sections.find((section) => section.title === "总览") ?? report.sections[0];

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
            <span className="meta-pill">面向 OS 平台部管理者、产品与研发</span>
            <span className="meta-pill">更新于 {updatedAt}</span>
          </div>
          <a className="hero-action" href="#full-report">浏览全部 {report.metrics.sections} 个章节 <span aria-hidden="true">↓</span></a>
        </div>
      </header>

      <div className="dashboard">
        <section className="metric-grid" aria-label="报告数据概览">
          <Metric value={report.metrics.directions} label="累计判断主线" />
          <Metric value={report.metrics.highlights} label="本期重点事件" />
          <Metric value={report.metrics.sections} label="报告主板块" />
          <Metric value={report.metrics.sources} label="文档来源链接" />
        </section>

        <section className="reading-guide" aria-labelledby="reading-guide-title">
          <div>
            <p className="section-kicker">READING GUIDE</p>
            <h2 id="reading-guide-title">本期阅读指南</h2>
            <p>先看累计判断，把握方向；再看本期重点，识别变化；最后按需进入完整报告核对证据与业务分析。</p>
          </div>
          <div className="reading-path" aria-label="推荐阅读顺序">
            <button type="button" onClick={() => chooseSection(overviewSection)}><span>01</span>累计判断</button>
            <a href="#weekly-highlights"><span>02</span>本期重点</a>
            <a href="#full-report"><span>03</span>完整报告</a>
          </div>
        </section>

        <section className="search-hub" aria-labelledby="search-title">
          <div className="search-heading">
            <div>
              <p className="section-kicker">SEARCH THE REPORT</p>
              <h2 id="search-title">搜索全部报告</h2>
            </div>
            <p>支持能力、产品、厂商、场景和待确认问题</p>
          </div>
          <label className="search-box search-box-prominent">
            <span aria-hidden="true">⌕</span>
            <input
              ref={searchRef}
              aria-label="搜索全部报告"
              placeholder="搜索全双工、TTS、端侧、儿童模式……"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query ? (
              <button className="clear-search" type="button" onClick={() => setQuery("")} aria-label="清空搜索">×</button>
            ) : <kbd>/</kbd>}
          </label>
          {query && (
            <div className="search-results search-results-prominent" aria-live="polite">
              <p className="result-count">找到 {results.length} 条相关内容</p>
              {results.length ? results.map((result, index) => (
                <button
                  className="search-result"
                  key={`${result.section.id}-${index}`}
                  onClick={() => chooseSection(result.section)}
                  type="button"
                >
                  <strong>{result.section.numeral}、{result.section.title}</strong>
                  <span>{result.line}</span>
                </button>
              )) : <div className="search-result search-empty">没有找到匹配内容，请尝试缩短关键词。</div>}
            </div>
          )}
        </section>

        <section id="core-signals">
          <p className="section-kicker">CORE SIGNALS</p>
          <div className="section-heading-row">
            <h2 className="section-title">当前四条变化主线</h2>
            <span className="section-note">累计判断框架</span>
          </div>
          <div className="direction-grid">
            {report.directions.map((direction) => (
              <article className="direction-card" key={direction.index}>
                <span className="direction-index">0{direction.index}</span>
                <h3>{direction.title}</h3>
                <p>{direction.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="weekly-highlights">
          <p className="section-kicker">WEEKLY HIGHLIGHTS</p>
          <div className="section-heading-row">
            <div>
              <h2 className="section-title">本期值得优先关注</h2>
              <p className="section-description">先扫读影响判断，按需展开来源并定位到完整报告。</p>
            </div>
            {monthOptions.length > 1 && (
              <div className="date-filters" aria-label="按月份筛选重点事件">
                <button className={dateFilter === "all" ? "active" : ""} type="button" onClick={() => setDateFilter("all")}>
                  全部 <span>{report.highlights.length}</span>
                </button>
                {monthOptions.map((option) => (
                  <button
                    className={dateFilter === option.value ? "active" : ""}
                    key={option.value}
                    type="button"
                    onClick={() => setDateFilter(option.value)}
                  >
                    {option.label} <span>{option.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="highlight-grid">
            {filteredHighlights.map((item) => {
              const itemKey = `${item.event}-${item.date}`;
              const isExpanded = expandedHighlight === itemKey;
              const targetSection = findHighlightSection(item.event);
              return (
              <article className={`highlight-card ${isExpanded ? "expanded" : ""}`} key={itemKey}>
                <div className="highlight-meta"><span>{item.type}</span><time>{item.date}</time></div>
                <h3>{item.event}</h3>
                <p className="highlight-impact">{item.impact}</p>
                <div className="tag-row" aria-label="关键词">
                  {item.keywords.split(/[、，,]/).map((keyword) => (
                    <span className="tag" key={keyword}>{keyword.trim()}</span>
                  ))}
                </div>
                <button
                  className="expand-button"
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedHighlight(isExpanded ? null : itemKey)}
                >
                  {isExpanded ? "收起详情" : "查看详情"}<span aria-hidden="true">{isExpanded ? "↑" : "↓"}</span>
                </button>
                {isExpanded && (
                  <div className="highlight-detail">
                    <p><strong>主要来源</strong>{item.source}</p>
                    <button type="button" onClick={() => chooseSection(targetSection)}>
                      在“{targetSection.title}”中查看 <span aria-hidden="true">→</span>
                    </button>
                  </div>
                )}
              </article>
            )})}
          </div>
        </section>

        <section className="report-section" id="full-report">
          <p className="section-kicker">FULL REPORT</p>
          <div className="section-heading-row report-heading">
            <div>
              <h2 className="section-title">完整报告</h2>
              <p className="section-description">包含文档说明、累计判断、重点摘要，以及行业、产品、技术、竞品和内部进展。</p>
            </div>
            <span className="section-note">共 {report.metrics.sections} 个章节</span>
          </div>
        <div className="explorer" id="report-explorer">
          <nav className="side-nav" aria-label="报告章节">
            <p>REPORT INDEX · {report.metrics.sections} CHAPTERS</p>
            <div className="primary-nav-list">
              {report.sections.map((section) => (
                <button
                  className={`nav-button ${section.id === active.id ? "active" : ""}`}
                  key={section.id}
                  onClick={() => chooseSection(section)}
                  type="button"
                  aria-current={section.id === active.id ? "page" : undefined}
                >
                  {section.numeral}、{section.title}
                </button>
              ))}
            </div>
            {active.subsections.length > 0 && (
              <div className="sub-nav" aria-label={`${active.title}二级导航`}>
                <span>本章目录</span>
                {active.subsections.map((subsection) => (
                  <button
                    className={subsection.level === 3 ? "sub-nav-button nested" : "sub-nav-button"}
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

          <div className="content-panel">
            <article className="article-card">
              <h2>{active.numeral}、{active.title}</h2>
              <div
                className="markdown-body"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(active) }}
              />
            </article>
          </div>
        </div>
        </section>

        <p className="footer-note">内容同步自 {report.sourceName} · Markdown 为唯一事实源 · GitHub Pages 静态发布</p>
      </div>
      {showBackToTop && (
        <button className="back-to-top" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="返回页面顶部">
          <span aria-hidden="true">↑</span><small>顶部</small>
        </button>
      )}
    </main>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return <article className="metric-card"><strong>{value}</strong><span>{label}</span></article>;
}
