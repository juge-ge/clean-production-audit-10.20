import test from "node:test";
import assert from "node:assert/strict";
import {
  accounts,
  enterprises,
  scopedEnterprises,
  seedEnterprise,
  documentTypes,
  intensity,
  total,
  initialGraph,
} from "../src/data/domain.js";
test("省市县企业 15 个账号与辖区边界", () => {
  assert.equal(accounts.length, 15);
  for (const a of accounts) {
    const expected = { province: 8, city: 4, county: 2, enterprise: 1 }[a.role];
    assert.equal(scopedEnterprises(a).length, expected, a.username);
  }
  const zunyi = scopedEnterprises(
    accounts.find((a) => a.username === "gov_zunyi"),
  );
  assert.ok(zunyi.every((e) => e.cityId === "zunyi"));
  assert.deepEqual(scopedEnterprises(null), []);
  assert.equal(new Set(enterprises.map((e) => e.id)).size, 8);
});
test("审核轮次及企业数据相互隔离", () => {
  const first = seedEnterprise("ent_01"),
    second = seedEnterprise("ent_02");
  const original = first.rounds[2].survey.products[0].amount;
  first.rounds[3].survey.products[0].amount = 999;
  assert.equal(first.rounds[2].survey.products[0].amount, original);
  assert.equal(second.rounds[3].survey.products[0].amount, 5200);
  first.rounds[3].leadership[0].name = "测试编辑";
  assert.notEqual(first.rounds[2].leadership[0].name, "测试编辑");
});
test("指标汇总与零产量防护", () => {
  assert.equal(total([{ amount: 1.2 }, { amount: 2.3 }]), 3.5);
  assert.equal(total([{ amount: "无效" }]), 0);
  assert.equal(intensity(2550, 6300), "0.405");
  assert.equal(intensity(10, 0), "—");
});
test("资料清单和三类工艺流程", () => {
  for (const name of [
    "公司简易汇报",
    "机电型号",
    "计量器具明细清单",
    "行业整治报告",
    "污染物平衡图（含氮氧化物）",
  ])
    assert.ok(documentTypes.some((t) => t.value === name));
  for (const kind of ["production", "water", "air"]) {
    const g = initialGraph(kind);
    assert.equal(g.nodes.length, 5);
    assert.ok(
      g.edges.every(
        (e) =>
          g.nodes.some((n) => n.id === e.source) &&
          g.nodes.some((n) => n.id === e.target),
      ),
    );
  }
});
