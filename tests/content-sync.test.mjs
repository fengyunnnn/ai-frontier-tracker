import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  assert.match(generated, /"title": "已有技术能力（存量材料）"/);
  assert.match(generated, /\*\*能力总览\*\*/);
  assert.match(generated, /"title": "超拟人合成"/);
  assert.match(generated, /待内部确认/);
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
  assert.doesNotMatch(generated, /暂时无法在i讯飞文档外展示此内容/);
});
