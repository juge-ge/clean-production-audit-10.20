import { chromium, expect } from "@playwright/test";
import fs from "node:fs";

fs.mkdirSync("output/government-space", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1080 }, acceptDownloads: true });
const page = await context.newPage(), base = "http://127.0.0.1:5178/", errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => { if (response.status() >= 400 && response.url().startsWith(base)) errors.push(response.status() + ' ' + response.url()); });
async function go(path) { await page.goto(base + '#' + path); await expect(page.locator('.admin-shell')).toBeVisible(); }
async function click(name, root = page) { await root.getByRole('button', { name, exact: true }).click(); }
async function login(account) {
  await page.goto(base + '#/login/' + (account.startsWith('ent') ? 'enterprise' : 'government'));
  await page.getByPlaceholder('请输入账号', { exact: true }).fill(account);
  await click('登 录');
  await expect(page.locator('.admin-shell')).toBeVisible();
}
async function select(label, text) {
  await page.locator('[aria-label="' + label + '"]').click();
  await page.locator('.n-base-select-option').filter({ hasText: text }).click();
}
async function stored() { return page.evaluate(() => JSON.parse(localStorage.getItem('cleaner-production-demo-v1'))); }
async function shot(name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('.n-message')).toHaveCount(0, { timeout: 10000 });
  await page.screenshot({ path: 'output/government-space/' + name + '.png', fullPage: true });
}
const bodyRows = (root = page) => root.locator('.vxe-table--main-wrapper .vxe-body--row');
try {
  await login('ent_01');
  await go('/app/data-center');
  await page.locator('.document-checklist button').filter({ hasText: '生产年报（原辅材料情况）' }).click();
  await page.locator('input[type=file]').setInputFiles({ name: '政府端共享查询_2026生产年报.txt', mimeType: 'text/plain', buffer: Buffer.from('企业持续上传的数据中心原件，未再次提交OA。') });
  await expect(page.locator('.vxe-table')).toContainText('政府端共享查询_2026生产年报.txt');
  await login('gov_province');
  expect(await page.locator('.sidebar nav .sidebar-item > span').allTextContents()).toEqual(['监管总览', '企业数据中心', '企业审核档案', '行业水平评估', '清洁生产审核 OA', '行业报告工作台', '地方指标建设', '专家库', '第三方资讯库']);
  await shot('overview');
  await go('/app/government-data');
  await expect(bodyRows()).toHaveCount(8);
  await expect(page.locator('.sidebar-item.active')).toHaveCount(1);
  await expect(page.locator('.sidebar-item.active')).toHaveText('企业数据中心');
  await shot('enterprise-data');
  await go('/app/government-data/ent_01');
  await expect(page.locator('.document-checklist section')).toHaveCount(6);
  await expect(page.locator('input[type=file]')).toHaveCount(0);
  await page.locator('.document-checklist button').filter({ hasText: '生产年报（原辅材料情况）' }).click();
  await expect(page.locator('.vxe-table')).toContainText('政府端共享查询_2026生产年报.txt');
  await expect(page.getByRole('button', { name: '删除', exact: true })).toHaveCount(0);
  const docState = await stored();
  expect(docState.enterprises.ent_01.oaWorkflow.versions.at(-1).snapshot.documents.some((file) => file.name === '政府端共享查询_2026生产年报.txt')).toBe(false);
  console.log('PASS 九个菜单顺序、单项高亮与企业上传资料实时共享查询');

  await go('/app/enterprise-archives');
  await expect(bodyRows()).toHaveCount(8);
  await click('报告检索');
  await expect(bodyRows()).toHaveCount(32);
  await page.getByPlaceholder('搜索报告名称或企业', { exact: true }).fill('贵州黔源');
  await expect(bodyRows()).toHaveCount(4);
  await shot('report-search');
  await go('/app/enterprise-archives/ent_01?round=2&p=info');
  await expect(page.getByText('历史数据只读', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: '编辑企业信息', exact: true })).toHaveCount(0);
  await shot('history');
  console.log('PASS 多轮次企业档案及跨企业报告检索');

  await go('/app/industry-reports');
  await click('新建行业报告');
  await page.getByPlaceholder('请输入报告名称', { exact: true }).fill('省级行业报告版本隔离测试');
  await click('保存', page.locator('.n-modal'));
  const chapter = page.getByPlaceholder('编写二、行业现状与清洁生产水平', { exact: true });
  await chapter.fill('第一版正文：本次引用八家企业。');
  await click('保存成果版本');
  await chapter.fill('后续草稿：继续完善正文。');
  await page.reload();
  await expect(page.getByPlaceholder('编写二、行业现状与清洁生产水平', { exact: true })).toHaveValue('后续草稿：继续完善正文。');
  await select('所属区县筛选', '仁怀市');
  await click('按当前范围更新引用');
  await click('确认更新引用', page.locator('.n-dialog'));
  const reportState = await stored(), project = reportState.governmentReportProjects[0];
  expect(project.snapshot.enterprises.length).toBe(2);
  expect(project.versions[0].snapshot.enterprises.length).toBe(8);
  expect(project.versions[0].chapters[1].content).toBe('第一版正文：本次引用八家企业。');
  await select('行业报告版本', '成果 V1');
  await expect(page.getByPlaceholder('编写二、行业现状与清洁生产水平', { exact: true })).toHaveValue('第一版正文：本次引用八家企业。');
  await expect(page.getByPlaceholder('编写二、行业现状与清洁生产水平', { exact: true })).toBeDisabled();
  await click('预览报告');
  const download = page.waitForEvent('download');
  await click('下载报告草稿');
  await (await download).saveAs('output/government-space/report-version.html');
  expect(fs.readFileSync('output/government-space/report-version.html', 'utf8')).toContain('第一版正文');
  await page.keyboard.press('Escape');
  await shot('report-workbench');
  console.log('PASS 行业报告编制、刷新持久化、引用更新、成果版本冻结及导出');

  await go('/app/industry-indicators');
  await click('新建指标建设项目');
  await page.getByPlaceholder('请输入建设项目名称', { exact: true }).fill('地方指标研究版本测试');
  await page.getByPlaceholder('请输入法规标准与研究依据', { exact: true }).fill('研究测算示例依据，尚未发布。');
  await click('保存', page.locator('.n-modal'));
  await click('指标设计与测算');
  await click('添加候选指标');
  for (const [label, value] of [['一级拟定基准', '0.1'], ['二级拟定基准', '0.3'], ['三级拟定基准', '0.8']])
    await page.locator('.n-modal .n-form-item').filter({ hasText: label }).locator('input').fill(value);
  await click('保存', page.locator('.n-modal'));
  await expect(page.locator('.indicator-project-detail')).toContainText('单位产品综合能耗');
  await click('企业试评价');
  await expect(bodyRows(page.locator('.indicator-project-detail'))).toHaveCount(8);
  await expect(page.locator('.indicator-project-detail')).not.toContainText('待设置基准值');
  await shot('indicator-trial');
  await click('论证与成果版本');
  await page.getByPlaceholder('记录意见来源、内容、采纳情况及未采纳理由', { exact: true }).fill('初次论证意见。');
  await click('保存论证版本');
  await page.getByPlaceholder('记录意见来源、内容、采纳情况及未采纳理由', { exact: true }).fill('后续草稿补充意见。');
  await select('指标建设版本', '论证 V1');
  await expect(page.getByPlaceholder('记录意见来源、内容、采纳情况及未采纳理由', { exact: true })).toHaveValue('初次论证意见。');
  await expect(page.getByPlaceholder('记录意见来源、内容、采纳情况及未采纳理由', { exact: true })).toBeDisabled();
  const indicators = (await stored()).localIndicatorProjects[0];
  expect(indicators.reviewNote).toBe('后续草稿补充意见。');
  expect(indicators.versions[0].reviewNote).toBe('初次论证意见。');
  const trialResults = await page.evaluate(async () => {
    const { trialLevel } = await import('/src/services/governmentWorkspace.js');
    return [trialLevel(0, { direction: 'lower', first: 0, second: 1, third: 2 }), trialLevel(null, { direction: 'lower', first: 0, second: 1, third: 2 }), trialLevel(1, { direction: 'lower', first: null, second: null, third: null }), trialLevel(1, { direction: 'lower', first: 3, second: 2, third: 1 }), trialLevel(95, { direction: 'higher', first: 90, second: 80, third: 70 })];
  });
  expect(trialResults).toEqual(['一级', '数据缺失', '待设置基准值', '基准值顺序待校准', '一级']);
  console.log('PASS 指标项目、样本测算、研究试评价、缺失值及方向校验、论证版本隔离');

  await login('gov_zunyi');
  await go('/app/government-data');
  await expect(bodyRows()).toHaveCount(4);
  await go('/app/enterprise-archives');
  await expect(bodyRows()).toHaveCount(4);
  await login('gov_renhuai');
  await go('/app/government-data');
  await expect(bodyRows()).toHaveCount(2);
  for (const path of ['/app/government-data/ent_07', '/app/enterprise-archives/ent_07']) {
    await go(path);
    await expect(page).toHaveURL(/app\/government$/);
  }
  await go('/app/industry-reports');
  await expect(page.getByRole('button', { name: '进入编制', exact: true })).toHaveCount(0);
  await go('/app/industry-indicators');
  await expect(page.getByRole('button', { name: '进入建设', exact: true })).toHaveCount(0);
  console.log('PASS 省市县辖区边界、跨辖区URL拦截及账号草稿隔离');

  await page.evaluate(async () => {
    const { enterpriseData } = await import('/src/data/store.js');
    const data = enterpriseData('ent_01');
    data.delivery.status = 'plan_submitted';
    data.delivery.planVersions.at(-1).decision = null;
  });
  await go('/app/enterprise-archives/ent_01?p=solution');
  await expect(page.getByRole('button', { name: '批准方案并进入实施考察', exact: true })).toHaveCount(0);
  await go('/app/oa/ent_01?stage=delivery&detail=plan');
  await expect(page.getByRole('button', { name: '批准方案并进入实施考察', exact: true })).toBeVisible();
  await login('ent_01');
  for (const path of ['/app/government-data', '/app/enterprise-archives', '/app/industry-reports', '/app/industry-indicators']) {
    await go(path);
    await expect(page).toHaveURL(/app\/home$/);
  }
  console.log('PASS 企业档案只读、正式操作留在OA、企业账号不能进入政府页面');
  expect(errors).toEqual([]);
  console.log('PASS 浏览器无运行错误');
} finally { await browser.close(); }
