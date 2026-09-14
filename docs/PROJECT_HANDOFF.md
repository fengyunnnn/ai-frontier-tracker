# 行业动态追踪网页 · 项目交接文档

> 文档状态：当前交接基线  
> 更新日期：2026-09-14  
> 适用对象：Codex、WorkBuddy 及后续项目协作工具  
> 项目目录：`C:\Users\yunfeng3\Documents\Onboarding\industry-trends-web`

## 1. 先读结论

这是一个部署到 GitHub Pages 的 React 静态行业资讯网页。Markdown 是唯一事实源，页面、脚本和生成文件均不得成为第二内容源。

当前状态如下：

- 当前分支：`main`；基线冻结后的 HEAD：`daf12f6 feat(ui): streamline industry trends reading experience`（本文档的状态刷新为其后的一个文档提交，不改变代码与内容）。
- 阶段 0“契约落盘”已提交：`c03777b docs: add workflow contracts and project handoff`，四份 `docs/` 文档已纳入 Git。
- 阶段 1“页面层执行”已提交：`daf12f6`，`app/trend-explorer.tsx` 与 `app/globals.css` 已纳入 Git。
- 冻结基线前已运行 `pnpm check` 并通过（测试 4/4、Lint、TypeScript、生产构建）；生成文件 `app/content.generated.ts` 无漂移。
- 本地 `main` 领先远程 `origin/main` 3 个提交，**尚未推送**；本文档的状态刷新提交会使该数字变为 4。
- 线上 Pages 当前由 `26ef278` 构建，运行的是 V1.3 布局；**阶段 1 的页面层改动尚未上线**。
- 阶段 2“内容层存量适配”尚未开始；现在基线已冻结，具备开始条件。

## 2. 接手前的第一动作

先只读，不运行会触发同步或构建的命令。

```powershell
git status --short
git branch --show-current
git log --oneline -8
```

接着阅读以下文件：

1. `AGENTS.md`：不可破坏的维护边界；
2. `README.md`：项目用途、运行与发布说明；
3. `CONTRIBUTING.md`：内容、页面、数据格式与发布 SOP；
4. `docs/ARCHITECTURE.md`：数据流和文件职责；
5. `docs/CONTENT_SCHEMA.md`：当前生效的 Markdown 格式契约；
6. `docs/END_TO_END_CONTRACT.md`：目标四层契约与已知缺口；
7. `docs/WEEKLY_PUBLISH_RUNBOOK.md`：周度发布 13 步流程；
8. `docs/ACCEPTANCE_CHECKLIST.md`：阶段 1—7 的验收门槛；
9. 本文档：当前任务状态与下一步。

首次阅读阶段不要运行 `pnpm dev`、`pnpm build`、`pnpm check` 或 `pnpm run sync-content`；这些命令会执行内容同步，严格来说不属于零写入检查。

## 3. 项目目标与技术边界

### 3.1 项目用途

项目将《语音交互与 AI 人机交互的行业动态追踪》转换为可浏览、可搜索、可筛选、可按章节阅读的静态网页，服务 OS 平台部管理者、产品与研发人员。

研究内容必须从“行业新闻罗列”升级为可核验的竞争情报：既说明发生了什么，也说明客户为什么买单、问题属于能力/体验/资源商务/交付中的哪一类，以及对家庭终端、运营商业务和 OS 平台的下一步影响。

### 3.2 技术栈

- React 19 + TypeScript；
- Vite 静态构建；
- Node.js `>=22.13.0`；
- pnpm `11.19.0`；
- GitHub Actions 构建并发布 GitHub Pages；
- 无运行时后端、无数据库依赖、无复杂状态管理框架。

项目声明使用 pnpm。不要在日常维护中执行 `npm install`，以免同时维护 `package-lock.json` 和 `pnpm-lock.yaml` 造成无关差异。

### 3.3 端到端链路

```text
外部网页 / 官方公告 / 论文 / 代码仓库
        ↓
ai-frontier-tracker（扫描、去重、核验、分类和判断）
        ↓
content/行业动态追踪.md（唯一事实源）
        ↓
scripts/sync-content.mjs（解析与同步）
        ↓
app/content.generated.ts（自动生成，禁止手改）
        ↓
app/trend-explorer.tsx + app/globals.css（结构、交互与视觉）
        ↓
Vite build → dist/（自动生成，禁止手改）
        ↓
GitHub Actions → GitHub Pages
```

## 4. 文件职责与不可破坏边界

| 变更目标 | 允许修改的主要位置 | 不应采用的方式 |
|---|---|---|
| 修改事实、来源、日期、判断 | `content/行业动态追踪.md` | 在 TSX 或 CSS 中写死内容 |
| 修改页面结构、导航、搜索、筛选 | `app/trend-explorer.tsx` | 在生成文件中修补数据 |
| 修改颜色、字号、间距、卡片、响应式 | `app/globals.css` | 用 CSS 承载事实或业务规则 |
| 新增 Markdown 字段或解析规则 | Schema → Markdown → 脚本 → 页面 → 测试 | 先改生成文件或只改某一期内容 |
| 修改发布流程 | `.github/workflows/` + 相关文档 | 直接修改 `dist/` |

以下文件或目录禁止人工编辑：

- `app/content.generated.ts`
- `dist/`

其他硬规则：

- `content/行业动态追踪.md` 是唯一事实源；
- 固定八个一级章节不可静默增删或改名；
- 重点摘要固定为七列表格，必须链接到稳定锚点；
- 第四至第七章重点条目使用固定顺序的 `情报维度`；
- 内部进展没有有效内部证据时必须标记“待内部确认”；
- 不得用页面适配为理由删掉事实、来源、证据边界、问题归因或建议动作。

## 5. 当前 Git 与工作区状态

### 5.1 当前已跟踪改动

工作区已干净，无未提交改动。阶段 1 页面层改动已于 `daf12f6` 提交：

- `app/trend-explorer.tsx`
- `app/globals.css`

阶段 1 已完成的目标：

- 页面由“仪表盘/门户”调整为“资讯流优先”；
- 模块顺序为：数据概览 → 本期重点 → 趋势判断 → 全文搜索 → 多维情报筛选 → 完整报告；
- 重点资讯按具体日期分组；
- 每张重点卡片仅保留一个语义链接，标题、影响判断、查看分析提示均在同一入口内；
- 每张重点卡片最多显示两个标签；
- 筛选使用原生 `details` 与五个 `select`，默认折叠；
- 仅在筛选条件生效时展示情报结果；
- 搜索词在跳转正文后保留；
- 移动端一级目录可横向滚动，二级目录隐藏；
- 正文表格仅在自身区域横向滚动。

### 5.2 当前未跟踪文件

工作区已无未跟踪文件。以下文档已在 `c03777b` 中纳入 Git：

- `docs/END_TO_END_CONTRACT.md`
- `docs/WEEKLY_PUBLISH_RUNBOOK.md`
- `docs/ACCEPTANCE_CHECKLIST.md`
- `docs/PROJECT_HANDOFF.md`（本文档）

前三个是阶段 0 的长期契约资产，本文档是跨工具协作的当前状态记录。它们与阶段 1 页面改动已拆分为两个原子提交，未互相混入。

### 5.3 已执行的基线冻结顺序

已由负责人确认并执行，未使用 `git add .`：

```powershell
# 契约与交接文档：单独提交
git add docs/END_TO_END_CONTRACT.md docs/WEEKLY_PUBLISH_RUNBOOK.md docs/ACCEPTANCE_CHECKLIST.md docs/PROJECT_HANDOFF.md
git commit -m "docs: add workflow contracts and project handoff"
# → c03777b，4 files changed, 1692 insertions(+)

# 阶段 1 页面：单独提交
git add app/trend-explorer.tsx app/globals.css
git commit -m "feat(ui): streamline industry trends reading experience"
# → daf12f6，2 files changed, 556 insertions(+), 832 deletions(-)
```

提交前已运行：

```powershell
pnpm check        # 通过：测试 4/4、Lint、TypeScript、生产构建
git diff --check  # 通过
git diff --name-only
```

提交后已核对：

- `git status` 干净，无未跟踪文件；
- 两个新提交均未包含 `app/content.generated.ts`、`dist/` 或 `package-lock.json`；
- `app/content.generated.ts` 与 HEAD 仍完全一致（同步未产生漂移）；
- 预期阶段 1 提交前的已跟踪差异恰为：

```text
app/trend-explorer.tsx
app/globals.css
```

## 6. 阶段完成情况

| 阶段 | 状态 | 证据 / 说明 |
|---|---|---|
| 阶段 0：契约落盘 | 已完成并已提交 | `c03777b`，四份 `docs/` 文档纳入 Git |
| 阶段 1：页面层执行 | 已完成并已提交 | `daf12f6`，页面改动与验证已完成，见第 5.1 节 |
| 阶段 2：内容层执行 | 未开始 | 先治理重点摘要，再治理第四至第七章卡片入口 |
| 阶段 3：Skill Output Contract 对齐 | 未开始 | 仅在阶段 2 的真实缺口明确后开始 |
| 阶段 4：Input Contract 输入包规范化 | 未开始 | 目标是结构化候选事件，不是 URL 列表 |
| 阶段 5：同步与契约校验补齐 | 未开始 | 先确认前端字段是否不足，再决定是否扩 Schema |
| 阶段 6：端到端试运行 | 未开始 | 使用真实一周输入走通 13 步 |
| 阶段 7：GitHub Pages 发布与复盘 | 未开始 | 需要明确发布授权、推送和线上冒烟 |

## 7. 已记录的阶段 1 验证结论

以下结论来自阶段 1 完成时的本地验证记录。基线冻结前已于 2026-09-14 重跑，结论一致。

```text
pnpm check：通过（退出码 0）
内容契约测试：4/4 通过
Lint：通过
TypeScript：通过
生产构建：通过
```

重跑细节：

- 需将 `git` 与 pnpm（corepack shim）置于同一 `PATH` 中，否则 `tests/governance.test.mjs` 会因 `spawnSync git ENOENT` 失败——这是运行环境问题，不是项目缺陷。
- 重跑后 `app/content.generated.ts` 与 HEAD 仍完全一致，同步未产生漂移。

已验证视口：

| 视口 | 重点标题首屏露出 | 横向溢出 |
|---|---:|---|
| 1366×768 | 2 条 | 无 |
| 1024×768 | 2 条 | 无 |
| 768×1024 | 2 条 | 无 |
| 390×844 | 1 条及摘要 | 无 |

已验证关键行为：

- 7 张重点卡片均只含一个链接；
- 标签均限制为两个；
- 搜索词跳转正文后仍保留；
- 筛选默认无结果，选择条件后正常返回结果；
- 移动端一级目录横向滚动、二级目录隐藏；
- 展开全部模式下表格独立滚动，页面整体无横向滚动；
- 浏览器控制台无错误或警告。

已知非阻断警告：生产构建提示主 JavaScript 文件大于 500 kB。该问题不影响当前页面构建、功能和发布，但后续可单独评估按需代码分割；不要在内容治理阶段顺带重构它。

## 8. 阶段 2 的下一步计划：存量内容适配

阶段 2 的原则是：**只压缩卡片层内容，不削弱证据层内容。**

执行顺序必须为：

1. 本期重点摘要的 7 条；
2. 第四至第七章的情报卡片入口；
3. 完整报告正文的长段落；
4. 第八章公司内部进展。

每一批的最小流程：

```text
修改 Markdown
  ↓
pnpm run sync-content
  ↓
pnpm check
  ↓
桌面端与移动端预览
  ↓
检查 Markdown 与 generated diff
  ↓
单独提交
```

阶段 2 不应做的事：

- 不为适配卡片而改动稳定锚点；
- 不删除详细条目的来源、事实、证据边界、问题归因和建议动作；
- 不提前修改 `docs/CONTENT_SCHEMA.md`、`scripts/sync-content.mjs` 或 `app/content.generated.ts`；
- 不因为页面只展示两个标签而删除其余检索关键词；
- 不把内部事实安全边界改写成外部新闻语气。

章节摘要是已知契约缺口：当前目标契约要求 `chapter_summary`，但现有 Markdown 和同步脚本尚未完整支持。阶段 2 应先记录真实需求与页面消费缺口；只有证明现有字段不够用，才进入阶段 5 扩 Schema 和解析器。

## 9. 运行、验证与发布

### 9.1 常用命令

```powershell
# 同步 Markdown 到生成数据
pnpm run sync-content

# 本地开发；启动前会同步
pnpm dev

# 内容与治理测试
pnpm test

# 静态检查
pnpm lint

# 生产构建；构建前会同步
pnpm build

# 完整门禁
pnpm check
```

### 9.2 发布原则

- 推送 `main` 会触发 GitHub Actions 的 Pages 发布；
- 工作流为 `on: push: branches: [main]`，**没有 paths 过滤**，且设置 `cancel-in-progress: true`；任何推送都会触发一次完整的重新构建与重新部署，即使该提交不影响构建产物；
- 未提交、未推送的本地修改绝不等于线上已更新；
- 发布完成标准是：Actions 成功、线上页面可访问、至少一条本周重点及其详细锚点可正常打开；
- 未经明确发布授权，不执行推送或对外发布；
- 只有实际发布成功后，才更新 `CHANGELOG.md` 中的已发布记录。

当前远程仓库：`https://github.com/fengyunnnn/ai-frontier-tracker.git`

### 9.3 当前线上与远程实测状态（2026-09-14 核验）

以下结论通过 GitHub REST API 与线上产物只读核验得出，不依赖本地引用：

| 项目 | 实测结果 |
|---|---|
| 远程 `main` HEAD | `26ef278b626dca80b0d2ee0fc21c6eca8746fb83`（"Upgrade report to competitive intelligence"，2026-09-09T09:23:54Z） |
| 最近的 Actions 运行 | run #6，提交 `26ef278`，结论 success（2026-09-09T09:24:09Z） |
| 是否存在新提交的运行 | **不存在**。`48c96b9` 及本次两个新提交均无 Actions 运行记录 |
| 线上页面 | `https://fengyunnnn.github.io/ai-frontier-tracker/` 返回 HTTP 200 |
| 线上构建来源 | bundle 内嵌 `sourceUpdatedAt: 2026-09-09T09:24:17.757Z`，与 run #6 吻合 |
| 线上布局 | **V1.3 布局**：仍含 `本期阅读指南`、`多维情报检索`、`报告章节信息面板`、`推荐阅读顺序`、`按月份筛选重点事件`、`内容体量`、`跳转到详细分析`，以及 CSS 类 `date-filters`、`expand-button`、`reading-guide`、`reading-path`、`report-brief`、`section-card`、`section-density`、`sub-nav`、`nested`、`result-count` |
| 线上是否含阶段 1 | **否**。阶段 1 的 `多维情报筛选` 等标记在 `26ef278` 源码、线上产物中均不存在，仅存在于已提交的 `daf12f6` |
| 线上锚点 | 7 个重点锚点齐全（`vibevoice-streaming-speaker-asr`、`samsung-vision-ai-companion-expansion`、`lg-thinq-ai-home-ecosystem`、`ai-governance-family`、`speech-agent-arena`、`firered-audio-speechlm`、`zte-home-ai-screen`），八个一级章节齐全 |
| 本地相对远程 | 领先 3 个提交（`48c96b9`、`c03777b`、`daf12f6`），尚未推送 |

**判定注意事项：** 判断“线上跑的是哪一版”必须以提交的**源文件**（`git show <rev>:app/trend-explorer.tsx`）与线上产物比对，不能只靠在压缩后的 bundle 里搜索类名或关键词。`metric-grid`、`primary-nav-list`、`direction-grid` 等类在 `26ef278` 中即已存在，阶段 1 是复用它们，因此这些字符串不能作为“阶段 1 已上线”的证据。

**补推送的影响：**

- `48c96b9` 只修改 `CHANGELOG.md`（+3/−1）。`scripts/sync-content.mjs` 仅读取 `content/行业动态追踪.md`，不读 `CHANGELOG.md`；工作流也不引用它。因此补推送该提交**不改变线上页面内容**。
- 但如上所述，推送本身仍会触发一次完整的重新构建与重新部署（产物内容相同）。
- 真正使线上页面变化的是 `daf12f6`（阶段 1 页面层）。要让阶段 1 上线，必须推送 `daf12f6`，而不是只补 `48c96b9`。

## 10. 跨工具协作协议

### 10.1 共享目录规则

Codex 和 WorkBuddy 可以打开同一物理目录，但不要并发修改同一批文件。

建议工作节奏：

```text
接手者：读取本文档 + git status + 明确范围
        ↓
单一工具执行当前任务
        ↓
pnpm check + git diff 审查
        ↓
原子提交
        ↓
更新本文档中的阶段状态、风险和下一步
        ↓
另一工具接手
```

Git 是任务交接边界，不是两个工具之间复制文件的替代品。

### 10.2 规则、Skill 与 MCP

- 项目规则优先放在仓库内的 `AGENTS.md`、`CONTRIBUTING.md` 和 `docs/`，任一工具打开相同目录即可读取；
- 个人偏好和个人 Skill 放在各工具的私有配置中，不应污染项目仓库；
- `ai-frontier-tracker` Skill 迁移时，仅迁移自维护的 `SKILL.md`、模板和引用资料，不复制系统 Skill、缓存或插件目录；
- MCP 服务地址、用途和权限范围可以迁移；Token、Cookie、API Key 和 `.env` 内容必须在新工具中重新安全配置；
- 新工具连接 MCP 后，先执行只读能力测试，再允许写入动作。

### 10.3 给接手工具的启动提示

```text
请在不修改文件的前提下，阅读 docs/PROJECT_HANDOFF.md、AGENTS.md、
CONTRIBUTING.md、docs/ARCHITECTURE.md、docs/CONTENT_SCHEMA.md，
然后运行 git status --short。

请说明：当前阶段、未提交改动、不可破坏边界、当前任务的最小修改范围、
验证方式和需要人工确认的事项。

在我确认前，不要运行 pnpm dev、pnpm build、pnpm check、sync-content，
不要修改 app/content.generated.ts、dist/、内容源或发布配置。
```

## 11. 常见风险与避坑点

1. `pnpm dev`、`pnpm build`、`pnpm check` 均会触发同步，不能被当成严格只读命令。
2. `app/content.generated.ts` 的变化只能由同步脚本产生；发现异常要回到 Markdown 或脚本排查。
3. 不要执行 `git add .`；即使当前工作区已干净，后续提交仍应显式列出文件以保持原子性。
4. 不要把页面卡片截断视为内容治理完成；证据层必须保留在详细正文。
5. 不要提前为章节摘要等目标字段修改解析器；先完成前端消费确认。
6. 不要让两个工具同时编辑 `content/行业动态追踪.md`、`app/trend-explorer.tsx` 或 `app/globals.css`。
7. 不要把构建通过误写为“行业事实已核验”或“线上已发布”。
8. 不要在外部工具中复制私密 MCP 凭据、公司内部材料或用户会话记录。
9. 判断线上版本必须比对提交源文件与线上产物，不能只在压缩 bundle 里搜关键词。
10. 不要认为推送一个不影响构建产物的提交（如只改 `CHANGELOG.md`）“不会触发部署”——工作流无 paths 过滤，仍会重新构建并部署。

## 12. 下一位负责人确认清单

- [ ] 已阅读本交接文档及第 2 节列出的规则文件；
- [ ] 已确认当前分支、HEAD 和工作区状态（HEAD 在 `daf12f6` 之后还有一个文档提交，工作区干净，领先远程 4 个提交）；
- [ ] 已确认阶段 0 文档与阶段 1 页面改动分别位于 `c03777b` 与 `daf12f6` 两个原子提交；
- [ ] 已确认当前任务属于阶段 2，且不会超范围修改 Schema、同步脚本或生成文件；
- [ ] 已明确本轮只由一个工具写入项目目录；
- [ ] 已在实质修改前保留可回退提交；
- [ ] 已在实质修改后运行对应验证并记录结果；
- [ ] 如涉及发布，已取得明确授权并完成线上冒烟验证。

## 13. 待负责人决策的发布事项

基线与本地验证均已就绪，以下事项需明确授权后才能执行：

1. **是否推送**：本地领先远程 4 个提交（`48c96b9`、`c03777b`、`daf12f6` 及本文档的状态刷新提交），尚未推送。推送会触发一次 Pages 重新部署，并使阶段 1 首次上线。
2. **推送后的完整冒烟**：按第 9.2 节完成标准，需依次确认 Actions 成功、Pages 部署完成、线上页面可访问、至少一条本周重点及其稳定锚点可正常跳转。缺一项都不得宣称“已发布”。
3. **`CHANGELOG.md` 的发布记录核对**：`48c96b9` 已将该版本记为发布，但该提交尚未推送、线上也未更新。推送前应与负责人确认记录口径是否需要调整。
4. **已知非阻断警告**：生产构建提示主 JavaScript 文件约 689 kB、大于 500 kB 阈值。不影响构建与功能，但建议在单独任务中评估按需代码分割，不要在内容治理阶段顺带重构。
