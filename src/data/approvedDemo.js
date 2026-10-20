import { accounts } from "./domain.js";
import { createSnapshot, upgradeEnterprise } from "./auditWorkflow.js";
import {
  clone,
  initDelivery,
  baseline,
  schemeLibrary,
  measures,
  createReport,
  timestamp,
} from "./deliveryWorkflow.js";
import { experts } from "./experts.js";
export const DEMO_PRESET = "approved-continuous-v1";
export function applyApprovedDemo(data) {
  upgradeEnterprise(data);
  if (data.demoPreset === DEMO_PRESET) return data;
  const owner = accounts.find((a) => a.enterpriseId === data.info.id),
    office = accounts.find(
      (a) => a.role === "county" && a.region === data.info.countyId,
    ),
    at = timestamp();
  if (data.delivery.status !== "reported") {
    data.beforeApprovedDemo ??= clone({
      oaWorkflow: data.oaWorkflow,
      delivery: data.delivery,
    });
    if (data.oaWorkflow.status !== "approved") {
      const snapshot = clone(data.oaWorkflow.draft || createSnapshot(data));
      const v = {
        id: crypto.randomUUID(),
        number: data.oaWorkflow.versions.length + 1,
        at,
        snapshot,
        comments: [],
        responses: {},
        revisionNote: "按用户要求加载全部批准演示",
        recipient: office.username,
        recipientName: office.name,
        visit: {
          date: "2026-09-01",
          location: data.info.address,
          people: "模拟检查组",
          scope: "演示资料与现场核查",
          findings: "模拟批准，非实际行政审核",
          completedAt: at,
        },
        decision: "填报数据已模拟批准",
        demo: true,
      };
      data.oaWorkflow.versions.push(v);
      data.oaWorkflow.status = "approved";
      data.oaWorkflow.events.unshift({
        id: crypto.randomUUID(),
        at,
        actor: office.name,
        action: "模拟批准填报数据",
        note: "全部批准演示场景；原流程已保留备份",
      });
    }
    const fileIds = ["plan", "evidence", "acceptance"].map(
      (kind) => `demo-approved-${data.info.id}-${kind}`,
    );
    for (const [i, id] of fileIds.entries())
      if (!data.documents.some((x) => x.id === id))
        data.documents.push({
          id,
          name: [
            "方案模拟批复.txt",
            "整改过程示例凭证.txt",
            "验收模拟批复.txt",
          ][i],
          category: ["方案报备批复", "整改过程凭证", "验收批复"][i],
          year: 2026,
          date: "2026-09-20",
          size: 600,
          status: "演示材料",
          demo: true,
        });
    const f = initDelivery({});
    data.delivery = f;
    const b = baseline(data),
      items = clone([schemeLibrary[0], schemeLibrary[5]]);
    f.selected = {
      id: crypto.randomUUID(),
      name: "已批准演示方案组合",
      items,
      metrics: measures(items),
      baselineVersion: b.version,
    };
    f.revision = 1;
    f.candidates = [
      {
        ...clone(f.selected),
        score: 78.5,
        constraints: clone(f.constraints),
        enabled: [...f.enabled],
      },
    ];
    f.expert = {
      ...clone(experts[0]),
      source: "专家库",
      qualification: "正高级工程师（演示资质）",
      files: [],
    };
    const review = {
      id: crypto.randomUUID(),
      revision: 1,
      expert: clone(f.expert),
      content: "已模拟完成方案复核，建议保持计量与运行记录。",
      at,
      recorder: owner.name,
    };
    f.expertReviews = [review];
    const p = {
      id: crypto.randomUUID(),
      number: 1,
      at,
      plan: clone(f.selected),
      constraints: clone(f.constraints),
      baseline: clone(b),
      expertReview: clone(review),
      note: "全部审批完成演示方案",
      recipient: office.username,
      decision: {
        result: "approved",
        actor: office.name,
        at,
        approvalNo: `模拟方案批复-${data.info.id}`,
        periodStart: "2026-07-01",
        periodEnd: "2026-09-20",
        comment: "已模拟批准并完成实施考察。",
        files: [fileIds[0]],
      },
      demo: true,
    };
    f.planVersions = [p];
    f.records = items.map((s) => ({
      id: crypto.randomUUID(),
      schemeId: s.id,
      date: "2026-09-15",
      progress: 100,
      content: s.name + "已完成（演示记录），纳入持续维护。",
      reason: "",
      files: [fileIds[1]],
      at,
      author: owner.name,
      demo: true,
    }));
    f.acceptanceDraft = {
      approvalNo: p.decision.approvalNo,
      conclusion: "模拟完成本轮验收，进入持续清洁生产。",
      files: [fileIds[1]],
      checks: [
        {
          id: "demo-check",
          name: "批准方案完成率",
          basis: "模拟方案批准要求，仅用于展示流程",
          operator: "≥",
          target: 100,
          actual: 100,
          unit: "%",
          files: [fileIds[1]],
        },
      ],
    };
    f.acceptanceVersions = [
      {
        id: crypto.randomUUID(),
        number: 1,
        at,
        draft: clone(f.acceptanceDraft),
        plan: clone(p),
        records: clone(f.records),
        continuity: clone(data.rounds[3].continuity),
        decision: {
          result: "approved",
          actor: office.name,
          at,
          date: "2026-09-20",
          inspection: "模拟检查整改记录及凭证。",
          guidance: "持续跟踪生产、资源消耗和污染物排放，定期补充改进记录。",
          comment: "模拟验收通过。",
          approvalNo: `模拟验收批复-${data.info.id}`,
          files: [fileIds[2]],
        },
        demo: true,
      },
    ];
    f.events = [
      {
        id: crypto.randomUUID(),
        at,
        actor: office.name,
        action: "加载全部批准演示",
        note: "方案报备、实施考察和验收均已模拟完成，原有流程保留备份。",
      },
    ];
    f.status = "accepted";
    createReport(data, owner);
  }
  data.continuousRecords ??= [
    {
      id: crypto.randomUUID(),
      period: "2026-09",
      production: 525,
      energy: 195,
      water: 4800,
      nox: 0.18,
      content: "持续跟踪回用水、能耗与设备运行，完善月度计量台账（示例）。",
      next: "复核下一期计量数据并检查设备维护情况。",
      files: [],
      at,
      author: owner.name,
      demo: true,
    },
  ];
  data.demoPreset = DEMO_PRESET;
  return data;
}
export function demoAttachment(id) {
  const match = /^demo-approved-(ent_0[1-8])-(plan|evidence|acceptance)$/.exec(
    id,
  );
  if (!match) return null;
  return new Blob(
    [
      `清洁生产智慧审核平台 · 模拟材料\n企业账号：${match[1]}\n材料类型：${{ plan: "方案批准", evidence: "整改凭证", acceptance: "验收批准" }[match[2]]}\n该文件仅用于前端“全部已批准”场景展示，不是实际批复或企业原件。\n本轮流程已模拟完成，企业继续填写持续清洁生产记录。`,
    ],
    { type: "text/plain;charset=utf-8" },
  );
}
