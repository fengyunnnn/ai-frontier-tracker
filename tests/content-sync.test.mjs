import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const generatedPath = new URL("../app/content.generated.ts", import.meta.url);

test("Markdown is transformed into the complete visual-site dataset", async () => {
  const generated = await readFile(generatedPath, "utf8");

  assert.match(generated, /语音交互与 AI 人机交互行业动态追踪/);
  assert.match(generated, /"sections":/);
  assert.match(generated, /"highlights":/);
  assert.match(generated, /"subsections":/);
  assert.match(generated, /"contentHeadings":/);
  assert.match(generated, /"intelligenceItems":/);
  assert.match(generated, /"detailId": "speech-agent-arena"/);
  assert.match(generated, /"id": "speech-agent-arena"/);
  assert.match(generated, /"title": "文档目的"/);
  assert.match(generated, /"title": "2026-08-24—2026-08-30"/);
  assert.match(generated, /"numeral": "七"/);
  assert.match(generated, /"numeral": "八"/);
  assert.match(generated, /"title": "重点摘要"/);
  assert.match(generated, /"id": "section-8"/);
  // 第八章「公司内部进展」按内容负责人决定复原（2026-09-15）。
  // 反向断言与章节无关：内部端点/错误码/压测标识经脱敏后必须保持为 0。
  // 为避免把内部标识写回公开仓库，精确样本清单放在 .gitignore 覆盖的 internal/ 下：
  // 本地存在时按清单逐个断言；CI 等无该文件的环境退化为下面的通用结构断言。
  assert.match(generated, /"title": "已有技术能力"/);
  assert.match(generated, /\*\*能力总览\*\*/);
  assert.match(generated, /"title": "超拟人合成"/);
  assert.match(generated, /存量材料/);
  let forbiddenTokens = [];
  try {
    const rawForbidden = await readFile(
      new URL("../internal/forbidden-public-tokens.txt", import.meta.url),
      "utf8",
    );
    // 逐行样本：跳过注释行与空行（此前把 `# …` 注释行也当成样本参与了比对）。
    forbiddenTokens = rawForbidden.split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
  } catch {
    forbiddenTokens = [];
  }
  // 归一后比对：NFKC（全角→半角）→ 小写 → 去所有空白。任一环节缺失都会整段漏检：
  // 2026-09-17 栽在大小写（清单里的小写样本漏检页面上的大写写法）；
  // 2026-09-18 栽在空格（清单里的样本带空格、正文里的写法不带空格，21 个样本原样扫描 0 命中，
  // 归一后命中 6 处）。只登记一种写法就等于给这个样本留了整条盲区。
  const normalizeToken = (text) => text.normalize("NFKC").toLowerCase().replace(/\s+/gu, "");
  // 扫描范围＝会被发布的站点文件：app/ 下全部文件，减去 .gitignore 忽略的路径。
  // 为什么减：app/ 里还留着 Next.js 时代的 page.tsx／layout.tsx（已被 .gitignore 忽略、
  // 不参与构建、不进入产物），它们里面出现组织名不属于公开面；不排除就会把这条门禁变成噪声。
  const gitignore = await readFile(new URL("../.gitignore", import.meta.url), "utf8");
  const ignoredPaths = new Set(gitignore.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("!") && !line.includes("*"))
    .map((line) => line.replace(/^\//, "")));
  const appDir = new URL("../app/", import.meta.url);
  const appFileNames = (await readdir(appDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => `app/${entry.name}`)
    .filter((relative) => !ignoredPaths.has(relative))
    .map((relative) => relative.slice("app/".length))
    .sort();
  assert.ok(appFileNames.length > 0, "app/ 下应有可扫描的产物文件");
  const appFileLines = [];
  for (const name of appFileNames) {
    const text = await readFile(new URL(name, appDir), "utf8");
    appFileLines.push({ name, lines: text.split(/\r?\n/).map(normalizeToken) });
  }
  for (const token of forbiddenTokens) {
    const needle = normalizeToken(token);
    assert.ok(needle.length > 0, `令牌清单里的「${token}」归一后为空，无法比对`);
    const hits = [];
    for (const file of appFileLines) {
      file.lines.forEach((line, index) => {
        if (line.includes(needle)) hits.push(`${file.name}:${index + 1}`);
      });
    }
    assert.deepEqual(hits, [],
      `脱敏回归：产物不应包含内部标识「${token}」（归一后命中 ${hits.length} 处：`
      + `${hits.slice(0, 10).join("、")}${hits.length > 10 ? " …" : ""}）\n`
      + "比对是归一后的（忽略空格／全角半角／大小写）：请把该样本的写法变体一并登记到清单，"
      + "并把公开面里的这些写法清除。");
  }
  // 通用结构断言（不写具体内部值）：内部 API 主机形态、压测内存口径。
  assert.doesNotMatch(generated, /(?:ws|http)s?:\/\/[a-z0-9.-]+\.(?:com|cn)\/v\d/);
  assert.doesNotMatch(generated, /内存(?:占用|使用)?超\s*\d{2,}\s*GB/);
  assert.match(generated, /Level 1｜生存层：准入与内容闭环/);
  assert.match(generated, /Level 2｜竞争层：自然交互与真实场景/);
  assert.match(generated, /Level 3｜未来层：任务编排与跨端智能/);
  assert.match(generated, /横向诊断轴｜先归因，再投入/);
  assert.match(generated, /"id": "coocaa-customer-decision"/);
  assert.match(generated, /"attributions": \[\s+"资源\/商务问题"/);
  assert.match(generated, /"level": "L1-生存层"/);
  assert.match(generated, /"capabilities": \[\s+"内容搜索与播放"/);
  assert.match(generated, /运营商招采与行业标准/);
  assert.match(generated, /海思机顶盒芯片公开规格/);
  assert.match(generated, /公开“内容开放”不等于获得语音直达播放权限/);
  const detailIds = [...generated.matchAll(/"detailId": "([a-z0-9-]+)"/g)].map(
    ([, detailId]) => detailId,
  );
  assert.ok(detailIds.length > 0, "at least one highlight detail anchor is required");
  for (const detailId of detailIds) {
    assert.match(generated, new RegExp(`"id": "${detailId}"`));
  }
  assert.doesNotMatch(generated, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(generated, /暂时无法在.{0,12}文档外展示此内容/);
});
