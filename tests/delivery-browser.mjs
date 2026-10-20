import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
import { approvedData } from "./delivery-fixture.mjs";
const browser = await chromium.launch({ channel: "msedge", headless: true }),
  context = await browser.newContext({
    viewport: { width: 1600, height: 1080 },
    acceptDownloads: true,
  }),
  page = await context.newPage();
await context.addInitScript(() => {
  if (window.top !== window) return;
  if (!localStorage.getItem("cleaner-production-demo-v1"))
    localStorage.setItem(
      "cleaner-production-demo-v1",
      JSON.stringify({ enterprises: {}, demoPreset: "manual" }),
    );
});
const errors = [],
  checks = [],
  base = "http://127.0.0.1:5178/";
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400 && r.url().startsWith(base))
    errors.push(r.status() + " " + r.url());
});
async function go(path) {
  await page.goto(base + "#" + path);
  await page.waitForTimeout(200);
}
async function click(name, index = 0) {
  const buttons = await page.getByRole("button", { name, exact: true }).all(),
    visible = [];
  for (const b of buttons) if (await b.isVisible()) visible.push(b);
  if (!visible[index]) throw Error("Missing visible button: " + name);
  await visible[index].click();
}
async function fill(placeholder, value) {
  await page.getByPlaceholder(placeholder, { exact: true }).fill(value);
}
async function login(name) {
  await go("/login/" + (name.startsWith("ent") ? "enterprise" : "government"));
  await fill("请输入账号", name);
  await fill("请输入密码", "Demo@123");
  await click("登 录");
  await expect(page.locator(".admin-shell")).toBeVisible();
}
const state = () =>
  page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("cleaner-production-demo-v1")).enterprises
        .ent_01,
  );
async function upload(name, scope = page.locator(".n-modal")) {
  await scope.locator("input[type=file]").setInputFiles({
    name,
    mimeType: "text/plain",
    buffer: Buffer.from("前端验收测试材料：" + name),
  });
  await expect(scope.getByRole("button", { name, exact: true })).toBeVisible();
}
async function check(name, fn) {
  await fn();
  checks.push(name);
  console.log("PASS", name);
}
async function expertOpinion(text) {
  await fill("录入专家对方案的修改建议、已落实调整和复核结论", text);
  await page.getByRole("checkbox").check();
  await click("保存专家复核意见");
}
async function fileCheck(name) {
  await page.locator(".n-modal .n-input-number input").last().fill("0.38");
  await upload(name);
  await click("保存验收指标");
}
try {
  await login("ent_01");
  await page.evaluate(
    (d) =>
      localStorage.setItem(
        "cleaner-production-demo-v1",
        JSON.stringify({ enterprises: { ent_01: d }, demoPreset: "manual" }),
      ),
    approvedData(),
  );
  await page.reload();
  await expect(page.locator(".welcome")).toBeVisible();
  await check("获批基准、左侧方案和右侧对话、约束确认、推荐组合", async () => {
    await go("/app/enterprise?p=solution");
    await expect(page.locator(".scheme-studio")).toBeVisible();
    await fill(
      "例如：预算 100 万、停产 3 天、节水至少 10%",
      "预算 100 万，停产 3 天，节水至少 10%，优先节水",
    );
    await click("发送需求");
    expect((await state()).delivery.constraints.budget).toBe(200);
    await click("确认应用约束");
    expect((await state()).delivery.constraints.budget).toBe(100);
    await click("生成推荐方案");
    await click("选择此组合");
    await expect(
      page.getByText("当前方案 · 修订 R2", { exact: true }),
    ).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator(".n-message")).toHaveCount(0);
    await page.screenshot({
      path: "output/delivery-optimization.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    const heading = await page.locator(".enterprise-meta h1").boundingBox();
    expect(heading.width).toBeGreaterThan(150);
    expect(heading.height).toBeLessThan(90);
    await page.screenshot({
      path: "output/delivery-optimization-mobile.png",
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(392);
    await page.setViewportSize({ width: 1600, height: 1080 });
  });
  await check("人工修订、专家库选择、复核和方案首次报备", async () => {
    await click("进入专家修订与报备");
    await click("人工修订");
    await fill("请输入人工调整依据 / 专家建议", "专家建议明确巡检与监测责任");
    await click("保存");
    await click("选择或自选专家");
    await click("选择专家");
    await expertOpinion("已核实企业工况和修改说明，建议按当前组合实施。");
    await fill(
      "填写方案报备说明；如被退回，请逐项说明修改情况",
      "申请本轮方案报备，请审核专家复核后的方案。",
    );
    await click("提交方案报备");
    await click("确认报备");
    await expect
      .poll(async () => (await state()).delivery.status)
      .toBe("plan_submitted");
    expect(
      (await state()).delivery.planVersions[0].plan.items[0].reason,
    ).toContain("专家建议");
  });
  await check("上级查看报备版本、县级退回、省级只读", async () => {
    await login("gov_province");
    await go("/app/oa/ent_01?stage=delivery");
    await expect(page.getByText("企业方案报备", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "批准方案并进入实施考察", exact: true }),
    ).toHaveCount(0);
    await login("gov_renhuai");
    await go("/app/oa/ent_01?stage=delivery");
    await click("退回方案修改");
    await fill(
      "填写方案批准意见或需要修改的具体内容",
      "请补充专家资质依据和实施责任说明",
    );
    await click("确认方案处理");
    await expect
      .poll(async () => (await state()).delivery.status)
      .toBe("plan_returned");
  });
  await check("自选专家资质上传、修订后P2报备、P1保持原样", async () => {
    await login("ent_01");
    await go("/app/enterprise?p=solution");
    await click("专家修订与报备");
    await click("人工修订");
    await fill(
      "请输入人工调整依据 / 专家建议",
      "已按退回意见补充实施责任人与验收计量要求",
    );
    await click("保存");
    await expect(
      page.getByRole("button", { name: "提交方案报备", exact: true }),
    ).toBeDisabled();
    await click("选择或自选专家");
    await click("自选资质专家");
    await fill("填写自选专家姓名", "赵工");
    await fill("填写专家所属单位", "示例研究院");
    await fill(
      "填写职称、资质或相关审核经历",
      "高级工程师，清洁生产审核经历（测试）",
    );
    await click("保存自选专家");
    await expect(
      page.getByText("请上传自选专家的资质证明。", { exact: true }),
    ).toBeVisible();
    await upload("专家资质测试.txt");
    await click("保存自选专家");
    await expertOpinion("已复核责任人和计量安排，方案可实施。");
    await fill(
      "填写方案报备说明；如被退回，请逐项说明修改情况",
      "已按退回要求补充自选专家资质和责任安排",
    );
    await click("提交方案报备");
    await click("确认报备");
    await expect
      .poll(async () => (await state()).delivery.planVersions.length)
      .toBe(2);
    expect((await state()).delivery.planVersions[0].plan.items[0].reason).toBe(
      "专家建议明确巡检与监测责任",
    );
  });
  await check("方案批准安排考察期、持续录入整改与凭证", async () => {
    await login("gov_renhuai");
    await go("/app/oa/ent_01?stage=delivery");
    await click("批准方案并进入实施考察");
    await fill(
      "填写方案批准意见或需要修改的具体内容",
      "按报备方案实施并持续上传整改凭证",
    );
    await fill("填写方案批复文号", "方案演示批复-2026-02");
    await fill("开始日期 YYYY-MM-DD", "2026-10-16");
    await fill("结束日期 YYYY-MM-DD", "2027-02-01");
    await upload("方案批复测试.txt");
    await click("确认方案处理");
    await login("ent_01");
    await go("/app/enterprise?p=solution");
    await expect(
      page.getByText("本轮方案实施考察", { exact: true }),
    ).toBeVisible();
    const items = (await state()).delivery.planVersions.at(-1).plan.items;
    for (let i = 0; i < items.length; i++) {
      await click("录入整改", i);
      await page.getByLabel("当前整改进度", { exact: true }).fill("100");
      await fill(
        "填写已完成的整改内容、实施效果与下一步工作",
        items[i].name + "已完成施工与计量核验",
      );
      await upload("整改凭证" + (i + 1) + ".txt");
      await click("保存整改记录");
    }
    await expect
      .poll(async () => (await state()).delivery.records.length)
      .toBe(items.length);
    await page.screenshot({
      path: "output/delivery-implementation.png",
      fullPage: true,
    });
    await click("查看 1 份凭证");
    const dl = page.waitForEvent("download");
    await click("下载");
    expect((await dl).suggestedFilename()).toMatch(/整改凭证/);
    await page.keyboard.press("Escape");
  });
  await check("验收材料与指标自查，未达标不能提交", async () => {
    await click("进入验收与报告");
    await expect(
      page.getByRole("button", { name: "提交上级验收", exact: true }),
    ).toBeDisabled();
    await fill("填写本轮相关批准文件名称与文号", "方案演示批复-2026-02");
    await upload(
      "验收申请测试.txt",
      page.locator(".attachment-picker").first(),
    );
    await fill(
      "说明方案实施效果、批准落实及本轮验收申请事项",
      "本轮方案已完成，申请现场验收。",
    );
    await click("添加验收指标");
    await fill("填写验收指标名称", "单位产品综合能耗");
    await fill("例如：tce/t、m³/t、mg/m³", "tce/t");
    await fill(
      "填写批准文件或标准名称、条款及统计口径",
      "本轮方案批准目标（测试）",
    );
    await page.getByLabel("验收目标值", { exact: true }).fill("0.4");
    await page.getByLabel("验收实测值", { exact: true }).fill("0.5");
    await upload("指标监测测试.txt");
    await click("保存验收指标");
    await expect(
      page.getByRole("button", { name: "提交上级验收", exact: true }),
    ).toBeDisabled();
    await click("修改");
    await page.getByLabel("验收实测值", { exact: true }).fill("0.38");
    await click("保存验收指标");
    await expect(
      page.getByRole("button", { name: "提交上级验收", exact: true }),
    ).toBeEnabled();
    await click("提交上级验收");
    await click("确认提交验收");
    await expect
      .poll(async () => (await state()).delivery.status)
      .toBe("acceptance_submitted");
  });
  await check("上级检查指导、验收退回、企业修订为A2", async () => {
    await login("gov_renhuai");
    await go("/app/oa/ent_01?stage=delivery");
    await click("检查指导并退回整改");
    await fill(
      "记录整改核验、凭证核对及现场检查结果",
      "现场查看计量与运行记录",
    );
    await fill("填写持续改进或进一步整改要求", "补充最终计量说明");
    await fill("填写通过验收或退回整改的具体结论", "请完善最终验收说明");
    await click("确认验收处理");
    await login("ent_01");
    await go("/app/enterprise?p=summary");
    await fill(
      "说明方案实施效果、批准落实及本轮验收申请事项",
      "已补充最终计量说明，申请复查。 <script>alert(1)</script>",
    );
    await click("提交上级验收");
    await click("确认提交验收");
    await expect
      .poll(async () => (await state()).delivery.acceptanceVersions.length)
      .toBe(2);
    expect(
      (await state()).delivery.acceptanceVersions[0].draft.conclusion,
    ).toBe("本轮方案已完成，申请现场验收。");
  });
  await check("验收批复、报告生成、实际内容下载与归档", async () => {
    await login("gov_renhuai");
    await go("/app/oa/ent_01?stage=delivery");
    await click("检查指导并通过验收");
    await fill(
      "记录整改核验、凭证核对及现场检查结果",
      "复查凭证与实测指标均符合本次批准要求",
    );
    await fill("填写持续改进或进一步整改要求", "保持计量记录并按季度跟踪");
    await fill("填写通过验收或退回整改的具体结论", "通过本轮验收（演示）");
    await fill("填写验收批复文号", "验收演示批复-2026-01");
    await upload("验收批复测试.txt");
    await click("确认验收处理");
    await login("ent_01");
    await go("/app/enterprise?p=summary");
    await click("生成本轮审核报告");
    await expect(
      page.locator('iframe[title="生成审核报告预览"]'),
    ).toBeVisible();
    const download = page.waitForEvent("download");
    await click("下载报告（HTML）");
    await (await download).saveAs("output/generated-audit-report.html");
    const html = fs.readFileSync("output/generated-audit-report.html", "utf8");
    expect(html).toContain("验收演示批复-2026-01");
    expect(html).toContain("0.38 tce/t");
    expect(html).toContain("整改凭证1.txt");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    await page.keyboard.press("Escape");
    await page.reload();
    await expect(
      page.getByRole("button", { name: "预览生成报告", exact: true }),
    ).toBeVisible();
    expect((await state()).delivery.status).toBe("reported");
    await page.screenshot({
      path: "output/delivery-acceptance.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      (await page.locator(".enterprise-meta h1").boundingBox()).height,
    ).toBeLessThan(90);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(392);
    await page.screenshot({
      path: "output/delivery-acceptance-mobile.png",
      fullPage: true,
    });
  });
  expect(errors).toEqual([]);
  fs.writeFileSync(
    "output/delivery-test-results.json",
    JSON.stringify({ passed: checks.length, checks, errors }, null, 2),
  );
  console.log("ALL " + checks.length + " DELIVERY CHECKS PASSED");
} catch (e) {
  await page.screenshot({
    path: "output/delivery-failure.png",
    fullPage: true,
  });
  fs.writeFileSync(
    "output/delivery-test-results.json",
    JSON.stringify({ checks, errors, failure: e.message }, null, 2),
  );
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
