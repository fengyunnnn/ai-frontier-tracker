# 行业动态追踪端到端契约

> 文档状态：阶段 0 冻结版  
> 适用项目：行业动态追踪静态网页  
> 适用链路：外部网页 → `ai-frontier-tracker` → Markdown → 同步脚本 → 生成数据 → React 页面 → 用户浏览器  
> 说明：本文定义目标契约，不表示相关代码、内容和自动化已经完成。现状与目标不一致时，以“已知缺口”登记，不允许下游静默补造。

## 1. 目的与边界

本文把历史对话中的 UI Contract、Content Contract、Skill Output Contract 和 Input Contract 合并为一个可查阅、可追溯的端到端契约，用于后续阶段 1—7 的设计、开发、内容治理、测试和发布验收。

本文只定义接口，不承担以下职责：

- 不记录具体一期行业事实；
- 不替代 `docs/CONTENT_SCHEMA.md` 中当前已经生效的 Markdown 解析规范；
- 不修改 `scripts/sync-content.mjs` 的现有行为；
- 不要求人工编辑 `app/content.generated.ts`；
- 不把目标字段误写为已经实现的能力。

### 1.1 状态标记

| 标记 | 含义 |
|---|---|
| 已有 | 当前项目、内容契约或 Skill V4 已存在对应能力 |
| 目标 | 四层契约要求达到的最终状态 |
| 缺口 | 契约已要求，但当前链路尚未稳定提供 |
| 回退 | 兼容旧内容的显示方式，不可替代上游补齐 |
| 阻断 | 缺失后不得进入下一层或不得发布 |

### 1.2 阶段 1—7 统一编号

后续文档统一使用以下阶段编号：

1. 页面层目标落地；
2. 存量内容适配与章节摘要决策；
3. Skill Output Contract 对齐；
4. Input Contract 输入包规范化；
5. 同步与契约校验补齐；
6. 端到端试运行；
7. GitHub Pages 正式发布与复盘。

## 2. 倒推链路全景图

本契约以最终网页消费为终点，从 UI 向上游倒推，不允许从现有代码的偶然实现反向削弱目标契约。

```text
用户浏览器
  │
  │ 重点摘要卡片 / 情报卡片 / 章节列表 / 搜索结果
  ▼
第一层：UI Contract
  │ 需要稳定消费的字段、必填性、缺失回退
  ▼
app/content.generated.ts
  │ 自动生成的数据载体，禁止手工编辑
  ▼
scripts/sync-content.mjs
  │ 只负责按契约解析与传输，不负责创造业务事实
  ▼
第二层：Content Contract
  │ 七列表格 / 详细条目 / 稳定锚点 / 章节摘要
  ▼
content/行业动态追踪.md
  │ 唯一事实源
  ▼
第三层：Skill Output Contract
  │ 22 个事件内容字段 + 2 个流程决策 + 4 个章节字段
  ▼
ai-frontier-tracker
  │ 扫描、去重、核验、分类、判断、增量写入建议
  ▼
第四层：Input Contract
  │ 包级上下文 + 结构化候选事件 + 原始来源与证据
  ▼
外部网页、官方文档、论文、代码仓库及其他可核验来源
```

### 2.1 每层关键产出物

| 层级 | 关键产出物 | 消费方 | 核心检查 |
|---|---|---|---|
| UI Contract | 四类组件字段表 | 页面开发、UI 验收 | 必需字段是否被稳定消费 |
| Content Contract | Markdown 固定位置与格式 | 同步脚本、编辑者 | 字段是否位于可解析位置 |
| Skill Output Contract | 事件对象、章节动作 | Markdown 增量生成 | 事实、分析和流程决策是否分离 |
| Input Contract | 输入包、候选事件、证据 | Skill | 所有结论是否能追溯原始信息 |

## 3. 第一层：UI Contract

### 3.1 通用规则

1. UI 只消费生成数据，不成为事实数据的第二来源。
2. 必需字段缺失时，应优先在生成前暴露；回退只用于兼容历史内容。
3. UI 可以计算展示属性，例如 `href`、结果数量和截断文本，但不得推断来源、日期、竞争层级或问题归因。
4. 标题、摘要和标签的视觉截断不改变源内容，也不产生新的事实字段。
5. 详细正文中的事实、证据边界和来源不能因卡片精简而删除。

### 3.2 重点摘要卡片

| UI 逻辑字段 | 当前/目标数据载体 | 必填 | 缺失回退 | 缺失处理 |
|---|---|---:|---|---|
| `event_title` | `highlight.event` | 是 | 无 | 阻断生成或发布 |
| `event_type` | `highlight.type` | 是 | `待分类`仅用于预览 | 发布前补齐 |
| `keywords_ordered` | `highlight.keywords` | 是 | 空标签区 | 警告；卡片仍可显示 |
| `impact_summary` | `highlight.impact` | 是 | 无 | 阻断发布 |
| `source_display` | `highlight.source` | 是 | `来源待补充` | 阻断发布 |
| `publish_date` | `highlight.date` | 是 | `日期待核验` | 阻断发布 |
| `stable_anchor` | `highlight.detailId` | 是 | 无 | 阻断生成；必须指向唯一条目 |
| `detail_href` | 由 `stable_anchor` 计算为 `#<anchor>` | 是（派生） | 无 | 锚点检查失败即阻断 |

展示规则：

- 标题、影响判断、标签数量由 CSS 控制视觉密度；源字段不得为适应卡片而丢失事实边界。
- 标签按 `keywords_ordered` 原顺序展示，卡片默认只露出前两个，其余信息仍保留在内容源。
- 整张卡片只保留一个指向详细条目的语义入口，避免重复按钮和弹层。

### 3.3 情报卡片

| UI 逻辑字段 | 当前/目标数据载体 | 必填 | 缺失回退 | 缺失处理 |
|---|---|---:|---|---|
| `stable_anchor` | `intelligenceItem.id` | 是 | 无 | 阻断条目发布 |
| `report_section` | `intelligenceItem.sectionTitle` | 是 | 无 | 阻断生成 |
| `period` | `intelligenceItem.period` | 是 | `持续观察` | 允许兼容，记录警告 |
| `detail_title` | `intelligenceItem.title` | 是 | 无 | 阻断发布 |
| `conclusion_summary` | `intelligenceItem.summary` | 是 | `进入条目查看事实、判断边界与后续动作。` | 兼容回退；发布前宜补齐 |
| `terminals` | `intelligenceItem.terminals` | 是 | 空数组 | 警告；不可由 UI 推断 |
| `capabilities` | `intelligenceItem.capabilities` | 是 | 空数组 | 警告；不可由 UI 推断 |
| `competitors` | `intelligenceItem.competitors` | 否 | 空数组 | 允许缺失 |
| `attributions` | `intelligenceItem.attributions` | 是 | `待归因` | 显式暴露治理缺口 |
| `competition_level` | `intelligenceItem.level` | 是 | `待分层` | 显式暴露治理缺口 |
| `full_body` | `intelligenceItem.body` | 是 | 无 | 阻断发布 |
| `verification_status` | 详细正文中的核验状态；未来可结构化 | 是（内容） | `待核验` | 未核验内容不得伪装为已核验 |
| `source_links` | 详细正文来源字段；未来可结构化 | 是（内容） | 无 | 正式条目缺来源则阻断 |

展示规则：

- 默认显示标题、结论摘要、竞争层级、归因和少量维度标签。
- 完整事实、证据边界、来源及建议动作在详细条目中查看。
- `待归因`、`待分层`、`待核验`是显式状态，不得由 UI 隐藏为正常完成态。

### 3.4 章节列表与完整报告导航

| UI 逻辑字段 | 当前/目标数据载体 | 必填 | 缺失回退 | 缺失处理 |
|---|---|---:|---|---|
| `section_id` | `section.id` | 是 | 无 | 阻断生成 |
| `section_numeral` | `section.numeral` | 是 | 无 | 固定八章校验失败即阻断 |
| `section_title` | `section.title` | 是 | 无 | 固定名称校验失败即阻断 |
| `chapter_summary` | 目标为 `section.summary`；当前不存在 | 目标必填 | 当前可临时显示“进入本章查看完整内容与证据。” | 已知结构缺口，阶段 2 决策 |
| `subsections` | `section.subsections` | 否 | 空列表 | 允许无二/三级标题 |
| `content_headings` | `section.contentHeadings` | 否 | 空列表 | 有条目时必须稳定 |
| `full_body` | `section.body` | 是 | 无 | 阻断生成 |

说明：当前页面从章节正文第一条较长文本临时计算摘要。这只是兼容行为，不构成 `chapter_summary` 已闭环，也不能作为长期内容契约。

### 3.5 搜索结果

| UI 逻辑字段 | 来源/派生方式 | 必填 | 缺失回退 | 缺失处理 |
|---|---|---:|---|---|
| `result_section_id` | `section.id` | 是 | 无 | 对应章节缺失则丢弃结果并报错 |
| `result_section_numeral` | `section.numeral` | 是 | 无 | 阻断 |
| `result_section_title` | `section.title` | 是 | 无 | 阻断 |
| `result_heading_id` | 最近的 `contentHeading.id` | 否 | 跳转章节根部 | 允许 |
| `result_heading_title` | 最近的 `contentHeading.title` | 否 | 仅显示章节标题 | 允许 |
| `result_excerpt` | 从 `section.body` 的原文行截取 | 是（派生） | 不生成该条结果 | 不得改写为新事实 |
| `result_href` | 由章节或标题锚点计算 | 是（派生） | 章节根锚点 | 必须可跳转 |
| `searchable_text` | 标题与正文的规范化文本 | 是（内部派生） | 无 | 只用于匹配，不直接展示 |

## 4. 第二层：Content Contract

`content/行业动态追踪.md` 是唯一事实源。现行硬规则仍以 `docs/CONTENT_SCHEMA.md` 为准；本节补充四层契约所需的字段级对应关系。

### 4.1 固定章节结构

```markdown
一、文档说明
二、总览
三、本期重点摘要
四、行业动态
五、产品动态
六、技术革新
七、竞品与标杆公司动态
八、公司内部进展
```

一级章节名称、顺序和唯一性属于结构硬规则。

### 4.2 重点摘要七列表格

```markdown
| 事件 | 类型 | 关键词 | 一句话影响判断 | 来源 | 发布时间 | 详细分析 |
|---|---|---|---|---|---|---|
| 示例事件标题 | 技术与模型 | ASR、多人交互 | 示例影响判断 | 示例机构官网 | 2026-09-07 | [查看详情](#example-event) |
```

| UI 字段 | Markdown 位置 |
|---|---|
| `event_title` | 第 1 列“事件” |
| `event_type` | 第 2 列“类型” |
| `keywords_ordered` | 第 3 列“关键词”，顺序即显示优先级 |
| `impact_summary` | 第 4 列“一句话影响判断” |
| `source_display` | 第 5 列“来源” |
| `publish_date` | 第 6 列“发布时间” |
| `stable_anchor` | 第 7 列链接目标 `#stable-anchor` |

### 4.3 详细事件条目

```markdown
#### 详细事件标题 {#example-event}
情报维度：终端=电视大屏、机顶盒；能力=ASR、内容搜索与播放；竞对=示例竞品；归因=体验问题、资源/商务问题；层级=L1-生存层
判断状态：持续跟踪
标签：#ASR #家庭场景

1. 结论摘要：示例结论，仅说明格式，不代表真实行业事实。
2. 事实与变化：……
3. 核心机制或能力：……
4. 证据与边界：……
5. 对 OS 平台部的影响：……
6. 建议动作：……
7. 来源：https://example.invalid/official
发布时间：2026-09-07
核验状态：已核验 / 待核验
```

字段位置：

| Skill/UI 字段 | Markdown 位置 | 当前解析状态 |
|---|---|---|
| `detail_title` | `####` 标题文本 | 已有 |
| `stable_anchor` | `#### 标题 {#stable-anchor}` | 已有；重点条目必需 |
| `terminals` | `情报维度`中的“终端” | 已有 |
| `capabilities` | `情报维度`中的“能力” | 已有 |
| `competitors` | `情报维度`中的“竞对” | 已有，可省略 |
| `attributions` | `情报维度`中的“归因” | 已有，缺失回退“待归因” |
| `competition_level` | `情报维度`中的“层级” | 已有，缺失回退“待分层” |
| `conclusion_summary` | 正文第一条“结论摘要” | 内容目标；当前脚本仍从正文首个长句提取 |
| `fact_and_change` | “事实与变化” | 已有内容位置 |
| `evidence_boundary` | “证据与边界” | 已有内容位置 |
| `business_impact` | “对 OS 平台部的影响” | 已有内容位置 |
| `next_action` | “建议动作” | 已有内容位置 |
| `source_links` | “来源” | 已有内容位置，尚未独立结构化 |
| `publish_date` | “发布时间” | 已有内容位置，尚未独立结构化到情报对象 |
| `verification_status` | “核验状态” | 已有内容位置，尚未独立结构化到情报对象 |

### 4.4 周期和章节归属

```markdown
四、行业动态

## 2026-09-07—2026-09-13

#### 示例条目 {#example-event}
```

| 字段 | Markdown 位置 |
|---|---|
| `report_section` | 条目所在固定一级章节 |
| `period` | 条目前最近的 `##` 或 `###` 周期标题 |

### 4.5 章节摘要预留格式

目标格式：章节一级标题后、首个二级标题前，使用唯一一行引用块。

```markdown
四、行业动态

> 章节摘要：本章聚焦……

## 2026-09-07—2026-09-13
```

状态说明：

- 当前 Markdown 尚未系统提供该字段；
- 当前同步脚本没有生成 `section.summary`；
- 当前页面只能从正文临时截取首个长句；
- 阶段 2 必须二选一：正式补齐四层链路，或从目标 UI 中取消章节摘要必填要求；
- 在该决策完成前，不得宣称章节摘要已闭环。

## 5. 第三层：Skill Output Contract

### 5.1 事件级 22 个内容字段

下表中的 22 个字段是可写入内容的事件数据字段。`highlight_eligible`和`duplicate_action`属于流程控制决策，单列于 5.2，不计入 22 个内容字段。

| # | 字段 | 类型/格式 | 必填 | 来源约束 | 输出用途 |
|---:|---|---|---:|---|---|
| 1 | `event_title` | 字符串 | 是 | 基于已核验事件主体与动作 | 重点摘要标题 |
| 2 | `detail_title` | 字符串 | 是 | 可比卡片标题更完整，不增加未核验事实 | 详细条目标题 |
| 3 | `stable_anchor` | `/^[a-z0-9][a-z0-9-]*$/` | 是 | 基于事件稳定身份；发布后不随措辞变化 | 表格与正文连接 |
| 4 | `event_type` | 受控分类字符串 | 是 | 根据主事件性质确定唯一主类 | 重点摘要类型 |
| 5 | `keywords_ordered` | 有序字符串数组 | 是 | 最重要关键词在前，不凭 UI 重排 | 标签与扫读 |
| 6 | `impact_summary` | 一句话字符串 | 是 | 事实基础上的影响判断，标清不确定性 | 重点摘要影响 |
| 7 | `conclusion_summary` | 一句话字符串 | 是 | 结论先行，不等于事实复述 | 情报卡片摘要 |
| 8 | `report_section` | 固定章节名 | 是 | 一个事件只有一个主归属章节 | Markdown 插入位置 |
| 9 | `period` | `YYYY-MM-DD—YYYY-MM-DD`或稳定观察标题 | 是 | 来自扫描窗口或文档既有周期 | 周期分组 |
| 10 | `terminals` | 字符串数组 | 是 | 来自事件适用终端；未知时空数组并解释 | 多维筛选 |
| 11 | `capabilities` | 字符串数组 | 是 | 来自事件实际能力域 | 多维筛选 |
| 12 | `competitors` | 字符串数组 | 否 | 只列事件直接涉及对象 | 多维筛选 |
| 13 | `attributions` | 受控枚举数组 | 是 | 仅能力/体验/资源商务/交付/待归因 | 问题归因 |
| 14 | `competition_level` | 单一受控枚举 | 是 | L1/L2/L3/待分层 | 竞争分层 |
| 15 | `fact_and_change` | 字符串或段落数组 | 是 | 可追溯 `confirmed_facts`与变化证据 | 正文事实层 |
| 16 | `evidence_boundary` | 字符串或段落数组 | 是 | 区分官方声称、外部证据、未知和反证 | 正文证据层 |
| 17 | `business_impact` | 字符串或段落数组 | 是 | 映射家庭、运营商、终端或 OS 平台 | 正文分析层 |
| 18 | `next_action` | 字符串或动作数组 | 是 | 只能提出验证、观察、讨论或协作建议 | 正文行动层 |
| 19 | `source_display` | 字符串 | 是 | 可识别机构或官方渠道名称 | 重点摘要来源 |
| 20 | `source_links` | URL 对象数组 | 是 | 至少一条可追溯来源；优先一手 | 正文来源 |
| 21 | `publish_date` | `YYYY-MM-DD` | 是 | 优先官方发布时间，按输入回退链处理 | 日期显示与排序 |
| 22 | `verification_status` | `已核验`/`待核验`及说明 | 是 | 由证据完整性决定，不得默认已核验 | 发布门禁 |

### 5.2 两个流程控制决策

| 字段 | 类型 | 必填 | 作用 |
|---|---|---:|---|
| `highlight_eligible` | 布尔值 + 理由 | 是 | 决定是否进入本期重点摘要，不改变详细条目是否保留 |
| `duplicate_action` | `新增`/`更新既有条目`/`仅补来源`/`排除重复` | 是 | 决定增量写入方式，防止重复事件 |

### 5.3 章节级 4 个字段

| # | 字段 | 类型/格式 | 必填 | 作用 | 当前状态 |
|---:|---|---|---:|---|---|
| 1 | `chapter_summary` | 一句话或短段落 | 条件必填 | 概括本章本期主要变化，不罗列全部事件 | 缺口 |
| 2 | `chapter_summary_action` | `新增`/`更新`/`保持`/`不适用` | 是 | 控制是否触碰既有章节摘要 | 缺口 |
| 3 | `chapter_insert_position` | 章节名 + 周期标题 + 锚点 | 是 | 指定最小增量插入位置 | 需补强 |
| 4 | `overview_update_action` | `更新`/`保持` + 理由 | 是 | 只有趋势发生实质变化时更新总览 | 需补强 |

### 5.4 Skill 输出样例

以下只示范格式，不代表真实行业事件：

```yaml
event_title: 示例机构发布家庭语音能力更新
detail_title: 示例机构发布面向电视大屏的家庭语音能力更新
stable_anchor: example-home-voice-update
event_type: 产品与能力
keywords_ordered: [电视大屏, ASR, 播放闭环]
impact_summary: 示例影响判断，实际发布时必须由来源和证据支持。
conclusion_summary: 示例结论，需明确事实、边界及业务含义。
report_section: 产品动态
period: 2026-09-07—2026-09-13
terminals: [电视大屏]
capabilities: [ASR, 内容搜索与播放]
competitors: []
attributions: [待归因]
competition_level: 待分层
fact_and_change: [示例事实占位]
evidence_boundary: [仅示范格式，尚无真实证据]
business_impact: [待基于事实分析]
next_action: [补齐官方来源后再决定是否收录]
source_display: 示例机构官网
source_links:
  - label: 官方公告
    url: https://example.invalid/official
publish_date: 2026-09-07
verification_status: 待核验
highlight_eligible:
  value: false
  reason: 仅为格式样例，无真实证据
duplicate_action: 新增
```

## 6. 第四层：Input Contract

### 6.1 包级字段

| 字段 | 类型/格式 | 必填 | 说明 |
|---|---|---:|---|
| `package_id` | 唯一字符串 | 是 | 一次扫描运行的稳定编号 |
| `scan_window` | 对象 | 是 | 包含时区、开始、结束和趋势回看窗口 |
| `discovered_at` | ISO 8601 时间 | 是 | 输入包生成时间，不等于事件发布时间 |
| `target_document` | 路径字符串 | 是 | 固定指向内容源，不得指向生成文件 |
| `audience` | 字符串数组 | 是 | 管理者、产品、研发或其他明确受众 |
| `focus` | 字符串数组或范围说明 | 是 | 本次扫描范围和优先关注方向 |
| `candidates` | 候选事件数组 | 是 | 至少可以为空数组；不得以 URL 列表代替 |

`scan_window`结构：

```yaml
scan_window:
  timezone: Asia/Shanghai
  start: 2026-09-07T00:00:00+08:00
  end: invocation_time
  trend_baseline: preceding_28_days
```

### 6.2 候选事件 22 个原始字段

| # | 字段 | 必填 | 允许为空 | 说明 |
|---:|---|---:|---:|---|
| 1 | `candidate_id` | 是 | 否 | 输入包内唯一编号 |
| 2 | `subject` | 是 | 否 | 事件主体或机构 |
| 3 | `product_or_topic` | 是 | 否 | 产品、模型、政策、标准或主题 |
| 4 | `event_action` | 是 | 否 | 发布、更新、开源、招标、下线等动作 |
| 5 | `official_publish_date` | 否 | 是 | 官方页面标注日期 |
| 6 | `event_date` | 否 | 是 | 事件实际发生日期 |
| 7 | `discovery_date` | 是 | 否 | 扫描发现日期 |
| 8 | `primary_sources` | 是 | 否 | 官方公告、文档、论文或代码仓库 |
| 9 | `secondary_sources` | 否 | 是 | 媒体、分析或聚合线索 |
| 10 | `confirmed_facts` | 是 | 可为空 | 已被来源直接支持的事实 |
| 11 | `official_claims` | 否 | 是 | 官方宣传或自述，不能自动当作独立事实 |
| 12 | `external_evidence` | 否 | 是 | 独立测试、第三方数据或实际体验 |
| 13 | `changes_vs_previous` | 否 | 是 | 相对旧版本或既有记录的变化 |
| 14 | `known_limits` | 否 | 是 | 已知限制、适用范围和未知条件 |
| 15 | `possible_terminals` | 否 | 是 | 输入侧候选，不代表最终分类 |
| 16 | `possible_capabilities` | 否 | 是 | 输入侧候选，不代表最终分类 |
| 17 | `possible_competitors` | 否 | 是 | 输入侧候选，不代表最终分类 |
| 18 | `problem_signals` | 否 | 是 | 能力、体验、资源商务或交付问题线索 |
| 19 | `business_relevance` | 否 | 是 | 与家庭、运营商、终端和 OS 平台的初步关联 |
| 20 | `existing_matches` | 否 | 是 | 与现有文档疑似重复的锚点或标题 |
| 21 | `questions_to_verify` | 否 | 是 | 进入正式写入前需回答的问题 |
| 22 | `priority_reason` | 否 | 是 | 为什么值得优先处理的初始理由 |

### 6.3 完整输入包样例

以下数据完全用于格式示范，域名为无效示例域名，不构成行业事实：

```yaml
package_id: weekly-2026-W37-demo
scan_window:
  timezone: Asia/Shanghai
  start: 2026-09-07T00:00:00+08:00
  end: invocation_time
  trend_baseline: preceding_28_days
discovered_at: 2026-09-10T10:00:00+08:00
target_document: content/行业动态追踪.md
audience: [OS平台部管理者, 产品, 研发]
focus: [语音交互, AI人机交互, 家庭终端, 运营商业务]
candidates:
  - candidate_id: demo-001
    subject: 示例机构甲
    product_or_topic: 示例家庭语音产品
    event_action: 发布能力更新
    official_publish_date: 2026-09-08
    event_date: 2026-09-08
    discovery_date: 2026-09-10
    primary_sources:
      - label: 官方公告
        url: https://example.invalid/a
    secondary_sources: []
    confirmed_facts: [示例事实，实际使用时必须逐条对应来源]
    official_claims: [示例官方表述]
    external_evidence: []
    changes_vs_previous: [示例变化]
    known_limits: [尚无独立体验证据]
    possible_terminals: [电视大屏]
    possible_capabilities: [ASR]
    possible_competitors: []
    problem_signals: [待归因]
    business_relevance: [可能影响家庭语音入口]
    existing_matches: []
    questions_to_verify: [是否支持真实远场环境]
    priority_reason: 涉及核心家庭终端场景
  - candidate_id: demo-002
    subject: 示例机构乙
    product_or_topic: 示例接口规范
    event_action: 更新技术规范
    official_publish_date: null
    event_date: 2026-09-09
    discovery_date: 2026-09-10
    primary_sources:
      - label: 官方文档
        url: https://example.invalid/b
    secondary_sources:
      - label: 聚合线索
        url: https://example.invalid/b-summary
    confirmed_facts: []
    official_claims: [示例规范声称]
    external_evidence: []
    changes_vs_previous: []
    known_limits: [官方发布时间缺失]
    possible_terminals: [机顶盒]
    possible_capabilities: [平台工程]
    possible_competitors: []
    problem_signals: [交付问题]
    business_relevance: [可能影响多省适配]
    existing_matches: [example-existing-anchor]
    questions_to_verify: [是否为正式生效版本, 是否与既有条目重复]
    priority_reason: 涉及交付标准变化
```

## 7. 四层字段矩阵

| 业务信息 | UI Contract | Content Contract | Skill Output Contract | Input Contract |
|---|---|---|---|---|
| 事件身份 | `event_title`、`detail_title`、`stable_anchor` | 表格第 1 列、四级标题及锚点 | 同名字段 | `subject`、`product_or_topic`、`event_action`、`candidate_id` |
| 分类 | `event_type`、章节、五维标签 | 表格类型、一级章节、情报维度行 | `event_type`、`report_section`、五维字段 | 事件主题与 `possible_*`、`problem_signals` |
| 时间 | `publish_date`、`period` | 表格/条目发布时间、周期标题 | `publish_date`、`period` | 三类日期与 `scan_window` |
| 重点判断 | `impact_summary` | 七列表格第 4 列 | `impact_summary`、`highlight_eligible` | `confirmed_facts`、`business_relevance`、`priority_reason` |
| 详细结论 | `conclusion_summary` | 条目“结论摘要” | `conclusion_summary` | 事实、变化、限制、业务关联 |
| 证据 | 正文与来源入口 | 事实、证据边界、来源、核验状态 | `fact_and_change`、`evidence_boundary`、来源、核验状态 | 一手/二手来源、官方声称、外部证据 |
| 业务意义 | 情报摘要和正文 | “对 OS 平台部的影响” | `business_impact` | `business_relevance` |
| 动作 | 详细正文 | “建议动作” | `next_action` | `questions_to_verify` |
| 章节摘要 | `chapter_summary` | 一级章节后的预留摘要行 | 4 个章节级字段 | 该章节入选事件集合 | 

## 8. 逐字段追溯表

| 网页字段 | Markdown 具体位置 | Skill 输出 | 输入来源 | 当前闭环状态 |
|---|---|---|---|---|
| 重点卡片标题 | 重点摘要第 1 列 | `event_title` | `subject` + `product_or_topic` + `event_action` | 契约闭环，执行待验证 |
| 重点卡片类型 | 重点摘要第 2 列 | `event_type` | 事件主题、动作和来源性质 | 契约闭环，执行待验证 |
| 重点卡片标签 | 重点摘要第 3 列 | `keywords_ordered` | 事实、候选终端/能力/竞对 | 契约闭环，执行待验证 |
| 重点影响判断 | 重点摘要第 4 列 | `impact_summary` | 已确认事实、变化、业务关联 | 契约闭环，执行待验证 |
| 来源显示名 | 重点摘要第 5 列 | `source_display` | `primary_sources`优先 | 契约闭环，执行待验证 |
| 发布时间 | 重点摘要第 6 列；条目元信息 | `publish_date` | 官方发布时间→事件日期→发现日期，并标明回退 | 契约闭环，语义需验证 |
| 详情入口 | 重点摘要第 7 列 | `stable_anchor` | `candidate_id` + 去重判断 | 当前锚点校验已有 |
| 情报条目标题 | 四级标题 | `detail_title` | 事件主体、产品和动作 | 契约闭环，执行待验证 |
| 主归属章节 | 固定一级章节 | `report_section` | 事件主变化类型 | 契约闭环，执行待验证 |
| 周期 | 条目前最近的周期标题 | `period` | `scan_window`与事件日期 | 当前已有兼容回退 |
| 终端 | 情报维度“终端” | `terminals` | `possible_terminals` + 核验事实 | 当前可解析；历史可能依赖补标 |
| 能力 | 情报维度“能力” | `capabilities` | `possible_capabilities` + 核验事实 | 当前可解析；历史可能依赖补标 |
| 竞对 | 情报维度“竞对” | `competitors` | `possible_competitors` + 核验事实 | 可选闭环 |
| 问题归因 | 情报维度“归因” | `attributions` | `problem_signals`、限制和业务链路 | 当前可解析；Skill需稳定输出 |
| 竞争层级 | 情报维度“层级” | `competition_level` | 业务相关性、准入要求、体验差异 | 当前可解析；Skill需稳定输出 |
| 情报摘要 | 条目第一条“结论摘要” | `conclusion_summary` | 已确认事实、变化、限制与业务意义 | 内容位置目标明确，解析仍为启发式 |
| 事实与变化 | 条目“事实与变化” | `fact_and_change` | `confirmed_facts`、`changes_vs_previous` | 内容闭环 |
| 证据边界 | 条目“证据与边界” | `evidence_boundary` | 官方声称、外部证据、已知限制 | 内容闭环 |
| 业务影响 | 条目“对 OS 平台部的影响” | `business_impact` | `business_relevance`及核验事实 | 内容闭环，内部事实需人工确认 |
| 下一步动作 | 条目“建议动作” | `next_action` | `questions_to_verify`、限制和业务影响 | 内容闭环 |
| 核验状态 | 条目“核验状态” | `verification_status` | 来源完整性与问题回答情况 | 内容有位置，尚未独立生成字段 |
| 搜索章节信息 | 一级章节和内容标题 | `report_section`、`detail_title` | 同上 | 当前由生成结构提供 |
| 搜索摘要 | 正文原文行 | 不新增业务字段 | `fact_and_change`等写入后的正文 | 派生闭环，不得改写事实 |
| 章节摘要 | 一级章节后预留引用行 | `chapter_summary` | 章节入选事件集合 | 未闭环 |

## 9. 契约接口原则

1. **上游未提供，不得下游补造。** 输入中没有日期、来源或事实时，Skill 必须输出缺失状态，Markdown、解析器和 UI 不得猜测。
2. **事实与判断分离。** 官方声称、已确认事实、独立证据、推断和建议必须保持边界。
3. **一条事件一个主归属。** 同一事件可以进入重点摘要，但详细正文只保留一个主章节和一个稳定锚点。
4. **稳定锚点不可随标题变化。** 发布后的 `stable_anchor`除纠错外不得更换。
5. **解析器只转换，不决策。** `scripts/sync-content.mjs`不得判断事件价值、业务归因或趋势等级。
6. **生成文件只读。** `app/content.generated.ts`只能由同步脚本生成。
7. **回退必须可见。** `待核验`、`待归因`、`待分层`不能被空字符串或看似确定的默认值掩盖。
8. **必需字段前置阻断。** 重点事件缺标题、影响、来源、日期或详情锚点时不得发布。
9. **最小增量写入。** 更新既有条目优先于新建重复条目；不得无原因改写历史段落。
10. **契约变更按依赖方向推进。** 契约 → Markdown 示例 → 同步脚本 → 页面消费 → 样式 → 测试。

## 10. 已知缺口清单

| 缺口 | 所在边界 | 风险 | 处理阶段 |
|---|---|---|---|
| 章节摘要无稳定 Markdown 字段及生成字段 | Content→Parser→UI | 页面摘要依赖正文启发式截取 | 阶段 2、5 |
| 四层契约此前只存在于对话 | 全链路 | 后续执行无法稳定引用 | 阶段 0；本文已补 |
| 页面层目标方案尚未执行 | Generated→UI | 当前消费者与目标 UI Contract 不完全一致 | 阶段 1 |
| 存量内容适配尚未执行 | Content | 历史标题、摘要、标签可能不适合目标卡片 | 阶段 2 |
| Skill 未稳定输出全部 22 字段 | Input→Skill→Content | 写入环节仍需人工拼接或猜测 | 阶段 3 |
| `highlight_eligible`和`duplicate_action`未机器校验 | Skill→Content | 可能误入重点或重复写入 | 阶段 3、5 |
| 输入包尚无稳定生成机制 | Web→Input | 仍可能退化为 URL 列表 | 阶段 4 |
| 情报来源、日期、核验状态尚未独立结构化到生成对象 | Content→UI | 卡片不能直接消费，只能在正文查看 | 阶段 5 条件评估 |
| 情报摘要仍由首个长句启发式提取 | Content→UI | 摘要可能不是结论 | 阶段 2、5 |
| 发布编排、部署确认和运行回执尚未落地 | Build→Pages | `git push`可能被误认为已上线 | 阶段 6、7 |

## 11. 文档使用说明

- **核心价值：** 用一份文档冻结“网页需要什么、内容怎样写、Skill 必须产出什么、输入必须提供什么”的完整字段边界。
- **与另外两份文档的关系：** 本文定义“是什么”；`WEEKLY_PUBLISH_RUNBOOK.md`定义“如何执行”；`ACCEPTANCE_CHECKLIST.md`定义“怎样证明完成”。
- **阶段 1—7 引用方式：** 每个阶段开始前确认本阶段涉及的字段和接口，开发或内容修改完成后使用第 8 节追溯表确认没有断链，再进入验收清单。
