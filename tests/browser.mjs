import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
fs.mkdirSync("output", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 1536, height: 1050 },
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
const page = await context.newPage();
const errors = [],
  checks = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
const base = "http://127.0.0.1:5178/";
async function go(path) {
  await page.goto(base + "#" + path);
  await page.waitForTimeout(250);
}
async function check(name, fn) {
  await fn();
  checks.push(name);
  console.log("PASS", name);
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
try {
  await check("门户原布局与两个独立入口", async () => {
    await page.goto(base);
    await expect(
      page
        .frameLocator("iframe")
        .getByRole("button", { name: "政府端管理入口", exact: false }),
    ).toBeVisible();
    await expect(
      page
        .frameLocator("iframe")
        .getByRole("button", { name: "企业端填报入口", exact: false }),
    ).toBeVisible();
    await page.screenshot({ path: "output/homepage.png", fullPage: true });
    await page
      .frameLocator("iframe")
      .getByRole("button", { name: "企业端填报入口", exact: false })
      .click();
    await expect(page).toHaveURL(/login\/enterprise/);
    await page.screenshot({ path: "output/login.png", fullPage: true });
  });
  await check("登录验证与会话恢复", async () => {
    await page.getByPlaceholder("请输入密码", { exact: true }).fill("bad");
    await page.getByRole("button", { name: "登 录", exact: true }).click();
    await expect(
      page.getByText("账号或密码不正确，请使用下方的测试账号"),
    ).toBeVisible();
    await login("ent_01");
    await page.reload();
    await expect(
      page.getByText("你好，贵州黔源酒业有限公司的管理员"),
    ).toBeVisible();
    await page.screenshot({ path: "output/dashboard.png", fullPage: true });
  });
  await check("企业不能访问其他企业 URL", async () => {
    await go("/app/enterprise/ent_02");
    await expect(page).toHaveURL(/app\/home/);
  });
  await check("企业资料编辑与历史快照隔离", async () => {
    await go("/app/enterprise?p=info");
    await page
      .getByRole("button", { name: "编辑企业信息", exact: true })
      .click();
    await page
      .getByPlaceholder("请输入企业联系人", { exact: true })
      .fill("测试联系人");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await page.reload();
    await expect(
      page
        .locator(".enterprise-info-table")
        .getByText("测试联系人", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: "output/enterprise-info.png",
      fullPage: true,
    });
    await go("/app/enterprise?p=info&round=2");
    await expect(
      page.getByRole("button", { name: "编辑企业信息" }),
    ).toHaveCount(0);
    await expect(
      page.locator(".enterprise-info-table").getByText("张敏", { exact: true }),
    ).toBeVisible();
  });
  await check("原始资料上传、持久化、下载", async () => {
    await go("/app/enterprise?p=documents");
    await page.locator("input[type=file]").setInputFiles({
      name: "测试生产年报.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("原始文件内容：产品产量 6600 吨。测试引用第1页。"),
    });
    await expect(
      page.locator(".vxe-table").getByText("测试生产年报.txt", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.locator(".vxe-table").getByText("测试生产年报.txt", { exact: true }),
    ).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "下载", exact: true }).click();
    const d = await download;
    await d.saveAs("output/download-test.txt");
    expect(fs.readFileSync("output/download-test.txt", "utf8")).toContain(
      "原始文件内容",
    );
    await page
      .getByRole("button", { name: "准备识别任务", exact: true })
      .click();
    await expect(
      page.getByText("任务草稿已保存。当前仅生成字段核对清单", {
        exact: false,
      }),
    ).toBeVisible();
    await page.screenshot({ path: "output/documents.png", fullPage: true });
  });
  await check("资料清单包含原有30类及7类过程材料", async () => {
    await page
      .getByRole("button", { name: "完整资料清单", exact: false })
      .click();
    await expect(
      page.getByText("计量器具明细清单", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("污染物平衡图（含氮氧化物）", { exact: true }),
    ).toBeVisible();
    expect(await page.locator(".document-checklist button").count()).toBe(37);
  });
  await check("VXE双击编辑、固定合计和单耗重算", async () => {
    await go("/app/enterprise?p=survey");
    const row = page
      .locator(".vxe-body--row")
      .filter({ hasText: "酱香型基酒" });
    await row.locator(".vxe-body--column").nth(4).dblclick();
    await page
      .getByRole("spinbutton", { name: "实际产量（t/a）" })
      .fill("5500");
    await page.getByText("审核指标计算", { exact: true }).click();
    await expect(page.locator(".vxe-footer--row")).toContainText("6,600");
    await expect(page.locator(".indicator-grid")).toContainText("0.386");
    await page.reload();
    await expect(page.locator(".vxe-footer--row")).toContainText("6,600");
  });
  await check("新增明细和真实文件引用", async () => {
    await page.getByRole("button", { name: "添加明细", exact: false }).click();
    await page
      .getByPlaceholder("请输入项目名称", { exact: true })
      .fill("测试基酒");
    await page
      .getByPlaceholder("请输入来源文档名称", { exact: true })
      .fill("测试生产年报.txt");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    const row = page.locator(".vxe-body--row").filter({ hasText: "测试基酒" });
    await expect(row).toBeVisible();
    await row
      .getByRole("button", { name: "测试生产年报.txt", exact: false })
      .click();
    await expect(
      page.locator("pre").getByText("原始文件内容", { exact: false }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page.screenshot({ path: "output/survey.png", fullPage: true });
  });
  await check("历次表格只读且独立", async () => {
    await go("/app/enterprise?p=survey&round=2");
    await expect(
      page.getByRole("button", { name: "添加明细", exact: false }),
    ).toHaveCount(0);
    await expect(page.locator(".vxe-footer--row")).toContainText("6,804");
    await expect(
      page.locator(".vxe-table").getByText("测试基酒", { exact: true }),
    ).toHaveCount(0);
  });
  await check("组织成员编辑、无姓氏头像与工作计划", async () => {
    await go("/app/enterprise?p=organization");
    await page
      .getByRole("button", { name: "添加成员", exact: false })
      .first()
      .click();
    await page.getByPlaceholder("请输入姓名", { exact: true }).fill("测试成员");
    await page.getByPlaceholder("请输入职务", { exact: true }).fill("环保主管");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByText("测试成员", { exact: true })).toBeVisible();
    expect(await page.locator(".el-avatar,.n-avatar").count()).toBe(0);
    await page.screenshot({ path: "output/organization.png", fullPage: true });
  });
  await check("流程节点编辑、跨阶段共享与JSON导出", async () => {
    await go("/app/enterprise?p=survey");
    await page.getByRole("button", { name: "生产工艺", exact: true }).click();
    await page.getByRole("button", { name: "添加工序", exact: false }).click();
    await page
      .getByPlaceholder("请输入工序 / 设施名称", { exact: true })
      .fill("测试计量点");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(
      page.locator(".vue-flow__node").filter({ hasText: "测试计量点" }),
    ).toBeVisible();
    const dl = page.waitForEvent("download");
    await page.getByRole("button", { name: "导出流程", exact: false }).click();
    await (await dl).saveAs("output/flow-test.json");
    expect(
      JSON.parse(fs.readFileSync("output/flow-test.json", "utf8")).nodes.some(
        (n) => n.label === "测试计量点",
      ),
    ).toBeTruthy();
    await go("/app/enterprise?p=analysis");
    await page
      .getByRole("button", { name: "生产工艺与定性核查", exact: false })
      .click();
    await expect(
      page.locator(".vue-flow__node").filter({ hasText: "测试计量点" }),
    ).toBeVisible();
    await page.screenshot({ path: "output/process.png", fullPage: true });
  });
  await check("添加问题和目标", async () => {
    await go("/app/enterprise?p=analysis");
    await page
      .getByRole("button", { name: "清洁生产水平与问题清单", exact: true })
      .click();
    await page.getByRole("button", { name: "新增问题", exact: false }).click();
    await page
      .getByPlaceholder("请输入问题描述", { exact: true })
      .fill("测试目标事项");
    await page
      .getByPlaceholder("请输入本轮目标", { exact: true })
      .fill("补齐台账");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByText("测试目标事项", { exact: true })).toBeVisible();
    await page.screenshot({ path: "output/analysis.png", fullPage: true });
  });
  await check("审核助手为明确的本地演示", async () => {
    await go("/app/home");
    await page
      .getByRole("textbox", { name: "审核助手输入框" })
      .fill("查看资料");
    await page.getByRole("button", { name: "发送消息" }).click();
    await expect(page.locator(".chat-turn.assistant")).toContainText(
      "1 份文件",
    );
    await expect(
      page.getByText("本地前端演示，尚未连接模型服务。", { exact: false }),
    ).toBeVisible();
  });
  await check("政府省市县数据范围与越权路径", async () => {
    for (const [user, count] of [
      ["gov_province", 8],
      ["gov_zunyi", 4],
      ["gov_renhuai", 2],
    ]) {
      await login(user);
      expect(
        await page.locator(".vxe-table--body-wrapper .vxe-body--row").count(),
      ).toBe(count);
    }
    await page.screenshot({ path: "output/government.png", fullPage: true });
    await go("/app/enterprise/ent_05");
    await expect(page).toHaveURL(/app\/government/);
    await go("/app/enterprise/ent_01");
    await expect(
      page.getByText("当前为政府端辖区企业查看模式。", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "编辑企业信息" }),
    ).toHaveCount(0);
  });
  await check("各角色仅允许对应入口登录", async () => {
    await go("/login/enterprise");
    await page
      .getByPlaceholder("请输入账号", { exact: true })
      .fill("gov_province");
    await page.getByRole("button", { name: "登 录", exact: true }).click();
    await expect(page).toHaveURL(/login\/enterprise/);
  });
  await check("移动视口登录与企业工作台", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login("ent_02");
    await page.screenshot({
      path: "output/mobile-dashboard.png",
      fullPage: true,
    });
    const width = await page.evaluate(() => ({
      viewport: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(width.scroll).toBeLessThanOrEqual(width.viewport + 2);
  });
  expect(errors).toEqual([]);
  fs.writeFileSync(
    "output/test-results.json",
    JSON.stringify({ checks, errors, passed: checks.length }, null, 2),
  );
  console.log(`ALL ${checks.length} BROWSER CHECKS PASSED`);
} catch (error) {
  await page.screenshot({ path: "output/test-failure.png", fullPage: true });
  fs.writeFileSync(
    "output/test-results.json",
    JSON.stringify({ checks, errors, failure: error.message }, null, 2),
  );
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
