import { chromium, expect } from "@playwright/test";

const base = (process.env.CP_BASE_URL || "http://127.0.0.1:5178/").replace(/\/?$/, "/");
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-proxy-server"] });
const context = await browser.newContext();
await context.addInitScript(() => {
  Object.defineProperty(globalThis.crypto, "randomUUID", { value: undefined, configurable: true });
});
const page = await context.newPage(), errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("response", (response) => { if (response.url().startsWith(base) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
const rows = () => page.locator(".vxe-table--main-wrapper .vxe-body--row");
async function go(path) { await page.goto(base + "#" + path); await expect(page.locator(".admin-shell")).toBeVisible(); }
async function login(account) {
  await page.goto(base + "#/login/" + (account.startsWith("ent") ? "enterprise" : "government"));
  await page.getByPlaceholder("请输入账号", { exact: true }).fill(account);
  await page.getByRole("button", { name: "登 录", exact: true }).click();
  await expect(page.locator(".admin-shell")).toBeVisible();
}
try {
  for (const [account, count] of [["gov_province", 8], ["gov_zunyi", 4], ["gov_renhuai", 2]]) {
    await login(account);
    await expect(rows()).toHaveCount(count);
    await go("/app/government-data");
    await expect(rows()).toHaveCount(count);
    await go("/app/enterprise-archives");
    await page.getByRole("button", { name: "报告检索", exact: true }).click();
    await expect(rows()).toHaveCount(count * 4);
    console.log(`PASS HTTP mock data: ${account}, ${count} enterprises, ${count * 4} reports`);
  }
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("cleaner-production-demo-v1")));
  expect(Object.keys(state.enterprises)).toHaveLength(8);
  expect(Object.values(state.enterprises).every((data) => data.delivery.status === "reported")).toBe(true);
  await login("ent_01");
  await go("/app/data-center");
  await page.locator(".document-checklist button").filter({ hasText: "生产年报（原辅材料情况）" }).click();
  const filename = "HTTP兼容性验证.txt";
  await page.locator("input[type=file]").setInputFiles({ name: filename, mimeType: "text/plain", buffer: Buffer.from("浏览器自动化测试样例") });
  await expect(page.locator(".vxe-table")).toContainText(filename);
  await page.reload();
  await page.locator(".document-checklist button").filter({ hasText: "生产年报（原辅材料情况）" }).click();
  await expect(page.locator(".vxe-table")).toContainText(filename);
  await login("gov_province");
  await go("/app/government-data");
  await expect(rows()).toHaveCount(8);
  expect(errors).toEqual([]);
  console.log("PASS HTTP upload, persistence, role switching; no console or runtime errors");
} finally { await browser.close(); }
