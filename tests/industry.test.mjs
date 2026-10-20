import test from "node:test";
import assert from "node:assert/strict";
import { seedEnterprise, accounts, enterprises } from "../src/data/domain.js";
import { upgradeEnterprise, ensureDraft } from "../src/data/auditWorkflow.js";
import { applyApprovedDemo, demoAttachment } from "../src/data/approvedDemo.js";
import {
  industryRows,
  summarize,
  levelRows,
  problemRows,
  planRows,
} from "../src/data/industry.js";
import {
  ensureQuestionnaires,
  visibleSurveys,
  saveSurvey,
  issueSurvey,
  recordResponse,
  scoringResults,
  closeSurvey,
  adoptWeights,
  indicatorTemplate,
} from "../src/data/questionnaires.js";
import { clone, deliveryFileReferenced } from "../src/data/deliveryWorkflow.js";
import { experts } from "../src/data/experts.js";
const user = (n) => accounts.find((a) => a.username === n);
test("全部已批准迁移保留填报与旧流程，重复加载不重建", async () => {
  const d = upgradeEnterprise(seedEnterprise("ent_01"));
  d.info.contact = "用户联系人";
  ensureDraft(d).info.contact = "用户OA联系人";
  d.documents.push({ id: "original", name: "原文件" });
  applyApprovedDemo(d);
  assert.equal(d.info.contact, "用户联系人");
  assert.equal(
    d.beforeApprovedDemo.oaWorkflow.draft.info.contact,
    "用户OA联系人",
  );
  assert.equal(
    d.oaWorkflow.versions.at(-1).snapshot.info.contact,
    "用户OA联系人",
  );
  assert.equal(d.delivery.status, "reported");
  assert.equal(
    d.delivery.acceptanceVersions.at(-1).decision.result,
    "approved",
  );
  const report = d.delivery.report.id,
    files = d.documents.length;
  applyApprovedDemo(d);
  assert.equal(d.delivery.report.id, report);
  assert.equal(d.documents.length, files);
  assert.ok(d.documents.some((x) => x.id === "original"));
  assert.match(
    await demoAttachment("demo-approved-ent_01-acceptance").text(),
    /不是实际批复/,
  );
  d.continuousRecords.push({ files: ["new-file"] });
  assert.ok(deliveryFileReferenced(d, "new-file"));
});
test("政府行业汇总严格按省市县范围，污染物分开且单耗按总量加权", () => {
  const data = Object.fromEntries(
    enterprises.map((e) => [e.id, applyApprovedDemo(seedEnterprise(e.id))]),
  );
  const get = (id) => data[id];
  const province = industryRows(user("gov_province"), get),
    city = industryRows(user("gov_zunyi"), get),
    county = industryRows(user("gov_xifeng"), get);
  assert.equal(province.length, 8);
  assert.equal(city.length, 4);
  assert.equal(county.length, 2);
  assert.ok(county.every((r) => r.countyId === "xifeng"));
  const s = summarize(province);
  assert.equal(s.cod, 33.6);
  assert.equal(s.nox, 20.8);
  assert.equal(s.energyIntensity, Number((s.energy / s.production).toFixed(3)));
  assert.equal(
    levelRows(city).reduce((sum, r) => sum + r.count, 0),
    4,
  );
  assert.ok(
    problemRows(city).every((r) =>
      r.members.every((e) =>
        ["ent_01", "ent_02", "ent_03", "ent_04"].includes(e.id),
      ),
    ),
  );
  assert.equal(planRows(county)[0].count, 2);
  assert.equal(
    industryRows(user("gov_guiyang"), get, { county: "renhuai" }).length,
    0,
  );
  assert.ok(JSON.stringify(data).length < 4_000_000);
});
test("问卷权限、发放锁定、完整回收、平均分与建议权重", () => {
  const db = {},
    county = user("gov_renhuai"),
    other = user("gov_xifeng"),
    province = user("gov_province");
  ensureQuestionnaires(db, county);
  assert.equal(visibleSurveys(db, other).length, 0);
  assert.equal(visibleSurveys(db, province).length, 1);
  const s = saveSurvey(db, county, {
    title: "指标调查",
    industry: "白酒制造",
    deadline: "2026-11-30",
    indicators: clone(indicatorTemplate),
    experts: clone(experts.slice(0, 2)),
  });
  assert.throws(() => issueSurvey(s, other));
  issueSurvey(s, county);
  assert.throws(() => saveSurvey(db, county, s));
  assert.throws(() => recordResponse(s, county, "ex1", []));
  const scores = s.indicators.map((x) => ({
    indicatorId: x.id,
    score: 80,
    comment: "意见",
  }));
  recordResponse(s, county, "ex1", scores);
  assert.equal(scoringResults(s)[0].average, 80);
  assert.throws(() => recordResponse(s, county, "ex3", scores));
  recordResponse(
    s,
    county,
    "ex2",
    scores.map((x) => ({ ...x, score: 100 })),
  );
  assert.equal(scoringResults(s)[0].average, 90);
  assert.throws(() => adoptWeights(s, county));
  closeSurvey(s, county);
  assert.throws(() => recordResponse(s, county, "ex1", scores));
  adoptWeights(s, county);
  assert.equal(
    s.adoptedWeights.reduce((n, x) => n + x.weight, 0),
    100,
  );
  assert.throws(() =>
    saveSurvey(db, county, {
      title: "x",
      industry: "x",
      deadline: "2026-11-01",
      experts: clone(experts),
      indicators: indicatorTemplate.map((x) => ({ ...x, weight: 0 })),
    }),
  );
});
