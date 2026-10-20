import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1080}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const base='http://127.0.0.1:5178/';
async function shot(name,fullPage=true){await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(450);await page.screenshot({path:'output/'+name+'.png',fullPage});}
await page.goto(base+'homepage.html',{waitUntil:'domcontentloaded'});await page.locator('.entry-card').first().waitFor();await shot('homepage-original-full');await page.locator('.entry-card').first().scrollIntoViewIfNeeded();await page.screenshot({path:'output/homepage-original-entries.png'});
await page.goto(base+'#/login/enterprise');await page.getByRole('button',{name:'登 录',exact:true}).click();await expect(page.locator('.admin-shell')).toBeVisible();await shot('dashboard');
for(const phase of ['info','documents','organization','survey','analysis','solution','summary']){
  await page.goto(base+'#/app/enterprise?p='+phase);await expect(page.locator('.phase-steps')).toBeVisible();await shot('final-'+phase);
}
await page.goto(base+'#/app/oa');await expect(page.locator('.oa-fill-toolbar')).toBeVisible();await shot('final-oa-fill');await page.locator('.oa-primary-tabs button').nth(1).click();await shot('final-oa-submit');
for(const section of ['experts','consultants']){await page.goto(base+'#/app/'+section);await expect(page.locator('.page-title')).toHaveText(section==='experts'?'专家库':'第三方咨询库');await expect(page.locator('.vxe-table')).toBeVisible();await page.getByRole('button',{name:'查看详情',exact:true}).first().click();await expect(page.locator('.n-modal')).toBeVisible();await page.keyboard.press('Escape');}
await page.setViewportSize({width:390,height:844});await page.goto(base+'#/app/oa');await expect(page.locator('.enterprise-info-table')).toBeVisible();await shot('final-oa-mobile');
expect(errors).toEqual([]);fs.writeFileSync('output/visual-errors.json',JSON.stringify({errors,checked:['原始门户','七阶段企业详情','OA填报与提交','专家和咨询名录','移动端OA']},null,2));
await browser.close();console.log('VISUAL CHECKS PASSED');
