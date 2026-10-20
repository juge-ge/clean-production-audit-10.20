import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch({ channel: "msedge", headless: true }),
  context = await browser.newContext({
    viewport: { width: 1600, height: 1080 },
    acceptDownloads: true,
  }),
  page = await context.newPage(),
  base = "http://127.0.0.1:5178/",
  errors = [],
  checks = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400 && r.url().startsWith(base))
    errors.push(r.status() + " " + r.url());
});
async function go(p) {
  await page.goto(base + "#" + p);
  await page.waitForTimeout(250);
}
async function click(name, index = 0, root = page) {
  const visible = [];
  for (const b of await root.getByRole("button", { name, exact: true }).all())
    if (await b.isVisible()) visible.push(b);
  if (!visible[index]) throw Error("Visible button missing: " + name);
  await visible[index].click();
}
async function fill(p, v) {
  await page.getByPlaceholder(p, { exact: true }).fill(v);
}
async function login(u) {
  await go("/login/" + (u.startsWith("ent") ? "enterprise" : "government"));
  await fill("请输入账号", u);
  await fill("请输入密码", "Demo@123");
  await click("登 录");
  await expect(page.locator(".admin-shell")).toBeVisible();
}
async function check(n, fn) {
  await fn();
  checks.push(n);
  console.log("PASS", n);
}
async function screenshot(name) {
  await page.evaluate(() => scrollTo(0, 0));
  await expect(page.locator(".n-message")).toHaveCount(0);
  await page.screenshot({ path: "output/" + name, fullPage: true });
}
const stored = () =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("cleaner-production-demo-v1")),
  );
try {
  await check("政府菜单九项与默认全部批准场景", async () => {
    await login("gov_province");
    expect(
      await page.locator(".sidebar nav .sidebar-item > span").allTextContents(),
    ).toEqual([
      "监管总览",
      "企业数据中心",
      "企业审核档案",
      "行业水平评估",
      "清洁生产审核 OA",
      "行业报告工作台",
      "地方指标建设",
      "专家库",
      "第三方资讯库",
    ]);
    await expect(page.locator(".vxe-table")).toContainText("持续清洁生产");
    const db = await stored();
    expect(
      Object.values(db.enterprises).every(
        (d) => d.delivery.status === "reported",
      ),
    ).toBe(true);
    expect(JSON.stringify(db).length).toBeLessThan(4_000_000);
  });
  await check("六类行业评估切换、辖区筛选与CSV汇总", async () => {
    await go("/app/industry-assessment");
    expect(
      await page
        .locator(".vxe-table .vxe-table--main-wrapper .vxe-body--row")
        .count(),
    ).toBe(8);
    for (const name of [
      "污染物排放情况",
      "行业碳排放情况",
      "企业规模评估",
      "原辅材料技术工艺及装备评估",
      "能源消耗",
      "清洁生产审核开展情况",
    ]) {
      await click(name);
      await expect(page.locator(".section-heading").last()).toContainText(name);
    }
    await click("污染物排放情况");
    await page.locator('[aria-label="所属区县筛选"]').click();
    await page
      .locator(".n-base-select-option")
      .filter({ hasText: "仁怀市" })
      .click();
    expect(
      await page
        .locator(".vxe-table .vxe-table--main-wrapper .vxe-body--row")
        .count(),
    ).toBe(2);
    const dl = page.waitForEvent("download");
    await click("导出当前汇总");
    await (await dl).saveAs("output/industry-pollution.csv");
    const csv = fs.readFileSync("output/industry-pollution.csv", "utf8");
    expect(csv).toContain("贵州黔源酒业");
    expect(csv).not.toContain("贵州开阳");
    await click("重置");
    await screenshot("industry-assessment.png");
  });
  await check("省市县汇总范围与企业路由隔离", async () => {
    await login("gov_zunyi");
    await go("/app/industry-assessment");
    expect(
      await page
        .locator(".vxe-table .vxe-table--main-wrapper .vxe-body--row")
        .count(),
    ).toBe(4);
    await expect(page.locator(".vxe-table")).not.toContainText("贵州息水");
    await login("gov_renhuai");
    await go("/app/industry-assessment");
    expect(
      await page
        .locator(".vxe-table .vxe-table--main-wrapper .vxe-body--row")
        .count(),
    ).toBe(2);
    await login("ent_01");
    await go("/app/industry-indicators");
    await expect(page).toHaveURL(/app\/home/);
  });
  await check("行业水平、问题库、方案库与当前范围报告", async () => {
    await login("gov_renhuai");
    await go("/app/industry-reports");
    await click("行业资料参考");
    await expect(page.locator(".level-distribution")).toBeVisible();
    await click("行业问题库");
    await click("查看明细");
    await expect(page.locator(".n-modal")).toContainText("贵州黔源酒业");
    await expect(page.locator(".n-modal")).not.toContainText("贵州息水");
    await page.keyboard.press("Escape");
    await click("行业方案库");
    await expect(
      page.getByText("调研方案库 · 可供推荐的行业示例", { exact: true }),
    ).toBeVisible();
    await click("生成行业汇总报告");
    await expect(
      page.locator('iframe[title="行业汇总报告预览"]'),
    ).toBeVisible();
    const dl = page.waitForEvent("download");
    await click("下载行业报告");
    await (await dl).saveAs("output/industry-report.html");
    const html = fs.readFileSync("output/industry-report.html", "utf8");
    expect(html).toContain("蒸汽阀门巡检");
    expect(html).not.toContain("贵州息水");
    await page.keyboard.press("Escape");
    await screenshot("industry-reports.png");
  });
  await check("新建问卷、发放锁定和下载问卷", async () => {
    await go("/app/industry-indicators");
    await click("专家问卷");
    await click("新建专家问卷");
    await fill("填写专家调查问卷名称", "仁怀市行业指标标准评分测试");
    await click("保存问卷草稿");
    await expect(page.locator(".survey-detail")).toContainText(
      "仁怀市行业指标标准评分测试",
    );
    await click("模拟发放问卷");
    await expect(
      page.getByRole("button", { name: "编辑问卷", exact: true }),
    ).toHaveCount(0);
    const dl = page.waitForEvent("download");
    await click("下载调查问卷");
    await (await dl).saveAs("output/expert-questionnaire.html");
    expect(
      fs.readFileSync("output/expert-questionnaire.html", "utf8"),
    ).toContain("标准评分");
  });
  await check("代录专家回收、评分校验、结束回收和采用建议权重", async () => {
    const names = [
      "资源能源利用指标",
      "污染物产生与排放指标",
      "技术工艺与装备指标",
      "原辅材料与资源循环指标",
      "清洁生产管理指标",
    ];
    for (let i = 0; i < 3; i++) {
      await click("录入专家回收");
      if (i === 0) {
        await click("保存专家回收评分");
        await expect(
          page.getByText("每个指标均须填写 0—100 分评分", { exact: true }),
        ).toBeVisible();
      }
      for (const [j, name] of names.entries())
        await page
          .getByLabel(name + "评分", { exact: true })
          .fill(String(80 + i * 5 + j));
      await click("保存专家回收评分");
    }
    await click("评分汇总与权重建议");
    await expect(page.locator(".survey-detail .vxe-table")).toContainText("85");
    await click("结束本轮回收");
    await click("确认结束回收");
    await click("采用专家建议权重");
    await expect(page.locator(".survey-detail")).toContainText(
      "已保存本轮建议权重",
    );
    const db = await stored(),
      s = db.industrySurveys.find(
        (x) => x.title === "仁怀市行业指标标准评分测试",
      );
    expect(s.responses.length).toBe(3);
    expect(s.adoptedWeights.reduce((n, x) => n + x.weight, 0)).toBeCloseTo(
      100,
      2,
    );
    const dl = page.waitForEvent("download");
    await click("导出评分汇总");
    await (await dl).saveAs("output/expert-scoring.csv");
    expect(fs.readFileSync("output/expert-scoring.csv", "utf8")).toContain(
      "建议权重",
    );
    await screenshot("industry-indicators.png");
    await page.reload();
    await expect(page.locator(".section-card")).not.toHaveCount(0);
    expect(
      (await stored()).industrySurveys.find((x) => x.title === s.title).status,
    ).toBe("closed");
  });
  await check("上级可看下级问卷，其他县不可见", async () => {
    await login("gov_province");
    await go("/app/industry-indicators?tab=questionnaires");
    const row = page
      .locator(".vxe-table--main-wrapper .vxe-body--row")
      .filter({ hasText: "仁怀市行业指标标准评分测试" });
    await expect(row).toHaveCount(1);
    const fixed = page.locator(".vxe-table").first();
    const texts = await fixed
      .locator(".vxe-table--main-wrapper .vxe-body--row")
      .allTextContents();
    await click(
      "查看问卷",
      texts.findIndex((t) => t.includes("仁怀市行业指标标准评分测试")),
    );
    await expect(page.locator(".survey-detail")).toContainText(
      "仁怀市行业指标标准评分测试",
    );
    await expect(
      page.getByRole("button", { name: "录入专家回收", exact: true }),
    ).toHaveCount(0);
    await login("gov_xifeng");
    await go("/app/industry-indicators?tab=questionnaires");
    await expect(page.locator(".vxe-table").first()).not.toContainText(
      "仁怀市行业指标标准评分测试",
    );
  });
  await check("企业直接进入持续清洁生产，添加记录与刷新保留", async () => {
    await login("ent_01");
    await click("进入持续清洁生产");
    await expect(
      page.getByText("持续清洁生产跟踪", { exact: true }),
    ).toBeVisible();
    await click("新增持续跟踪记录");
    await fill("YYYY-MM", "2026-10");
    for (const [name, value] of [
      ["产品产量（t）", "540"],
      ["综合能耗（tce）", "190"],
      ["新鲜水量（m³）", "4700"],
      ["NOx排放（t）", "0.16"],
    ])
      await page.getByLabel(name, { exact: true }).fill(value);
    await fill(
      "记录持续整改、运行维护和指标复核情况",
      "10 月完成持续计量核查与运行优化",
    );
    await fill("填写下一步改进措施", "下一月复核用水分项台账");
    await page
      .locator(".n-modal input[type=file]")
      .setInputFiles({
        name: "持续清洁生产凭证.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("持续运行记录测试"),
      });
    await expect(
      page.getByRole("button", { name: "持续清洁生产凭证.txt", exact: true }),
    ).toBeVisible();
    await click("保存持续跟踪记录");
    await page.reload();
    await expect(page.locator(".continuous-panel .vxe-table")).toContainText(
      "10 月完成持续计量核查",
    );
    await click("查看记录");
    await expect(page.locator(".n-modal")).toContainText(
      "持续清洁生产凭证.txt",
    );
    await page.keyboard.press("Escape");
    await screenshot("continuous-production.png");
  });
  await check(
    "OA步骤可点击，已批准资料、现场记录、方案与报告均可查看",
    async () => {
      await go("/app/oa");
      await expect(page.locator(".oa-flow button")).toHaveCount(5);
      await page.locator(".oa-flow button").nth(2).click();
      await expect(page.locator(".visit-record")).toContainText("模拟检查组");
      await screenshot("oa-approved.png");
      await page.locator(".oa-flow button").first().click();
      await expect(page.locator(".enterprise-info-table")).toContainText(
        "贵州黔源酒业",
      );
      await page
        .locator(".oa-primary-tabs")
        .getByRole("button", { name: "方案与验收办理", exact: true })
        .click();
      await expect(page.locator(".continuous-panel")).toBeVisible();
      await click("实施考察");
      await click("查看 1 份凭证");
      const evidence = page.locator(".n-modal .attachment-row").first();
      await expect(evidence).toContainText("整改过程示例凭证.txt");
      const evidenceDownload = page.waitForEvent("download");
      await evidence.getByRole("button", { name: "下载", exact: true }).click();
      await (await evidenceDownload).saveAs("output/demo-approved-evidence.txt");
      expect(fs.readFileSync("output/demo-approved-evidence.txt", "utf8")).toContain("模拟");
      await page.keyboard.press("Escape");
      await page.locator(".delivery-steps button").nth(1).click();
      await expect(page.locator(".scheme-studio")).toBeVisible();
      await expect(
        page.getByText("填报数据获批后开启方案优化", { exact: true }),
      ).toHaveCount(0);
      await go("/app/enterprise?p=summary");
      const dl = page.waitForEvent("download");
      await page
        .locator(".report-ready")
        .getByRole("button", { name: "下载审核报告", exact: true })
        .click();
      expect((await dl).suggestedFilename()).toContain("清洁生产审核报告");
    },
  );
  await check("政府行业页与持续页面窄屏可读", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(392);
    await screenshot("continuous-mobile.png");
    await login("gov_province");
    await go("/app/industry-assessment");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(392);
    await screenshot("industry-mobile.png");
  });
  expect(errors).toEqual([]);
  fs.writeFileSync(
    "output/industry-test-results.json",
    JSON.stringify({ passed: checks.length, checks, errors }, null, 2),
  );
  console.log("ALL " + checks.length + " INDUSTRY CHECKS PASSED");
} catch (e) {
  await page.screenshot({
    path: "output/industry-failure.png",
    fullPage: true,
  });
  fs.writeFileSync(
    "output/industry-test-results.json",
    JSON.stringify({ checks, errors, failure: e.message }, null, 2),
  );
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
