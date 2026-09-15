# 语音交互与 AI 人机交互行业动态 · GitHub Pages

本项目把 `content/行业动态追踪.md` 自动转换为适合浏览与汇报的静态网页。Markdown 是唯一内容源，网页只负责展示，不需要重复维护正文。

## 内容链路

```text
新闻增量核验与归档
        ↓
行业动态 Markdown（唯一事实源）
        ↓  scripts/sync-content.mjs
网页结构化数据
        ↓
管理者摘要 + 趋势主线 + 本期重点 + 分章节正文 + 全文检索
```

## 日常使用

1. 继续编辑 `content/行业动态追踪.md`。
2. 安装依赖：`pnpm install`。
3. 启动网页：`pnpm dev`。
4. 生成交付版本：`pnpm build`，产物位于 `dist/`。

`dev` 和 `build` 执行前都会自动同步 Markdown。若源文件改名或迁移，可设置 `SOURCE_MARKDOWN` 为新的路径。

> ⚠️ **禁止在本仓库执行 `git stash`。** 在 Windows + PortableGit 环境下可能损坏 `.git` 元数据且难以恢复；需要暂存改动时，改用临时分支或复制源文件。详见 `AGENTS.md`「禁止事项」。

## 发布到 GitHub Pages

1. 将本目录推送到 GitHub 仓库的 `main` 分支。
2. 在仓库 `Settings → Pages → Build and deployment` 中选择 `GitHub Actions`。
3. 每次推送到 `main` 后，`.github/workflows/deploy-pages.yml` 会自动构建和发布网页。

当前发布地址：`https://fengyunnnn.github.io/ai-frontier-tracker/`。

> ⚠️ **迁移说明（2026-09-15 起）**：本仓库的公开历史中包含早期未脱敏文本，已决定**重建一个干净仓库**（`ai-frontier-tracker-public`）承载公开内容，旧仓库随后转为 **Archive**（只读、标注不再更新）。迁移完成后：
>
> - 线上地址将由 `https://fengyunnnn.github.io/ai-frontier-tracker/` 变为新仓库对应的 Pages 地址，**上述旧链接将失效**；
> - 仓库内容（Markdown 内容源、同步脚本、网页代码）保持一致，`main` 分支的提交历史不连续（新仓库为单次初始提交）；
> - 迁移期间以本仓库 `CHANGELOG.md` 记录的实际状态为准。

## 版本记录

网页能力的已发布内容、下一版本规划和趋势状态启用原则统一记录在 `CHANGELOG.md`。规划项在实际交付前保留在“待发布”区，完成部署后再填写正式版本号和发布日期。

## 维护规范

- `AGENTS.md`：人工与 AI 均需遵守的项目边界。
- `docs/ARCHITECTURE.md`：数据流、文件职责和依赖方向。
- `docs/CONTENT_SCHEMA.md`：Markdown 标题、日期、字段和内部进展格式。
- `CONTRIBUTING.md`：内容、视觉、交互、数据格式和发布的操作流程。
- `.github/pull_request_template.md`：每次变更的提交前检查清单。

核心判断口诀：改“说什么”就改 Markdown；改“怎么排列和操作”就改 TSX；改“长什么样”就改 CSS；改“如何识别数据”才改同步脚本。

## 校验命令

- `pnpm test`：检查 Markdown 是否成功生成网页数据。
- `pnpm lint`：检查代码规范。
- `pnpm build`：执行完整生产构建。

## 主要文件

- `scripts/sync-content.mjs`：Markdown 解析与字段提取。
- `content/行业动态追踪.md`：唯一内容源。
- `CHANGELOG.md`：网页版本、规划和重要规则变化记录。
- `app/content.generated.ts`：自动生成的数据文件，请勿手工编辑。
- `app/trend-explorer.tsx`：网页信息架构与交互。
- `app/globals.css`：视觉样式与响应式布局。
- `AGENTS.md`：不可破坏的长期维护边界。
- `docs/CONTENT_SCHEMA.md`：Markdown 内容契约。
- `docs/ARCHITECTURE.md`：项目架构说明。
- `CONTRIBUTING.md`：修改、校验与发布 SOP。
