import test from "node:test";
import assert from "node:assert/strict";
import { accounts, seedEnterprise, phases } from "../src/data/domain.js";
import {
  upgradeEnterprise,
  ensureDraft,
  submit,
  startReview,
  addComment,
  scheduleVisit,
  returnForRevision,
  beginRevision,
  approve,
  syncDraft,
  checkSnapshot,
  visibleSubmissions,
} from "../src/data/auditWorkflow.js";
const user = (name) => accounts.find((a) => a.username === name),
  owner = user("ent_01"),
  reviewer = user("gov_renhuai");
const setup = () => upgradeEnterprise(seedEnterprise("ent_01"));
test("升级保留已编辑数据，阶段顺序正确，重复升级不覆盖新记录", () => {
  const data = seedEnterprise("ent_01");
  data.info.contact = "已编辑联系人";
  data.documents.push({ id: "original-file" });
  upgradeEnterprise(data);
  data.rounds[3].schemes[0].progress = 25;
  upgradeEnterprise(data);
  assert.equal(data.info.contact, "已编辑联系人");
  assert.equal(data.documents[0].id, "original-file");
  assert.equal(data.rounds[3].schemes[0].progress, 25);
  assert.deepEqual(
    phases.map((p) => p.id),
    [
      "info",
      "documents",
      "organization",
      "survey",
      "analysis",
      "solution",
      "summary",
    ],
  );
});
test("OA仅收集四部分、提交快照与草稿和企业详情相互独立", () => {
  const d = setup(),
    draft = ensureDraft(d);
  draft.info.contact = "提交联系人";
  const v = submit(d, owner);
  d.info.contact = "详情后来修改";
  draft.info.contact = "草稿后来修改";
  assert.equal(v.snapshot.info.contact, "提交联系人");
  assert.equal(v.snapshot.rounds[3].schemes, undefined);
  assert.equal(v.snapshot.rounds[3].continuity, undefined);
  assert.equal(v.snapshot.rounds[2], undefined);
  assert.throws(() => syncDraft(d, owner));
  assert.throws(() => submit(d, owner));
});
test("无有效生产数据不得提交，四模块都生成检查建议", () => {
  const d = setup(),
    draft = ensureDraft(d);
  draft.rounds[3].survey.products.forEach((r) => (r.amount = 0));
  assert.throws(() => submit(d, owner), /必填/);
  assert.equal(d.oaWorkflow.versions.length, 0);
  assert.equal(new Set(checkSnapshot(draft).map((c) => c.section)).size, 4);
});
test("审核接收单位与辖区范围，未提交草稿不进入政府列表", () => {
  const d = setup();
  ensureDraft(d);
  assert.deepEqual(
    visibleSubmissions(user("gov_province"), (id) =>
      id === "ent_01" ? d : upgradeEnterprise(seedEnterprise(id)),
    ),
    [],
  );
  assert.throws(() => submit(d, user("ent_02")));
  submit(d, owner);
  assert.throws(() => startReview(d, user("gov_xifeng")));
  assert.throws(() => startReview(d, user("gov_province")));
  assert.equal(
    visibleSubmissions(user("gov_zunyi"), (id) =>
      id === "ent_01" ? d : upgradeEnterprise(seedEnterprise(id)),
    ).length,
    1,
  );
  assert.equal(
    visibleSubmissions(user("gov_guiyang"), (id) =>
      id === "ent_01" ? d : upgradeEnterprise(seedEnterprise(id)),
    ).length,
    0,
  );
});
test("提交、逐项意见、现场考察、修订回复、二次提交与办结", () => {
  const d = setup();
  ensureDraft(d);
  const v1 = submit(d, owner);
  startReview(d, reviewer);
  assert.throws(() => approve(d, reviewer, "通过"), /现场/);
  addComment(d, reviewer, {
    section: "企业情况",
    field: "联系人",
    content: "请核实联系人",
    severity: "需修订",
  });
  assert.throws(() =>
    addComment(d, reviewer, { section: "未知模块", field: "a", content: "b" }),
  );
  scheduleVisit(d, reviewer, {
    date: "2026-10-20",
    location: "企业厂区",
    people: "县局审核人员",
    scope: "核查台账",
  });
  assert.throws(() => returnForRevision(d, reviewer, ""));
  returnForRevision(d, reviewer, "现场核查发现联系人需更新");
  beginRevision(d, owner);
  d.oaWorkflow.draft.info.contact = "修订联系人";
  d.oaWorkflow.revisionNote = "更新联系人并核查现场信息";
  assert.throws(() => submit(d, owner), /逐条回复/);
  d.oaWorkflow.responses[v1.comments[0].id] = "已修改企业情况联系人";
  const v2 = submit(d, owner);
  assert.equal(v1.snapshot.info.contact, "张敏");
  assert.equal(v2.snapshot.info.contact, "修订联系人");
  assert.ok(v1.visit.completedAt);
  assert.equal(v2.responses[v1.comments[0].id], "已修改企业情况联系人");
  startReview(d, reviewer);
  approve(d, reviewer, "已复核填报数据与现场整改情况，审核办结");
  assert.equal(d.oaWorkflow.status, "approved");
  assert.equal(d.oaWorkflow.versions.length, 2);
  assert.ok(d.oaWorkflow.events.length >= 8);
  assert.throws(() => beginRevision(d, owner));
  assert.throws(() =>
    addComment(d, reviewer, {
      section: "企业情况",
      field: "联系人",
      content: "重复",
    }),
  );
});
