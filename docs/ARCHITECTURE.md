# 项目架构与职责边界

## 1. 项目目标

本项目将《语音交互与 AI 人机交互行业动态追踪》Markdown 转换为可搜索、可筛选、可导航的静态网页，并通过 GitHub Pages 发布。

架构目标是保证三件事：

- 报告事实只有一个维护入口；
- 视觉、交互和解析规则彼此解耦；
- 每次内容更新都能重复生成并稳定发布。

## 2. 数据流

```text
content/行业动态追踪.md
        │ 唯一事实源
        ▼
scripts/sync-content.mjs
        │ 按内容契约解析
        ▼
app/content.generated.ts
        │ 自动生成，只读
        ▼
app/trend-explorer.tsx + app/globals.css
        │ 页面结构、交互与视觉
        ▼
Vite build
        ▼
dist/
        │ 自动生成，只读
        ▼
GitHub Actions → GitHub Pages
```

## 3. 文件职责

| 文件或目录 | 唯一职责 | 何时允许修改 |
|---|---|---|
| `content/行业动态追踪.md` | 事实、判断、来源、日期和报告章节 | 内容新增、修正或重组时 |
| `docs/CONTENT_SCHEMA.md` | Markdown 格式契约 | 字段、标题或日期规则变化前 |
| `scripts/sync-content.mjs` | 将 Markdown 转换为页面数据 | 内容契约变化时 |
| `app/content.generated.ts` | 同步脚本生成的页面数据 | 禁止手工修改 |
| `app/trend-explorer.tsx` | 页面结构、交互状态和组件组合 | 交互或信息架构变化时 |
| `app/globals.css` | 设计变量、视觉样式和响应式布局 | 视觉呈现变化时 |
| `index.html` | 浏览器标题、描述、图标和页面入口 | 网页元信息变化时 |
| `tests/` | 内容契约和生成结果的自动校验 | 新增或调整规则时 |
| `.github/workflows/deploy-pages.yml` | GitHub Pages 构建与发布 | 发布流程变化时 |
| `dist/` | 生产构建结果 | 禁止手工修改和提交 |
| `CHANGELOG.md` | 已发布版本的实际变化 | 完成发布后 |

## 4. 依赖方向

允许的依赖方向：

```text
内容契约 → Markdown → 同步脚本 → 生成数据 → 页面组件 → 样式
```

禁止反向依赖：

- 不根据某个 CSS 选择器决定事实字段；
- 不让 TSX 成为报告正文的第二份副本；
- 不在生成文件中修正 Markdown 错误；
- 不从 `dist/` 反向维护源代码。

## 5. 典型变更范围

| 需求 | 最小修改范围 |
|---|---|
| 更新一条行业动态 | Markdown |
| 新增时间周期或二级目录 | Markdown |
| 改颜色、字体、卡片或移动端布局 | CSS |
| 改导航、搜索、筛选或展开方式 | TSX + CSS |
| Highlights 新增字段 | 内容契约 + Markdown + 同步脚本 + TSX + CSS + 测试 |
| 修改发布分支或构建流程 | Workflow + 本文档 + CONTRIBUTING |

## 6. 发布边界

`main` 分支推送会触发 GitHub Actions：安装依赖、生成内容、构建 `dist/` 并发布到 GitHub Pages。仓库不提交 `dist/`，线上产物始终由相同源文件和相同构建流程生成。
