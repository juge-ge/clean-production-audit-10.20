import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 1600, height: 1080 },
  acceptDownloads: true,
});
await context.addInitScript(() => {
  if (window.top !== window) return;
  if (!localStorage.getItem("cleaner-production-demo-v1"))
    localStorage.setItem(
      "cleaner-production-demo-v1",
      JSON.stringify({ enterprises: {}, demoPreset: "manual" }),
    );
});
const page = await context.newPage(),
  errors = [],
  checks = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400 && r.url().startsWith("http://127.0.0.1"))
    errors.push(`${r.status()} ${r.url()}`);
});
const base = "http://127.0.0.1:5178/";
async function go(path) {
  await page.goto(base + "#" + path);
  await page.waitForTimeout(200);
}
async function login(username) {
  await go(
    "/login/" + (username.startsWith("ent") ? "enterprise" : "government"),
  );
  await page.getByPlaceholder("请输入账号", { exact: true }).fill(username);
  await page.getByPlaceholder("请输入密码", { exact: true }).fill("Demo@123");
  await page.getByRole("button", { name: "登 录", exact: true }).click();
  await expect(page.locator(".admin-shell")).toBeVisible();
}
async function check(name, fn) {
  await fn();
  checks.push(name);
  console.log("PASS", name);
}
async function click(name) {
  await page.getByRole("button", { name, exact: true }).click();
}
async function submitTab() {
  await page
    .locator(".oa-primary-tabs")
    .getByRole("button", { name: "提交与办理", exact: false })
    .click();
}
async function downloadData(filename) {
  const pending = page.waitForEvent("download");
  await click("导出当前填报");
  await (await pending).saveAs("output/" + filename);
  return JSON.parse(fs.readFileSync("output/" + filename, "utf8"));
}
try {
  await login("ent_01");
  await check("七阶段顺序、数据批准前方案锁定、历史查询", async () => {
    await go("/app/enterprise?p=solution");
    await expect(page.locator(".phase-steps")).toBeVisible();
    expect(await page.locator(".step-copy strong").allTextContents()).toEqual([
      "企业信息",
      "企业相关资料报告",
      "组织与宣贯",
      "现状调研与对标",
      "问题分析与目标设置",
      "方案研制与保障实施",
      "成果总结",
    ]);
    await expect(
      page.getByText("填报数据获批后开启方案优化", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "生成推荐方案", exact: true }),
    ).toHaveCount(0);
    await go("/app/enterprise?p=solution&round=2");
    await expect(
      page.getByRole("button", { name: "新增方案", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("循环水泵运行优化", { exact: true }),
    ).toHaveCount(0);
    await page
      .locator(".tabs-strip")
      .getByRole("button", { name: "中高费方案", exact: false })
      .click();
    await expect(
      page.getByRole("button", { name: "冷凝水回收系统改造", exact: true }),
    ).toBeVisible();
  });
  await check("成果总结历次报告下载和持续清洁生产保存", async () => {
    await go("/app/enterprise?p=summary");
    expect(
      await page
        .locator(".vxe-table")
        .first()
        .locator(".vxe-body--row")
        .count(),
    ).toBe(3);
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "下载示例", exact: true })
      .last()
      .click();
    expect((await pending).suggestedFilename()).toContain("第1轮");
    await click("新增持续改进事项");
    await page
      .getByPlaceholder("请输入持续清洁生产事项", { exact: true })
      .fill("季度计量台账复核");
    await page
      .getByPlaceholder("请输入持续目标", { exact: true })
      .fill("完成四季度计量核查");
    await page.getByPlaceholder("请输入责任人", { exact: true }).fill("王芳");
    await click("保存");
    await page.reload();
    await expect(
      page.getByText("季度计量台账复核", { exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: "output/summary.png", fullPage: true });
  });
  await check("实际报告关联、预览、下载与引用保护", async () => {
    await go("/app/enterprise?p=documents");
    await page.locator("input[type=file]").setInputFiles({
      name: "第2轮实际报告测试.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("历史清洁生产审核报告原件测试内容。"),
    });
    await expect(page.locator(".vxe-table")).toContainText(
      "第2轮实际报告测试.txt",
    );
    await go("/app/enterprise?p=summary");
    await page
      .getByRole("button", { name: "关联报告", exact: true })
      .nth(1)
      .click();
    await page.locator(".n-modal .n-select").first().click();
    await page
      .locator(".n-base-select-option")
      .filter({ hasText: "第2轮实际报告测试.txt" })
      .click();
    await click("保存");
    await page.reload();
    await expect(page.locator(".vxe-table").first()).toContainText(
      "第2轮实际报告测试.txt",
    );
    const dl = page.waitForEvent("download");
    await click("下载报告");
    await (await dl).saveAs("output/linked-report.txt");
    expect(fs.readFileSync("output/linked-report.txt", "utf8")).toContain(
      "历史清洁生产审核报告原件测试内容",
    );
    await page
      .getByRole("button", { name: "查看", exact: true })
      .nth(1)
      .click();
    await expect(page.locator("pre")).toContainText(
      "历史清洁生产审核报告原件测试内容",
    );
    await page.keyboard.press("Escape");
    await go("/app/enterprise?p=documents");
    await click("删除");
    await expect(
      page.getByText("该原件已关联报告或提交版本，请保留以供追溯。", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".vxe-table")).toContainText(
      "第2轮实际报告测试.txt",
    );
  });
  await check("OA四部分填报、评价信息与企业详情隔离", async () => {
    await go("/app/oa");
    expect(
      await page
        .locator(".oa-fill-toolbar .tabs-strip button")
        .allTextContents(),
    ).toEqual([
      "企业情况",
      "筹划与组织",
      "现状调研与对标",
      "问题分析与目标设置",
    ]);
    await click("编辑企业信息");
    await page
      .getByPlaceholder("请输入企业联系人", { exact: true })
      .fill("OA初次联系人");
    await click("保存");
    await page
      .locator(".oa-fill-toolbar")
      .getByRole("button", { name: "问题分析与目标设置", exact: true })
      .click();
    await click("填写评价信息");
    await page
      .getByPlaceholder("请输入适用清洁生产标准", { exact: true })
      .fill("企业选定行业评价标准（测试）");
    await page
      .getByPlaceholder("请输入标准版本或文号", { exact: true })
      .fill("企业待核实版本");
    await click("保存");
    const draft = await downloadData("oa-draft.json");
    expect(draft.data.info.contact).toBe("OA初次联系人");
    expect(Object.keys(draft.data.rounds)).toEqual(["3"]);
    expect(draft.data.rounds[3].schemes).toBeUndefined();
    await page.screenshot({ path: "output/oa-analysis.png", fullPage: true });
    await go("/app/enterprise?p=info");
    await expect(page.locator(".enterprise-info-table")).toContainText("张敏");
  });
  await check("提交前校核、生成V1并锁定数据", async () => {
    await go("/app/oa");
    await submitTab();
    await expect(page.locator(".vxe-table").first()).toContainText(
      "筹划与组织",
    );
    await page.getByRole("checkbox").check();
    await click("提交上级审核");
    await click("确认提交");
    await expect(page.locator(".section-heading").first()).toContainText(
      "已提交",
    );
    await page
      .locator(".oa-primary-tabs")
      .getByRole("button", { name: "填报数据", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "编辑企业信息", exact: true }),
    ).toHaveCount(0);
    const v1 = await downloadData("oa-v1.json");
    expect(v1.version).toBe(1);
    expect(v1.data.info.contact).toBe("OA初次联系人");
    await submitTab();
    await page.screenshot({ path: "output/oa-submitted.png", fullPage: true });
  });
  await check("省市查看、其他县无权查看，接收县受理", async () => {
    await login("gov_guiyang");
    await go("/app/oa");
    await expect(page.locator(".vxe-table")).not.toContainText(
      "贵州黔源酒业有限公司",
    );
    await go("/app/oa/ent_01");
    await expect(page).toHaveURL(/app\/government/);
    await login("gov_province");
    await go("/app/oa/ent_01");
    await submitTab();
    await expect(
      page.getByRole("button", { name: "受理并开始审核", exact: true }),
    ).toHaveCount(0);
    await login("gov_renhuai");
    await go("/app/oa");
    await click("查看办理");
    await submitTab();
    await click("受理并开始审核");
    await expect(page.locator(".section-heading").first()).toContainText(
      "资料审核中",
    );
  });
  await check("四模块逐项意见与现场考察退回", async () => {
    const sections = [
      "企业情况",
      "筹划与组织",
      "现状调研与对标",
      "问题分析与目标设置",
    ];
    for (const [i, s] of sections.entries()) {
      await page
        .locator(".oa-primary-tabs")
        .getByRole("button", { name: "填报数据", exact: true })
        .click();
      await page
        .locator(".oa-fill-toolbar")
        .getByRole("button", { name: s, exact: true })
        .click();
      await submitTab();
      await click("新增审核意见");
      await page
        .getByPlaceholder("请输入数据项 / 表格 / 工序", { exact: true })
        .fill("核对项" + (i + 1));
      await page
        .getByPlaceholder("请输入具体审核意见与修改建议", { exact: true })
        .fill(s + "：请核对原始记录并补充说明。");
      await click("保存");
    }
    await click("安排现场考察");
    await page
      .getByPlaceholder("请输入考察日期（YYYY-MM-DD）", { exact: true })
      .fill("2026-10-20");
    await page
      .getByPlaceholder("请输入考察人员及单位", { exact: true })
      .fill("县局审核组、企业环保负责人");
    await click("保存");
    await expect(page.locator(".section-heading").first()).toContainText(
      "待现场考察",
    );
    await click("记录考察并退回修订");
    await page
      .getByPlaceholder("请输入现场考察情况与整改要求", { exact: true })
      .fill("现场核查计量设施及生产台账，请按四项意见修订后重新提交。");
    await click("保存");
    await expect(page.locator(".section-heading").first()).toContainText(
      "已退回",
    );
    await page.screenshot({
      path: "output/oa-review-feedback.png",
      fullPage: true,
    });
  });
  await check("企业修订、逐条回复并生成V2，V1保持不变", async () => {
    await login("ent_01");
    await go("/app/oa");
    await submitTab();
    await click("开始修订");
    await click("编辑企业信息");
    await page
      .getByPlaceholder("请输入企业联系人", { exact: true })
      .fill("OA修订联系人");
    await click("保存");
    await submitTab();
    for (let n = 1; n <= 4; n++)
      await page
        .getByPlaceholder("回复：核对项" + n, { exact: true })
        .fill("已核对并修订第" + n + "项数据，依据原始台账复核。");
    await page
      .getByPlaceholder("说明本次修改内容、依据文件以及现场问题落实情况", {
        exact: true,
      })
      .fill("已更新联系人，核对各模块数据并补充现场考察说明。");
    await page.getByRole("checkbox").check();
    await click("修订后再次提交");
    await click("确认提交");
    const v2 = await downloadData("oa-v2.json");
    expect(v2.version).toBe(2);
    expect(v2.data.info.contact).toBe("OA修订联系人");
    await page.locator('[aria-label="OA数据版本"]').click();
    await page
      .locator(".n-base-select-option")
      .filter({ hasText: "提交版本 V1" })
      .click();
    const v1 = await downloadData("oa-v1-preserved.json");
    expect(v1.data.info.contact).toBe("OA初次联系人");
    await page.reload();
    await submitTab();
    await expect(
      page.getByText("本版本对上次意见的修订回复", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: "output/oa-resubmitted.png",
      fullPage: true,
    });
  });
  await check("政府复核办结，记录刷新后保留", async () => {
    await login("gov_renhuai");
    await go("/app/oa/ent_01");
    await submitTab();
    await click("受理并开始审核");
    await click("批准填报数据");
    await page
      .getByPlaceholder("请输入审核结论", { exact: true })
      .fill("已复核企业修订数据及现场整改说明，本轮审核办结。");
    await click("保存");
    await page.reload();
    await submitTab();
    await expect(page.locator(".section-heading").first()).toContainText(
      "填报数据已获批",
    );
    await expect(
      page.getByRole("button", { name: "受理并开始审核", exact: true }),
    ).toHaveCount(0);
    await page.screenshot({ path: "output/oa-completed.png", fullPage: true });
  });
  await check("企业OA窄屏浏览", async () => {
    await login("ent_01");
    await page.setViewportSize({ width: 390, height: 844 });
    await go("/app/oa");
    const width = await page.evaluate(() => ({
      viewport: innerWidth,
      width: document.documentElement.scrollWidth,
    }));
    expect(width.width).toBeLessThanOrEqual(width.viewport + 2);
    await page.screenshot({ path: "output/oa-mobile.png", fullPage: true });
  });
  expect(errors).toEqual([]);
  fs.writeFileSync(
    "output/revision-test-results.json",
    JSON.stringify({ passed: checks.length, checks, errors }, null, 2),
  );
  console.log(`ALL ${checks.length} REVISION CHECKS PASSED`);
} catch (e) {
  await page.screenshot({
    path: "output/revision-failure.png",
    fullPage: true,
  });
  fs.writeFileSync(
    "output/revision-test-results.json",
    JSON.stringify({ checks, errors, failure: e.message }, null, 2),
  );
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
