"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { report } from "./content.generated";

type Section = (typeof report.sections)[number];
type Subsection = Section["subsections"][number];
type ReadingMode = "single" | "all";

const searchScopes = [
  { id: "all", label: "全部内容", keywords: [] },
  { id: "capability", label: "能力", keywords: ["能力", "ASR", "TTS", "全双工", "多模态", "端侧", "声纹", "唤醒"] },
  { id: "product", label: "产品", keywords: ["产品", "电视", "大屏", "遥控器", "终端", "AI助手", "智能硬件"] },
  { id: "company", label: "厂商", keywords: ["公司", "厂商", "竞品", "OpenAI", "Google", "阿里", "腾讯", "字节", "中兴"] },
  { id: "scenario", label: "场景", keywords: ["场景", "家庭", "运营商", "儿童", "老人", "车载", "会议"] },
  { id: "open-question", label: "待确认", keywords: ["待确认", "需要确认", "需进一步", "仍需验证", "建议动作"] },
] as const;

type SearchScopeId = (typeof searchScopes)[number]["id"];

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

function cleanMarkdownLine(line: string) {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*>\s]+/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[*_`|]/g, "")
    .trim();
}

function getSectionSummary(section: Section) {
  const line = section.body
    .split("\n")
    .map(cleanMarkdownLine)
    .find((item) => item.length >= 18 && !item.startsWith("http"));
  return line ? `${line.slice(0, 96)}${line.length > 96 ? "…" : ""}` : "进入本章查看完整内容与证据。";
}

function getSectionKeywords(section: Section) {
  const text = `${section.title}\n${section.body}`;
  const candidates = ["全双工", "ASR", "TTS", "多模态", "家庭场景", "运营商", "产品", "技术", "竞品", "内部进展", "待确认"];
  return candidates.filter((keyword) => text.toLowerCase().includes(keyword.toLowerCase())).slice(0, 3);
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
  const [searchScope, setSearchScope] = useState<SearchScopeId>("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [expandedHighlight, setExpandedHighlight] = useState<string | null>(null);
  const [readingMode, setReadingMode] = useState<ReadingMode>("single");
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

  const searchIndex = useMemo(() => report.sections.flatMap((section) => {
    let currentSubsection: Subsection | undefined;
    let headingIndex = 0;
    return section.body.split("\n").flatMap((rawLine) => {
      const headingMatch = rawLine.match(/^(#{2,3})\s+(.+)$/);
      if (headingMatch) {
        currentSubsection = section.subsections[headingIndex];
        headingIndex += 1;
        return [];
      }
      const line = cleanMarkdownLine(rawLine);
      if (line.length < 8 || /^-+$/.test(line) || line.startsWith("http")) return [];
      return [{ section, subsection: currentSubsection, line, searchable: line.toLowerCase() }];
    });
  }), []);

  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const scope = searchScopes.find((item) => item.id === searchScope) ?? searchScopes[0];
    if (!keyword && scope.id === "all") return [];
    return searchIndex.filter((item) => {
      const matchesQuery = !keyword || item.searchable.includes(keyword);
      const matchesScope = scope.id === "all" || scope.keywords.some(
        (term) => item.searchable.includes(term.toLowerCase()),
      );
      return matchesQuery && matchesScope;
    }).slice(0, 24);
  }, [query, searchIndex, searchScope]);

  const groupedResults = useMemo(() => {
    const groups = new Map<string, { section: Section; items: typeof results }>();
    results.forEach((result) => {
      const group = groups.get(result.section.id) ?? { section: result.section, items: [] };
      group.items.push(result);
      groups.set(result.section.id, group);
    });
    return [...groups.values()];
  }, [results]);

  const sectionCards = useMemo(() => {
    const maximumLength = Math.max(...report.sections.map((section) => section.body.length), 1);
    return report.sections.map((section) => ({
      section,
      summary: getSectionSummary(section),
      keywords: getSectionKeywords(section),
      readingSize: Math.max(1, Math.round(section.body.length / 1000)),
      density: Math.max(8, Math.round((section.body.length / maximumLength) * 100)),
    }));
  }, []);

  const recommendedQuestions = useMemo(() => active.body
    .split("\n")
    .map(cleanMarkdownLine)
    .filter((line) => /待确认|需要确认|需进一步|仍需验证|建议动作|需要重点判断/.test(line))
    .filter((line, index, lines) => line.length >= 12 && lines.indexOf(line) === index)
    .slice(0, 4), [active]);

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
    setReadingMode("single");
    setQuery("");
    setSearchScope("all");
    window.history.replaceState(null, "", `#${section.id}`);
    document.getElementById("report-explorer")?.scrollIntoView({ behavior: "smooth" });
  };

  const chooseSubsection = (section: Section, subsection: Subsection) => {
    setActiveId(section.id);
    setReadingMode("single");
    setQuery("");
    setSearchScope("all");
    window.history.replaceState(null, "", `#${subsection.id}`);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(subsection.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

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
            {query || searchScope !== "all" ? (
              <button
                className="clear-search"
                type="button"
                onClick={() => { setQuery(""); setSearchScope("all"); }}
                aria-label="清空搜索和筛选"
              >×</button>
            ) : <kbd>/</kbd>}
          </label>
          <div className="search-scope-chips" aria-label="按内容类型筛选">
            {searchScopes.map((scope) => (
              <button
                className={searchScope === scope.id ? "active" : ""}
                key={scope.id}
                type="button"
                aria-pressed={searchScope === scope.id}
                onClick={() => setSearchScope(scope.id)}
              >
                {scope.label}
              </button>
            ))}
          </div>
          {(query || searchScope !== "all") && (
            <div className="search-results search-results-prominent" aria-live="polite">
              <div className="search-overview">
                <div>
                  <span>匹配速览</span>
                  <strong>{results.length}</strong>
                  <small>条相关内容</small>
                </div>
                <p>
                  覆盖 {groupedResults.length} 个章节
                  {groupedResults.length > 0 && `：${groupedResults.map((group) => group.section.title).join("、")}`}
                </p>
              </div>
              {groupedResults.length ? groupedResults.map((group) => (
                <section className="search-result-group" key={group.section.id}>
                  <button className="search-group-heading" type="button" onClick={() => chooseSection(group.section)}>
                    <span>{group.section.numeral}</span>
                    <strong>{group.section.title}</strong>
                    <small>{group.items.length} 条</small>
                  </button>
                  <div>
                    {group.items.map((result, index) => (
                      <button
                        className="search-result"
                        key={`${result.section.id}-${result.subsection?.id ?? "root"}-${index}`}
                        onClick={() => result.subsection
                          ? chooseSubsection(result.section, result.subsection)
                          : chooseSection(result.section)}
                        type="button"
                      >
                        {result.subsection && <strong>{result.subsection.title}</strong>}
                        <span>{result.line.slice(0, 170)}{result.line.length > 170 ? "…" : ""}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )) : <div className="search-result search-empty">没有找到匹配内容，请尝试缩短关键词或切换筛选类型。</div>}
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
              <p className="section-description">先通过信息面板判断章节价值，再选择单章阅读或展开全部内容。</p>
            </div>
            <span className="section-note">共 {report.metrics.sections} 个章节</span>
          </div>

          <section className="report-brief" aria-labelledby="report-brief-title">
            <div className="report-brief-copy">
              <p>REPORT SUMMARY</p>
              <h3 id="report-brief-title">报告摘要</h3>
              <strong>{report.subtitle}</strong>
              <span>观察周期：{report.coverage}</span>
            </div>
            <div className="report-brief-signals">
              {report.directions.map((direction) => (
                <button key={direction.index} type="button" onClick={() => chooseSection(overviewSection)}>
                  <span>0{direction.index}</span>
                  <strong>{direction.title}</strong>
                </button>
              ))}
            </div>
          </section>

          <div className="section-card-grid" aria-label="报告章节信息面板">
            {sectionCards.map((card) => (
              <button
                className={`section-card ${active.id === card.section.id ? "active" : ""}`}
                key={card.section.id}
                type="button"
                onClick={() => chooseSection(card.section)}
                aria-pressed={active.id === card.section.id}
              >
                <div className="section-card-topline">
                  <span>{card.section.numeral}</span>
                  <small>约 {card.readingSize} 千字</small>
                </div>
                <h3>{card.section.title}</h3>
                <p>{card.summary}</p>
                <div className="section-card-tags">
                  <span>{card.section.subsections.length} 个小节</span>
                  {card.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}
                </div>
                <div className="section-density" aria-label={`内容体量约占最长章节的 ${card.density}%`}>
                  <span style={{ width: `${card.density}%` }} />
                </div>
              </button>
            ))}
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
            <nav className="side-nav" aria-label="报告章节">
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

            {readingMode === "single" ? (
              <div className="content-panel">
                <article className="article-card">
                  <h2>{active.numeral}、{active.title}</h2>
                  <div
                    className="markdown-body"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(active) }}
                  />
                </article>
                {recommendedQuestions.length > 0 && (
                  <aside className="related-questions" aria-labelledby="related-questions-title">
                    <div>
                      <span>NEXT QUESTIONS</span>
                      <h3 id="related-questions-title">本章待继续确认</h3>
                    </div>
                    <ul>
                      {recommendedQuestions.map((question) => <li key={question}>{question}</li>)}
                    </ul>
                  </aside>
                )}
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
                        <p>{getSectionSummary(section)}</p>
                      </div>
                    </div>
                    <div
                      className="markdown-body"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(section) }}
                    />
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
