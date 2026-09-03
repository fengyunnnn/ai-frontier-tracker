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

## 发布到 GitHub Pages

1. 将本目录推送到 GitHub 仓库的 `main` 分支。
2. 在仓库 `Settings → Pages → Build and deployment` 中选择 `GitHub Actions`。
3. 每次推送到 `main` 后，`.github/workflows/deploy-pages.yml` 会自动构建和发布网页。

当前发布地址：`https://fengyunnnn.github.io/ai-frontier-tracker/`。

## 版本记录

网页能力的已发布内容、下一版本规划和趋势状态启用原则统一记录在 `CHANGELOG.md`。规划项在实际交付前保留在“待发布”区，完成部署后再填写正式版本号和发布日期。

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
