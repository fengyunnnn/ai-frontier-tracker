# 行业动态追踪网页 · 项目交接文档

> 文档状态：当前交接基线  
> 更新日期：2026-09-14  
> 适用对象：Codex、WorkBuddy 及后续项目协作工具  
> 项目目录：`C:\Users\yunfeng3\Documents\Onboarding\industry-trends-web`

## 1. 先读结论

状态口径：本文档不记录实时分支状态。仓库当前状态一律以 `git status`、`git log`、`git rev-list` 的实际输出为准；本文档只保留“截至某日的核验基线提交”，用于说明阶段与发布归属。

这是一个部署到 GitHub Pages 的 React 静态行业资讯网页。Markdown 是唯一事实源，页面、脚本和生成文件均不得成为第二内容源。

以下为截至 2026-09-14 的核验基线，用于说明阶段与发布归属，**不作为实时状态**：

- 分支：`main`。
- 核验基线提交：`daf12f6 feat(ui): streamline industry trends reading experience`（阶段 1 页面层）。
- 阶段 0“契约落盘”已提交：`c03777b docs: add workflow contracts and project handoff`，四份 `docs/` 文档已纳入 Git。
- 阶段 1“页面层执行”已提交：`daf12f6`，`app/trend-explorer.tsx` 与 `app/globals.css` 已纳入 Git。
- 冻结基线前已运行 `pnpm check` 并通过（测试 4/4、Lint、TypeScript、生产构建）；生成文件 `app/content.generated.ts` 无漂移。
- 截至 2026-09-14，本地存在尚未推送的提交，因此**线上页面仍为早前版本**（详见第 9.3 节）。
- 阶段 2“内容层存量适配”尚未开始；基线已冻结，具备开始条件。
- 当前工作重心已调整为：信息源与内容方向确认、周度更新机制；页面层工作暂停。

> 实时状态检查：运行 `git status --short --branch` 与 `git log --oneline -8`。不要依赖本文档中的提交号判断“现在是否已推送”。

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

### 9.3 线上与远程核验基线（截至 2026-09-14）

以下结论通过 GitHub REST API 与线上产物只读核验得出，不依赖本地引用。它们是**某个时间点的核验结果**，不是实时状态；实时状态请以 `git status`、`git rev-list --left-right --count origin/main...HEAD` 与实际线上页面为准。

| 项目 | 核验结果（2026-09-14） |
|---|---|
| 远程 `main` HEAD | `26ef278b626dca80b0d2ee0fc21c6eca8746fb83`（"Upgrade report to competitive intelligence"，2026-09-09T09:23:54Z） |
| 最近的 Actions 运行 | run #6，提交 `26ef278`，结论 success（2026-09-09T09:24:09Z） |
| 线上页面 | `https://fengyunnnn.github.io/ai-frontier-tracker/` 返回 HTTP 200 |
| 线上构建来源 | bundle 内嵌 `sourceUpdatedAt: 2026-09-09T09:24:17.757Z`，与 run #6 吻合 |
| 线上版本判定 | 线上为 `26ef278` 的构建产物，含 `报告章节信息面板`（该字符串在阶段 1 中已删除），故确认为**提交 `26ef278` 的版本** |
| V1.3 能力是否上线 | **已上线**。线上含 `内容体量`、`展开全部`/`收起全部`、`能力总览`、`L1-生存层`/`L2-竞争层`/`L3-未来层`，以及 7 个稳定锚点 |
| 线上是否含阶段 1 页面层 | **否**。阶段 1 的 `多维情报筛选` 等标记在 `26ef278` 源码与线上产物中均不存在 |
| 线上锚点 | 7 个重点锚点齐全（`vibevoice-streaming-speaker-asr`、`samsung-vision-ai-companion-expansion`、`lg-thinq-ai-home-ecosystem`、`ai-governance-family`、`speech-agent-arena`、`firered-audio-speechlm`、`zte-home-ai-screen`），八个一级章节齐全 |
| 本地与远程关系 | 截至该日存在尚未推送的提交。**具体数量请用 `git rev-list --left-right --count origin/main...HEAD` 查询，不要在本文档中固化。** |

**一个重要事实纠正：** 早期判断曾认为“V1.3 未上线”。经核验这不成立——V1.3 的能力已由 `26ef278` 于 2026-09-09 部署上线（run #6 成功）。真正未上线的是**阶段 1 页面层**（`daf12f6`）。

**CHANGELOG 口径的成因：**

- `26ef278` 提交时，其自身的 CHANGELOG 仍是 `## 待发布`；
- `48c96b9` 把该标题改为 `## V1.3（2026-09-09）本次发布`，但该提交未推送，因此**远程仓库的 CHANGELOG 至今仍显示“待发布”**，而线上实际已包含这些能力；
- 也就是说，偏差存在于“远程 CHANGELOG 记录（待发布）”与“线上实际（已上线）”之间，而不是“已发布记录”与“未上线”之间。

**判定注意事项：** 判断“线上跑的是哪一版”必须以提交的**源文件**（`git show <rev>:app/trend-explorer.tsx`）与线上产物比对，不能只靠在压缩后的 bundle 里搜索类名或关键词。`metric-grid`、`primary-nav-list`、`direction-grid` 等类在 `26ef278` 中即已存在，阶段 1 是复用它们，因此这些字符串不能作为“阶段 1 已上线”的证据。

**推送的影响：**

- `48c96b9` 只修改 `CHANGELOG.md`。`scripts/sync-content.mjs` 仅读取 `content/行业动态追踪.md`，不读 `CHANGELOG.md`；工作流也不引用它。因此推送该提交**不改变线上页面内容**，但会让远程 CHANGELOG 与线上实际状态一致。
- 推送本身仍会触发一次完整的重新构建与重新部署（产物内容相同），因为工作流没有 paths 过滤。
- 真正使线上**页面**变化的是 `daf12f6`（阶段 1 页面层）。要让阶段 1 上线，必须推送 `daf12f6`。

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
11. **绝不在本仓库执行 `git stash`** —— Windows + PortableGit 下被中断会把 `.git` 元数据删进回收站（详见 §11.1）。
12. **`.git` 内出现 `*.lock` 时，先取证再清除** —— 确认 size 为 0、mtime 早于当前、且无 `git` 进程在跑，再删除；曾因 `.git` 从回收站恢复而带回 `index.lock`、`HEAD.lock`、`packed-refs.lock`、`objects/maintenance.lock` 四个陈旧锁，直接清除即可，但**必须先判断是不是真锁**。

### 11.1 已知事故：`.git` 被回收站删除后恢复（2026-09-14）

`git stash push` 在 Windows 上被 SIGTERM 中断，把 `.git` 的 `refs/`、pack 与 348 个 loose objects 删进了回收站，仓库报 “not a git repository”。恢复方法：解析回收站 `$I<id>`（8B 头 + 8B size + 8B FILETIME + 4B 路径长 + UTF-16LE 原路径）与 `$R<id>`，映射回 `.git` 原路径 → **先沙箱重建并用 `git fsck --full` 验证** → 再原子落地（落地前备份现场 `.git`）。17 个提交全部找回。

恢复的副作用：**回收站里同时带回了四个陈旧 `*.lock` 文件**，导致首次 `git add` 报 `index.lock: File exists`、首次 `git commit` 报 `HEAD.lock: File exists`。它们 size=0、mtime 早于事故时间，且当时无 `git` 进程，属陈旧锁，清除即可。

## 12. 下一位负责人确认清单

- [ ] 已阅读本交接文档及第 2 节列出的规则文件；
- [ ] 已用 `git status --short --branch`、`git log --oneline -8`、`git rev-list --left-right --count origin/main...HEAD` 亲自确认当前分支、提交与领先/落后状态，而非依赖本文档中的数字；
- [ ] 已确认阶段 0 文档与阶段 1 页面改动分别位于 `c03777b` 与 `daf12f6` 两个原子提交；
- [ ] 已确认当前任务属于阶段 2，且不会超范围修改 Schema、同步脚本或生成文件；
- [ ] 已明确本轮只由一个工具写入项目目录；
- [ ] 已在实质修改前保留可回退提交；
- [ ] 已在实质修改后运行对应验证并记录结果；
- [ ] 如涉及发布，已取得明确授权并完成线上冒烟验证。

## 13. 待负责人决策的事项

截至 2026-09-14，基线与本地验证均已就绪，以下事项需明确授权后才能执行：

1. **是否推送（仍未授权）**：本地存在尚未推送的提交，数量以 `git rev-list --left-right --count origin/main...HEAD` 为准（截至 2026-09-14 收尾时为 12）。推送会触发一次 Pages 重新部署；其中阶段 1 页面层（`daf12f6`）尚未上线，推送后将首次上线。**本轮三项内容整改已提交但同样未推送。**
2. **推送后的完整冒烟**：按第 9.2 节完成标准，需依次确认 Actions 成功、Pages 部署完成、线上页面可访问、至少一条本周重点及其稳定锚点可正常跳转。缺一项都不得宣称“已发布”。
3. **`CHANGELOG.md` 口径已修正（2026-09-14）**：V1.3 现按可核验事实记为已发布（2026-09-09，由 `26ef278` 部署）；阶段 1 页面层与四份 `docs/` 资产记入“待发布”区。远程仓库的 CHANGELOG 仍显示“待发布”，需推送 `48c96b9` 后才会与线上一致。
4. **已知非阻断警告**：生产构建提示主 JavaScript 文件约 747 kB、大于 500 kB 阈值。不影响构建与功能，但建议在单独任务中评估按需代码分割，不要在内容治理阶段顺带重构。
5. **已决策并落地（2026-09-14）**：三项内容整改已获授权并提交，见 §14.4——八章标题去后缀（含删除重复的跟踪字段小节）、13 条跨周条目塞回自然周、22 条补 `情报维度`。无需再次决策。

## 14. 当前工作重心（2026-09-14 起）

页面层工作已暂停。后续最高优先级为：

1. 信息源确认：明确一周扫描覆盖哪些外部来源、如何形成来源覆盖记录与盲区任务；
2. 内容方向确认：重点摘要准入门槛、五维情报字段的实际判定口径、章节摘要的产品决策；
3. 周度更新机制：把 `docs/WEEKLY_PUBLISH_RUNBOOK.md` 的 13 步落到可重复执行的流程；
4. 恢复本周 Markdown 与飞书版本的内容更新。

在阶段 2 内容适配与上述机制就绪前，不再进行版式与页面结构改动。

### 14.1 已落地：信息源与内容方向 V2（提交 `0b2f9ef`）

1—3 项已有第一阶段成果，落在 `docs/INFORMATION_SOURCES_AND_CONTENT_DIRECTION.md`（V2 规范，10 节）：

- **双轨制**：轨道 A 交互体验与 AI 前沿战略雷达、轨道 B 业务落地与产业约束雷达；
- **四条主内容线与权重**：交互体验与用户场景 30%—35%、AI 前沿与未来交互 25%—30%、竞品产品与生态 20%—25%、业务约束与产业落地 20%—25%；
- **四个证据标签**（交互设计／用户与场景／评测与证据／信任与合规）：**只写在详细条目正文**，不得写入 `情报维度` 的 `归因` 字段——该字段被 `tests/governance.test.mjs` 强校验为四值枚举；
- **信息源体系**：A 类固定源（按频率）／B 类专项源（四周轮换）／C 类线索源（仅发现），并与《双周系统性调研启动方案》的**来源等级 A/B/C/内部**明确区分（分组管频率、等级管权威性）；
- **16 个二级方向基准表（覆盖地图）**：此前缺失，现已补齐并给出四个盲区任务。补扫 09-09—09-14 后命中 11/16，连续未命中项集中于情绪语气、主动交互与信任、原生音频与副语言、泛智能硬件。

同批提交已把 09-09—09-14 的 5 条新增事件写入内容源（`content/行业动态追踪.md`），`pnpm check` 通过（测试 4/4，同步输出 8 sections、12 highlights）。**尚未推送。**

### 14.2 尚未落地（需继续推进）

- **五个判断位**（发生了什么／交互与用户影响／业务与产品影响／成熟度与证据边界／建议动作）：已在规范第 7 节定义，并在本期 5 条新条目中实际使用；存量条目尚未按该结构回改；
- **章节摘要**：目标契约要求 `chapter_summary`，现有 Markdown 与同步脚本仍未支持，属阶段 5 候选；
- **结构化字段**（证据标签、成熟度、主内容线作为可筛选字段）：需 Schema→Markdown→脚本→页面→测试全链路变更，见规范第 9.2 节。

### 14.3 已落地：时间分区改为自然周（2026-09-14）

**背景**：原先周期标题为混合跨度（6 天 / 7 天 / 13 天 / 37 天混用），既与 `docs/WEEKLY_PUBLISH_RUNBOOK.md` 第 2 节对“本周 = `Asia/Shanghai` 时区下本周一 00:00 起”的定义不一致，也让“本周新增”难以核对。

**决策口径**（已与负责人确认）：

1. **周边界 = 自然周**：周一 → 周日，与运行手册对齐，不再使用滚动 7 天窗口；
2. **全部重排**：四—七章历史周期一并按周切分，不保留旧跨度标题；
3. **跨周条目归入「持续观察」**：正文为跨周归纳、无单一发布时间的条目（趋势归纳／机制分析／准入约束基线）不强行塞入某周，按章集中在章末 `## 持续观察` 分区；日期分区只放有明确发布时间的离散事件；
4. **三章重点摘要按周分表**：每个自然周一张七列表，新周在前，`本期周期` 指向最新一周；
5. 第八章能力总览与七章「客户决策专题」保持原状（专题非时间分区）。

**落地结果**：

- 四—七章周期标题由混合跨度改为 7 天自然周，`## 持续观察` 吸收 13 条跨周条目（四章 8、六章 5）；
- 三章由单一混合表改为 5 张周表（09-14／09-07／08-31／08-24／08-17 起）；
- 41 条情报、12 条重点、19 个稳定锚点、19 行 `情报维度` **逐项等值校验通过**（脚本内置 `CHECK anchors/h4/情报维度 equal` 自检）；
- 章节契约不受影响：8 个固定一级章节各出现 1 次；`## 持续观察` 为普通二级标题，不参与 `periodHeadings` 强校验；
- 同步与门禁通过：`Synced … 8 sections, 12 highlights`；测试 4/4（含治理契约）；lint、`tsc --noEmit`、`vite build` 均通过；`intelligence=41`、`directions=4`、`sources=35`；
- **副作用说明**：非日期分区（`持续观察`／`客户决策专题`）在页面按 `period` 分组时同样以独立分区呈现，顺序由 Markdown 章节内出现次序决定，无需改动 `sync-content.mjs` 或页面组件。

### 14.4 已落地：三项内容整改（2026-09-14）

由负责人拍板，针对内容源做了三项整改，拆为三笔原子提交（均为单文件职责，未混入无关改动）：

| 提交 | 内容 | 文件 |
|---|---|---|
| `d03863e` | 八章二级标题去掉状态后缀，并删去重复的跟踪字段说明 | `content/行业动态追踪.md`、`app/content.generated.ts`、`docs/CONTENT_SCHEMA.md`、`tests/content-sync.test.mjs` |
| `2a856e3` | 13 条跨周条目按各自证据归入自然周，删除 `## 持续观察` 标题 | `content/行业动态追踪.md`、`app/content.generated.ts` |
| `84cbc98` | 为四—七章 22 条缺失条目补齐 `情报维度` | `content/行业动态追踪.md`、`app/content.generated.ts` |

**三项口径**：

1. **接受删除后缀**：`## 已有技术能力（存量材料）` → `## 已有技术能力`、`## 在研方向（待内部确认）` → `## 在研方向`，并删除 `## 待补充的跟踪字段` 小节及其上方说明段。**证据边界不受影响**——章首「内容边界」与「阅读说明」仍完整承载「存量材料 · 待内部确认」的口径（已逐条核对）；`docs/CONTENT_SCHEMA.md` §7 与 `tests/content-sync.test.mjs` 断言同步更新。
2. **塞回自然周**：13 条原先集中在章末 `## 持续观察` 的跨周归纳条目，逐条依据其正文引用事件（GPT-Live 08-03、Qwen-Audio-3.0 08-17、Samsung IFA 09-03/09-04、清朗专项 09-02、NVIDIA NeMo Voice Agent 08-06 等）的 `发布时间`／`来源` 归入对应自然周；`## 持续观察` 标题删除（计数 0）。四章 8 条、六章 5 条。
3. **补标**：22 条缺失 `情报维度` 的条目（四章 4、五章 7、六章 6、七章 5）逐条按正文内容补齐，复用既有词汇表（终端／能力／归因四值／层级 L1—L3），未新造术语。覆盖率 **19 → 41**，即四—七章每条情报条目均带该字段。

**验证**：三笔提交各自 `node --test` **4/4 通过**、`git diff --cached --check` 退出码 0；收尾门禁 `sync-content`／测试 4/4／lint／`tsc --noEmit`／`vite build` 全过（746.94 kB 属已知非阻断大包警告）。结构不变式：8 个固定一级章节各 1 次、86 条四级条目、19 个稳定锚点、41 行 `情报维度`、28 个周期标题、0 个 `持续观察`；`app/content.generated.ts` 在同步与构建后无漂移。

**溯源方法（值得复用）**：改动不是凭 diff 目测，而是**从 HEAD 重放三项脚本化编辑并要求与工作区逐字节相等**（`EXACT MATCH: True`），从而证明工作区差异恰为这三项，无夹带。归周与补标的中间态（stage1 → stage2 → stage3）均已落盘留档，stage2 → stage3 为**纯新增 22 行、零删除**。
