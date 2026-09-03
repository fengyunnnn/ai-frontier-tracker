"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { report } from "./content.generated";

type Section = (typeof report.sections)[number];

function renderMarkdown(content: string) {
  return marked.parse(content, { gfm: true, breaks: true }) as string;
}

export function TrendExplorer() {
  const initialSectionId = typeof window === "undefined"
    ? undefined
    : window.location.hash.replace("#", "");
  const [activeId, setActiveId] = useState(
    report.sections.some((section) => section.id === initialSectionId)
      ? initialSectionId
      : report.sections[1]?.id ?? report.sections[0]?.id,
  );
  const [query, setQuery] = useState("");
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

  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return [];
    return report.sections.flatMap((section) => {
      const lines = section.body.split("\n").filter((line) => line.toLowerCase().includes(keyword));
      return lines.slice(0, 3).map((line) => ({ section, line: line.replace(/^[-\s]+/, "").slice(0, 150) }));
    }).slice(0, 12);
  }, [query]);

  const chooseSection = (section: Section) => {
    setActiveId(section.id);
    setQuery("");
    window.history.replaceState(null, "", `#${section.id}`);
    document.getElementById("report-explorer")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="site-shell">
      <header className="hero">
        <div className="hero-inner">
          <p className="eyebrow">IFLYHOME OS · AI FRONTIER TRACKER</p>
          <h1>{report.title}</h1>
          <p className="hero-copy">{report.subtitle}</p>
          <div className="meta-row">
            <span className="meta-pill">观察周期：{report.coverage}</span>
            <span className="meta-pill">面向 OS 平台部管理者、产品与研发</span>
            <span className="meta-pill">更新于 {updatedAt}</span>
          </div>
          <a className="hero-action" href="#report-explorer">进入完整报告 <span aria-hidden="true">↓</span></a>
        </div>
      </header>

      <div className="dashboard">
        <section className="metric-grid" aria-label="报告数据概览">
          <Metric value={report.metrics.directions} label="累计判断主线" />
          <Metric value={report.metrics.highlights} label="本期重点事件" />
          <Metric value={report.metrics.sections} label="报告主板块" />
          <Metric value={report.metrics.sources} label="文档来源链接" />
        </section>

        <section>
          <p className="section-kicker">CORE SIGNALS</p>
          <h2 className="section-title">当前四条变化主线</h2>
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

        <section>
          <p className="section-kicker">WEEKLY HIGHLIGHTS</p>
          <h2 className="section-title">本期值得优先关注</h2>
          <div className="highlight-grid">
            {report.highlights.map((item) => (
              <article className="highlight-card" key={`${item.event}-${item.date}`}>
                <div className="highlight-meta"><span>{item.type}</span><time>{item.date}</time></div>
                <h3>{item.event}</h3>
                <p>{item.impact}</p>
                <div className="tag-row" aria-label="关键词">
                  {item.keywords.split(/[、，,]/).map((keyword) => (
                    <span className="tag" key={keyword}>{keyword.trim()}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="explorer" id="report-explorer">
          <nav className="side-nav" aria-label="报告章节">
            <p>REPORT INDEX</p>
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
          </nav>

          <div className="content-panel">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                ref={searchRef}
                aria-label="搜索报告全文"
                placeholder="搜索全双工、TTS、端侧、儿童模式……"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <kbd>/</kbd>
            </label>

            {query && (
              <div className="search-results" aria-live="polite">
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
                )) : <div className="search-result">没有找到匹配内容</div>}
              </div>
            )}

            <article className="article-card">
              <h2>{active.numeral}、{active.title}</h2>
              <div
                className="markdown-body"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(active.body) }}
              />
            </article>
          </div>
        </section>

        <p className="footer-note">内容同步自 {report.sourceName} · Markdown 为唯一事实源 · GitHub Pages 静态发布</p>
      </div>
    </main>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return <article className="metric-card"><strong>{value}</strong><span>{label}</span></article>;
}
