import { accounts, seedEnterprise } from "../src/data/domain.js";
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
} from "../src/data/auditWorkflow.js";
export const user = (name) => accounts.find((a) => a.username === name);
export const owner = user("ent_01"),
  reviewer = user("gov_renhuai");
export function approvedData() {
  const d = upgradeEnterprise(seedEnterprise("ent_01"));
  ensureDraft(d);
  submit(d, owner);
  startReview(d, reviewer);
  addComment(d, reviewer, {
    section: "企业情况",
    field: "联系人",
    content: "核对联系人",
    severity: "需修订",
  });
  scheduleVisit(d, reviewer, {
    date: "2026-10-16",
    location: "企业现场",
    people: "演示检查组",
    scope: "现场核查",
  });
  returnForRevision(d, reviewer, "核查台账后修改联系人");
  beginRevision(d, owner);
  d.oaWorkflow.responses[d.oaWorkflow.versions[0].comments[0].id] = "已核实";
  d.oaWorkflow.revisionNote = "根据现场意见核实联系人";
  submit(d, owner);
  startReview(d, reviewer);
  approve(d, reviewer, "填报数据审核通过（测试）");
  return d;
}
