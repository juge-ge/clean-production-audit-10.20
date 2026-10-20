import { chromium, expect } from "@playwright/test";
import fs from "node:fs";

fs.mkdirSync("output/enterprise-space", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1536, height: 1050 } });
await context.addInitScript(() => {
  if (!localStorage.getItem("cleaner-production-demo-v1"))
    localStorage.setItem("cleaner-production-demo-v1", JSON.stringify({ enterprises: {}, demoPreset: "manual" }));
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const base = "http://127.0.0.1:5178/";
async function go(path) {
  await page.goto(base + "#" + path);
  await expect(page.locator(".admin-shell")).toBeVisible();
}
async function stored() {
  return page.evaluate(() => JSON.parse(localStorage.getItem("cleaner-production-demo-v1")).enterprises.ent_01);
}
async function editContact(value) {
  await page.getByRole("button", { name: "编辑企业信息", exact: true }).click();
  await page.getByPlaceholder("请输入企业联系人", { exact: true }).fill(value);
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.locator(".enterprise-info-table").getByText(value, { exact: true })).toBeVisible();
}
try {
  await page.goto(base + "#/login/enterprise");
  await page.getByPlaceholder("请输入账号", { exact: true }).fill("ent_01");
  await page.getByRole("button", { name: "登 录", exact: true }).click();
  await expect(page.locator(".admin-shell")).toBeVisible();
  expect(await page.locator(".sidebar nav .sidebar-item").allTextContents()).toEqual([
    "企业详情", "企业数据中心", "审核工作台", "清洁生产审核 OA", "专家库", "第三方咨询库",
  ]);
  console.log("PASS 企业端六个菜单及顺序");

  await go("/app/enterprise?p=info&round=2");
  await expect(page.getByText("历史数据只读", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "编辑企业信息" })).toHaveCount(0);
  await page.screenshot({ path: "output/enterprise-space/history.png", fullPage: true });

  await go("/app/audit-workbench?p=info");
  await expect(page.locator(".workbench-phases button")).toHaveCount(7);
  await editContact("本轮草稿联系人");
  await page.reload();
  await expect(page.locator(".enterprise-info-table").getByText("本轮草稿联系人", { exact: true })).toBeVisible();
  await go("/app/enterprise?p=info");
  await expect(page.locator(".enterprise-info-table").getByText("张敏", { exact: true })).toBeVisible();
  console.log("PASS 本轮草稿持久化且不修改企业详情及历史");

  await go("/app/data-center");
  await expect(page.locator(".document-checklist section")).toHaveCount(6);
  await expect(page.locator(".document-drop")).toHaveCount(0);
  await page.screenshot({ path: "output/enterprise-space/data-center.png", fullPage: true });
  await page.locator(".document-checklist button").filter({ hasText: "生产年报（原辅材料情况）" }).click();
  await page.locator("input[type=file]").setInputFiles({ name: "2026年生产年报_资料引用测试.txt", mimeType: "text/plain", buffer: Buffer.from("企业数据中心上传原件，保留所属年度。") });
  await expect(page.locator(".vxe-table").getByText("2026年生产年报_资料引用测试.txt", { exact: true })).toBeVisible();
  await page.reload();
  await page.locator(".document-checklist button").filter({ hasText: "生产年报（原辅材料情况）" }).click();
  await expect(page.locator(".vxe-table").getByText("2026年生产年报_资料引用测试.txt", { exact: true })).toBeVisible();
  console.log("PASS 数据中心卡片分类、上传与持久化");

  await go("/app/audit-workbench?p=documents");
  await expect(page.locator(".vxe-table").getByText("2026年生产年报_资料引用测试.txt", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "更新资料引用", exact: false }).click();
  await page.getByRole("button", { name: "更新资料引用", exact: true }).click();
  await expect(page.locator(".vxe-table").getByText("2026年生产年报_资料引用测试.txt", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "准备 OA 提交", exact: true }).click();
  await page.getByRole("button", { name: "带入并前往 OA", exact: true }).click();
  await expect(page).toHaveURL(/oa\?stage=submit/);
  await page.getByRole("button", { name: "材料查阅", exact: true }).click();
  await expect(page.locator(".enterprise-info-table").getByText("本轮草稿联系人", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "编辑企业信息" })).toHaveCount(0);
  await page.getByRole("button", { name: "提交与办理", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "提交上级审核", exact: true }).click();
  await page.getByRole("button", { name: "确认提交", exact: true }).click();
  await expect(page.getByText("已提交 · 待受理", { exact: true })).toBeVisible();
  console.log("PASS 工作台显式更新引用、带入 OA、正式提交");

  await go("/app/audit-workbench?p=info");
  await editContact("提交后继续编制联系人");
  await go("/app/oa?stage=fill");
  await expect(page.locator(".enterprise-info-table").getByText("本轮草稿联系人", { exact: true })).toBeVisible();
  const data = await stored();
  expect(data.info.contact).toBe("张敏");
  expect(data.rounds[2].info.contact).toBe("张敏");
  expect(data.oaWorkflow.versions[0].snapshot.info.contact).toBe("本轮草稿联系人");
  expect(data.auditWorkspace.info.contact).toBe("提交后继续编制联系人");
  console.log("PASS 提交快照、历史档案、后续草稿相互隔离");

  for (const phase of ["organization", "survey", "analysis", "solution", "summary"])
    await go("/app/audit-workbench?p=" + phase);
  await go("/app/audit-workbench?p=info");
  await expect(page.locator(".n-message")).toHaveCount(0, { timeout: 8000 });
  await page.screenshot({ path: "output/enterprise-space/workbench.png", fullPage: true });
  for (const section of ["experts", "consultants"]) {
    await go("/app/" + section);
    await expect(page.locator(".vxe-table")).toBeVisible();
  }

  const approvedContext = await browser.newContext({ viewport: { width: 1536, height: 1050 } });
  const approved = await approvedContext.newPage();
  approved.on("pageerror", (error) => errors.push(error.message));
  await approved.goto(base + "#/login/enterprise");
  await approved.getByRole("button", { name: "登 录", exact: true }).click();
  for (const path of ["data-center", "audit-workbench?p=info", "audit-workbench?p=solution", "audit-workbench?p=summary", "oa"]) {
    await approved.goto(base + "#/app/" + path);
    await expect(approved.locator(".admin-shell")).toBeVisible();
    await expect(approved.locator(".content-area")).not.toBeEmpty();
  }
  // Exercise formal submissions using the existing approved demo as an isolated fixture.
  await approved.evaluate(async () => {
    const { enterpriseData } = await import("/src/data/store.js");
    const entity = enterpriseData("ent_01");
    entity.delivery.testOriginalDecision = structuredClone(JSON.parse(JSON.stringify(entity.delivery.planVersions[0].decision)));
    entity.delivery.planVersions = [];
    entity.delivery.acceptanceVersions = [];
    entity.delivery.status = "planning";
  });
  await approved.goto(base + "#/app/audit-workbench?p=solution&section=expert");
  await expect(approved.getByRole("button", { name: "提交方案报备", exact: true })).toHaveCount(0);
  await approved.getByRole("button", { name: "前往 OA 报备", exact: true }).click();
  await expect(approved.getByText("方案正式报备", { exact: true })).toBeVisible();
  await expect(approved.locator(".section-card").filter({ hasText: "方案正式报备" }).getByText("蒸汽阀门巡检与保温修复", { exact: true })).toBeVisible();
  await approved.getByPlaceholder("填写方案报备说明；如被退回，请逐项说明修改情况", { exact: true }).fill("从工作台转入 OA 核对方案并报备");
  await approved.getByRole("button", { name: "提交方案报备", exact: true }).click();
  await approved.getByRole("button", { name: "确认报备", exact: true }).click();
  await expect(approved.getByText("方案正式报备", { exact: true })).toHaveCount(0);
  await approved.evaluate(async () => {
    const { enterpriseData } = await import("/src/data/store.js");
    const entity = enterpriseData("ent_01");
    entity.delivery.planVersions[0].decision = entity.delivery.testOriginalDecision;
    delete entity.delivery.testOriginalDecision;
    entity.delivery.status = "implementing";
  });
  await approved.goto(base + "#/app/audit-workbench?p=summary");
  await expect(approved.getByRole("button", { name: "提交上级验收", exact: true })).toHaveCount(0);
  await approved.getByRole("button", { name: "前往 OA 提交验收", exact: true }).click();
  await expect(approved).toHaveURL(/stage=delivery&detail=acceptance/);
  await approved.getByRole("button", { name: "提交上级验收", exact: true }).click();
  await approved.getByRole("button", { name: "确认提交验收", exact: true }).click();
  await expect(approved.getByText("当前验收申请已提交，等待上级检查指导。提交版本只读。", { exact: true })).toBeVisible();
  console.log("PASS 方案报备和验收正式提交集中在 OA，原有校验与冻结机制继续生效");
  await approvedContext.close();
  console.log("PASS 默认已批准演示及原有专家、咨询资源页面");

  await page.getByRole("button", { name: "退出登录", exact: true }).click();
  await page.goto(base + "#/login/government");
  await page.getByPlaceholder("请输入账号", { exact: true }).fill("gov_renhuai");
  await page.getByRole("button", { name: "登 录", exact: true }).click();
  await expect(page.locator(".top-account")).toHaveText("遵义市生态环境局仁怀市分局");
  await go("/app/government");
  await expect(page.locator(".sidebar nav").getByText("监管总览", { exact: true })).toBeVisible();
  await expect(page.locator(".sidebar nav").getByText("企业数据中心", { exact: true })).toBeVisible();
  console.log("PASS 企业端隔离保持，政府端使用独立数据中心");
  expect(errors).toEqual([]);
  console.log("PASS 浏览器无运行错误");
} finally {
  await browser.close();
}
