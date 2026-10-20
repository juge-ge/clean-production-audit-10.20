import test from "node:test";
import assert from "node:assert/strict";
import { seedEnterprise } from "../src/data/domain.js";
import { upgradeEnterprise } from "../src/data/auditWorkflow.js";
import { approvedData, owner, reviewer, user } from "./delivery-fixture.mjs";
import * as w from "../src/data/deliveryWorkflow.js";
function plan(d) {
  const c = w.generateCandidates(d, owner)[0];
  assert.ok(c);
  w.selectCandidate(d, owner, c.id);
  w.setExpert(d, owner, {
    name: "演示专家",
    organization: "研究所",
    source: "专家库",
    qualification: "高级工程师",
    files: [],
  });
  w.recordExpertReview(d, owner, "已核实示例方案参数与工艺适用性");
}
function approvedPlan(d) {
  plan(d);
  w.submitPlan(d, owner, "请审核");
  w.decidePlan(d, reviewer, "approved", {
    comment: "按报备实施",
    approvalNo: "方案批复-01",
    periodStart: "2026-10-16",
    periodEnd: "2027-02-01",
  });
}
function acceptance(d) {
  for (const s of w.approvedPlan(d).plan.items)
    w.addProgress(d, owner, {
      schemeId: s.id,
      date: "2026-12-20",
      progress: 100,
      content: "完成并核验",
      files: ["f1"],
    });
  d.delivery.acceptanceDraft = {
    approvalNo: "相关批准-01",
    conclusion: "申请验收",
    files: ["f1"],
    checks: [
      {
        id: "m1",
        name: "单位产品能耗",
        basis: "批准目标",
        operator: "≤",
        target: 0.4,
        actual: 0.38,
        unit: "tce/t",
        files: ["f1"],
      },
    ],
  };
}
test("填报未获批不得优化；仅本企业可操作，升级不覆盖用户输入", () => {
  const d = upgradeEnterprise(seedEnterprise("ent_01"));
  assert.throws(() => w.generateCandidates(d, owner), /填报数据审批/);
  d.delivery.constraints.budget = 125;
  upgradeEnterprise(d);
  assert.equal(d.delivery.constraints.budget, 125);
  const a = approvedData();
  assert.throws(() => w.generateCandidates(a, user("ent_02")));
  assert.throws(() => w.createReport(a, owner));
});
test("使用获批基准、筛选可行组合、权重和无解反馈", () => {
  const d = approvedData(),
    b = w.baseline(d);
  d.rounds[3].survey.energy[0].amount = 999999;
  assert.equal(w.baseline(d).energy, b.energy);
  const r = w.generateCandidates(d, owner);
  assert.ok(r.length && r.length <= 3);
  for (const c of r)
    assert.ok(
      w
        .constraintsCheck(c.items, d.delivery.constraints, b)
        .every((x) => x.pass),
    );
  assert.ok(r.every((c, i) => i === 0 || r[i - 1].score >= c.score));
  w.saveConstraints(d, owner, { ...d.delivery.constraints, budget: 0 });
  assert.deepEqual(w.generateCandidates(d, owner), []);
  assert.throws(() =>
    w.saveConstraints(d, owner, {
      ...d.delivery.constraints,
      weights: { cost: 0, energy: 0, water: 0, nox: 0 },
    }),
  );
});
test("对话建议需确认；约束或参与方案变化使旧候选失效", () => {
  const d = approvedData(),
    before = w.clone(d.delivery.constraints),
    p = w.parseDemand("预算 100 万，停产 3 天，节水至少 10%，优先节水", before);
  assert.deepEqual(d.delivery.constraints, before);
  assert.equal(p.next.budget, 100);
  assert.equal(p.next.minWater, 10);
  const c = w.generateCandidates(d, owner)[0];
  d.delivery.enabled.pop();
  assert.throws(() => w.selectCandidate(d, owner, c.id), /变化/);
  w.saveConstraints(d, owner, p.next);
  assert.equal(d.delivery.constraints.weights.water, 55);
});
test("人工修订使专家复核过期；自选专家须资质材料；报备冻结历史", () => {
  const d = approvedData();
  plan(d);
  assert.throws(
    () =>
      w.setExpert(d, owner, {
        name: "自选",
        organization: "单位",
        qualification: "高级工程师",
        source: "自选专家",
        files: [],
      }),
    /证明/,
  );
  const p1 = w.submitPlan(d, owner, "第一版");
  const saved = w.clone(p1);
  assert.throws(() =>
    w.decidePlan(d, user("gov_province"), "returned", { comment: "退回" }),
  );
  w.decidePlan(d, reviewer, "returned", { comment: "补充修订依据" });
  w.updatePlanItem(d, owner, {
    ...d.delivery.selected.items[0],
    reason: "专家建议增加维护说明",
  });
  assert.throws(() => w.submitPlan(d, owner, "再次提交"), /复核/);
  w.recordExpertReview(d, owner, "复核人工调整后方案");
  w.submitPlan(d, owner, "已补充");
  assert.deepEqual(p1.plan, saved.plan);
  assert.equal(d.delivery.planVersions.length, 2);
});
test("批准需有效日期；整改需凭证且支持连续追加、回调说明", () => {
  const d = approvedData();
  plan(d);
  w.submitPlan(d, owner, "请审核");
  assert.throws(
    () =>
      w.decidePlan(d, reviewer, "approved", {
        comment: "通过",
        approvalNo: "x",
        periodStart: "2026-02-30",
        periodEnd: "2026-03-01",
      }),
    /日期/,
  );
  w.decidePlan(d, reviewer, "approved", {
    comment: "通过",
    approvalNo: "x",
    periodStart: "2026-10-16",
    periodEnd: "2027-02-01",
  });
  const r = {
    schemeId: w.approvedPlan(d).plan.items[0].id,
    date: "2026-10-20",
    progress: 60,
    content: "已实施",
    files: [],
  };
  assert.throws(() => w.addProgress(d, owner, r), /凭证/);
  r.files = ["f1"];
  w.addProgress(d, owner, r);
  assert.throws(() => w.addProgress(d, owner, { ...r, progress: 30 }), /回调/);
  w.addProgress(d, owner, { ...r, progress: 30, reason: "复核发现返工" });
  assert.equal(d.delivery.records.length, 2);
  assert.equal(d.delivery.records[0].progress, 60);
  assert.throws(() => w.submitAcceptance(d, owner), /补齐/);
});
test("验收达标、退回整改、二次提交、检查批准和报告快照", () => {
  const d = approvedData();
  approvedPlan(d);
  acceptance(d);
  d.delivery.acceptanceDraft.checks[0].actual = 0.5;
  assert.throws(() => w.submitAcceptance(d, owner));
  d.delivery.acceptanceDraft.checks[0].actual = 0.38;
  const a1 = w.submitAcceptance(d, owner);
  assert.throws(() => w.createReport(d, owner));
  assert.throws(() =>
    w.decideAcceptance(d, user("gov_xifeng"), "approved", {}),
  );
  w.decideAcceptance(d, reviewer, "returned", {
    date: "2026-12-21",
    inspection: "已检查",
    guidance: "补充计量校准",
    comment: "请补充",
  });
  d.delivery.acceptanceDraft.checks[0].actual = 0.37;
  w.submitAcceptance(d, owner);
  assert.equal(a1.draft.checks[0].actual, 0.38);
  assert.throws(() =>
    w.decideAcceptance(d, reviewer, "approved", {
      date: "2026-12-22",
      inspection: "复查",
      guidance: "持续跟踪",
      comment: "通过",
      approvalNo: "验收-01",
      files: [],
    }),
  );
  w.decideAcceptance(d, reviewer, "approved", {
    date: "2026-12-22",
    inspection: "复查",
    guidance: "持续跟踪",
    comment: "通过",
    approvalNo: "验收-01",
    files: ["f2"],
  });
  d.documents.push({ id: "f2", name: "验收批复.txt" });
  const report = w.createReport(d, owner);
  assert.equal(report.acceptance.draft.checks[0].actual, 0.37);
  assert.equal(d.delivery.status, "reported");
  assert.ok(d.reports.some((x) => x.generatedId === report.id));
  assert.equal(w.createReport(d, owner).id, report.id);
  d.delivery.acceptanceDraft.checks[0].actual = 8;
  assert.equal(report.acceptance.draft.checks[0].actual, 0.37);
  assert.ok(w.deliveryFileReferenced(d, "f2"));
  assert.throws(() => w.addProgress(d, owner, {}));
});
