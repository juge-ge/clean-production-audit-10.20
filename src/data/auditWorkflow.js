import { accounts, scopedEnterprises, total, intensity } from "./domain.js";
import { initDelivery } from "./deliveryWorkflow.js";

export const copy = (value) => JSON.parse(JSON.stringify(value));
const id = () => crypto.randomUUID();
const now = () => new Date().toLocaleString("zh-CN", { hour12: false });
export const oaSections = [
  { id: "info", name: "企业情况" },
  { id: "organization", name: "筹划与组织" },
  { id: "survey", name: "现状调研与对标" },
  { id: "analysis", name: "问题分析与目标设置" },
];
export const statusLabels = {
  draft: "待填报",
  submitted: "已提交 · 待受理",
  reviewing: "资料审核中",
  site_visit: "待现场考察",
  returned: "已退回 · 待修订",
  revising: "企业修订中",
  approved: "填报数据已获批",
};

// Add only missing properties so previous local edits and uploaded file IDs survive upgrades.
export function upgradeEnterprise(data) {
  for (const [key, round] of Object.entries(data.rounds)) {
    const current = Number(key) === 3,
      year = current ? 2026 : Number(key) === 2 ? 2023 : 2020;
    round.schemes ??= [
      {
        id: `s${key}-1`,
        type: "无低费方案",
        name: "蒸汽阀门巡检与保温修复",
        category: "能源节约",
        department: "设备部",
        owner: "王芳",
        investment: 2.5,
        saving: 5.2,
        start: `${year}-09-01`,
        due: `${year}-10-30`,
        progress: current ? 80 : 100,
        status: current ? "实施中" : "已完成",
        description: "排查蒸汽管线泄漏，修复保温层，完善巡检台账。",
        result: current
          ? "已完成 8 处保温修复，剩余 2 处待检修窗口处理。"
          : "完成管网保温修复并纳入日常巡检。",
        evidence: "示例记录，待企业核实",
        logs: [],
      },
      {
        id: `s${key}-2`,
        type: "中高费方案",
        name: "冷凝水回收系统改造",
        category: "节水与能源回收",
        department: "生产部",
        owner: "李伟",
        investment: 86,
        saving: 24,
        start: `${year}-09-15`,
        due: `${year}-12-20`,
        progress: current ? 45 : 100,
        status: current ? "实施中" : "已完成",
        description: "增设冷凝水收集管路、回收水箱及计量装置。",
        result: current
          ? "设备采购完成，正在安装回收管路。"
          : "完成系统调试并持续记录回收量。",
        evidence: "示例记录，待企业核实",
        logs: [],
      },
    ];
    round.continuity ??= [
      {
        id: `c${key}-1`,
        name: "持续跟踪单位产品能耗与水耗",
        target: "每月核对一次能耗、水耗及产量台账",
        measures: "落实分项计量，复核异常数据，形成月度分析记录。",
        owner: "张敏",
        department: "安全环保部",
        due: `${year}-12-31`,
        status: current ? "持续执行" : "已完成",
        effect: current
          ? "已完成 9 月台账核对，10 月计量记录正在收集。"
          : "已归档年度执行记录",
        source: "持续清洁生产计划（示例）",
        page: 1,
      },
      {
        id: `c${key}-2`,
        name: "清洁生产培训与制度维护",
        target: "每季度组织一次培训",
        measures: "更新岗位操作规程，开展节能、节水与污染预防培训。",
        owner: "李伟",
        department: "生产部",
        due: `${year}-12-31`,
        status: current ? "计划中" : "已完成",
        effect: "示例计划，待企业填写实际执行情况",
        source: "",
        page: 1,
      },
    ];
    round.assessment ??= {
      standard: "",
      version: "",
      year: year - 1,
      boundary: "厂区生产及辅助系统",
      level: "待评价",
      score: null,
      conclusion: "",
      criteria: [
        {
          id: "a1",
          name: "生产工艺与装备",
          actual: "详见生产工艺流程图与设备信息表",
          requirement: "",
          result: "待核对",
          source: "主要设备一览表（示例）",
          page: 3,
        },
        {
          id: "a2",
          name: "资源能源利用",
          actual: "详见产品产量、能耗和水耗计算结果",
          requirement: "",
          result: "待核对",
          source: "综合能源利用表（示例）",
          page: 3,
        },
        {
          id: "a3",
          name: "污染物产生与排放",
          actual: "详见污染物排放表及治理工艺",
          requirement: "",
          result: "待核对",
          source: "排污许可执行报告（示例）",
          page: 26,
        },
        {
          id: "a4",
          name: "清洁生产管理",
          actual: "已建立审核小组和工作计划",
          requirement: "",
          result: "待核对",
          source: "",
          page: 1,
        },
      ],
    };
  }
  data.reports ??= [1, 2, 3].map((round) => ({
    id: `report-${round}`,
    round,
    year: round === 3 ? 2026 : round === 2 ? 2023 : 2020,
    name: `第 ${round} 轮清洁生产审核报告`,
    status: round === 3 ? "编制中" : "历史归档",
    date: round === 3 ? "" : `${round === 2 ? 2023 : 2020}-12-20`,
    fileId: "",
    note: "示例报告，请关联企业实际报告文件。",
  }));
  data.oaWorkflow ??= {
    status: "draft",
    draft: null,
    versions: [],
    events: [],
    responses: {},
    revisionNote: "",
  };
  initDelivery(data);
  return data;
}

// Only these four business sections enter an OA submission. Schemes/material-library/summary do not.
export function createSnapshot(data) {
  const r = data.rounds[3];
  return copy({
    info: data.info,
    documents: data.documents,
    rounds: {
      3: {
        info: data.info,
        leadership: r.leadership,
        team: r.team,
        plan: r.plan,
        survey: r.survey,
        graphs: r.graphs,
        equipment: r.equipment,
        problems: r.problems,
        assessment: r.assessment,
      },
    },
  });
}
export function ensureDraft(data) {
  upgradeEnterprise(data);
  data.oaWorkflow.draft ??= createSnapshot(data);
  return data.oaWorkflow.draft;
}
export const latestVersion = (flow) => flow.versions.at(-1);
export const recipientFor = (data) =>
  accounts.find((a) => a.role === "county" && a.region === data.info.countyId);
export const canReview = (data, user) =>
  user?.username === recipientFor(data)?.username;
export function levelMetrics(snapshot) {
  const r = snapshot.rounds[3],
    production = total(r.survey.products);
  return {
    production,
    energy: intensity(total(r.survey.energy), production),
    water: intensity(total(r.survey.water), production),
    level: r.assessment.level,
  };
}
export function checkSnapshot(snapshot) {
  const r = snapshot.rounds[3],
    info = snapshot.info;
  const required = [
    "name",
    "creditCode",
    "legalPerson",
    "contact",
    "phone",
  ].every((k) => String(info[k] || "").trim());
  const checks = [
    {
      section: "企业情况",
      field: "基础信息及联系人",
      ok: required,
      blocking: true,
      advice: "补齐企业名称、信用代码、法人、联系人及电话。",
    },
    {
      section: "筹划与组织",
      field: "领导小组、工作小组及计划",
      ok: r.leadership.length > 0 && r.team.length > 0 && r.plan.length > 0,
      blocking: true,
      advice: "至少填写一名领导小组成员、一名工作小组成员及一项工作计划。",
    },
    {
      section: "现状调研与对标",
      field: "产品产量与数据有效性",
      ok:
        total(r.survey.products) > 0 &&
        Object.values(r.survey)
          .flat()
          .every(
            (row) =>
              Number.isFinite(Number(row.amount)) &&
              row.amount !== "" &&
              row.amount !== null &&
              Number(row.amount) >= 0,
          ),
      blocking: true,
      advice: "核实产量大于零、数量非空且非负，并补全异常明细。",
    },
    {
      section: "现状调研与对标",
      field: "数据来源与页码",
      ok: Object.values(r.survey)
        .flat()
        .every(
          (row) =>
            row.source && !row.source.includes("示例") && Number(row.page) > 0,
        ),
      blocking: false,
      advice: "将示例来源替换为实际原始资料，逐项核对文档名称与页码。",
    },
    {
      section: "现状调研与对标",
      field: "生产及治理工艺",
      ok: ["production", "water", "air"].every(
        (k) => r.graphs[k]?.nodes.length && r.graphs[k]?.description?.trim(),
      ),
      blocking: true,
      advice: "补全生产、废水、废气流程及工艺描述。",
    },
    {
      section: "问题分析与目标设置",
      field: "适用标准与自评结论",
      ok: !!(
        r.assessment.standard.trim() &&
        r.assessment.version.trim() &&
        r.assessment.level !== "待评价"
      ),
      blocking: false,
      advice:
        "填写适用标准、版本或文号及企业自评水平，审核人员将核实评价依据。",
    },
    {
      section: "问题分析与目标设置",
      field: "问题与目标",
      ok:
        r.problems.length > 0 &&
        r.problems.every((p) => p.name && p.target && p.owner),
      blocking: false,
      advice: "完善问题依据、整改目标、责任人和完成时间。",
    },
  ];
  return checks.map((c, i) => ({
    ...c,
    id: `check-${i}`,
    result: c.ok ? "已填写" : c.blocking ? "需补填" : "建议核对",
    advice: c.ok ? "已填写，请结合原始资料核实内容。" : c.advice,
  }));
}
const requireState = (flow, allowed) => {
  if (!allowed.includes(flow.status))
    throw new Error("当前办理状态不允许此操作，请刷新页面。");
};
const requireOwner = (data, user) => {
  if (user?.role !== "enterprise" || user.enterpriseId !== data.info.id)
    throw new Error("仅本企业管理员可办理。");
};
const requireReviewer = (data, user) => {
  if (!canReview(data, user)) throw new Error("仅本次接收单位可办理审核。");
};
const event = (flow, user, action, note = "") =>
  flow.events.unshift({ id: id(), at: now(), actor: user.name, action, note });

export function syncDraft(data, user) {
  requireOwner(data, user);
  requireState(data.oaWorkflow, ["draft", "revising"]);
  data.oaWorkflow.draft = createSnapshot(data);
  event(
    data.oaWorkflow,
    user,
    "同步填报数据",
    "从企业详情同步四部分数据到当前草稿",
  );
}
export function submit(data, user) {
  requireOwner(data, user);
  const flow = data.oaWorkflow;
  requireState(flow, ["draft", "revising"]);
  const snapshot = ensureDraft(data),
    checks = checkSnapshot(snapshot);
  if (checks.some((c) => c.blocking && !c.ok))
    throw new Error("请先补齐提交检查中的必填内容。");
  if (flow.status === "revising") {
    if (!flow.revisionNote.trim()) throw new Error("请填写本次修订说明。");
    if (latestVersion(flow).comments.some((c) => !flow.responses[c.id]?.trim()))
      throw new Error("请逐条回复上次审核意见。");
  }
  const recipient = recipientFor(data);
  if (!recipient) throw new Error("尚未配置上级接收单位。");
  const version = {
    id: id(),
    number: flow.versions.length + 1,
    at: now(),
    recipient: recipient.username,
    recipientName: recipient.name,
    snapshot: copy(snapshot),
    checks: copy(checks),
    comments: [],
    visit: null,
    revisionNote: flow.revisionNote,
    responses: copy(flow.responses),
    decision: "",
  };
  flow.versions.push(version);
  flow.status = "submitted";
  event(
    flow,
    user,
    version.number === 1 ? "提交审核" : "修订后再次提交",
    `V${version.number} → ${recipient.name}`,
  );
  return version;
}
export function startReview(data, user) {
  requireReviewer(data, user);
  requireState(data.oaWorkflow, ["submitted"]);
  data.oaWorkflow.status = "reviewing";
  event(data.oaWorkflow, user, "受理并开始审核");
}
export function addComment(data, user, comment) {
  requireReviewer(data, user);
  requireState(data.oaWorkflow, ["reviewing", "site_visit"]);
  if (
    !oaSections.some((s) => s.name === comment.section) ||
    !comment.field?.trim() ||
    !comment.content?.trim()
  )
    throw new Error("请填写意见所属模块、数据项和具体意见。");
  latestVersion(data.oaWorkflow).comments.push({
    ...copy(comment),
    id: id(),
    author: user.name,
    at: now(),
  });
  event(
    data.oaWorkflow,
    user,
    "新增审核意见",
    `${comment.section} / ${comment.field}`,
  );
}
export function scheduleVisit(data, user, visit) {
  requireReviewer(data, user);
  requireState(data.oaWorkflow, ["reviewing"]);
  if (
    !visit.date ||
    !/^\d{4}-\d{2}-\d{2}$/.test(visit.date) ||
    !visit.location?.trim() ||
    !visit.people?.trim()
  )
    throw new Error("请填写有效日期（YYYY-MM-DD）、地点和考察人员。");
  latestVersion(data.oaWorkflow).visit = {
    ...copy(visit),
    findings: "",
    completedAt: "",
  };
  data.oaWorkflow.status = "site_visit";
  event(
    data.oaWorkflow,
    user,
    "安排现场考察",
    `${visit.date} · ${visit.location}`,
  );
}
export function returnForRevision(data, user, findings) {
  requireReviewer(data, user);
  requireState(data.oaWorkflow, ["site_visit"]);
  const v = latestVersion(data.oaWorkflow);
  if (!findings?.trim()) throw new Error("请记录现场考察情况与整改要求。");
  if (!v.comments.length)
    throw new Error("请至少填写一条具体数据审核意见，便于企业逐项修订。");
  v.visit.findings = findings.trim();
  v.visit.completedAt = now();
  v.decision = "退回修订";
  data.oaWorkflow.status = "returned";
  event(data.oaWorkflow, user, "完成现场考察并退回修订", findings);
}
export function beginRevision(data, user) {
  requireOwner(data, user);
  requireState(data.oaWorkflow, ["returned"]);
  const flow = data.oaWorkflow;
  flow.draft = copy(latestVersion(flow).snapshot);
  flow.responses = {};
  flow.revisionNote = "";
  flow.status = "revising";
  event(flow, user, "开始修订", "按审核意见修改填报数据并逐条回复");
}
export function approve(data, user, decision) {
  requireReviewer(data, user);
  requireState(data.oaWorkflow, ["reviewing", "site_visit"]);
  const flow = data.oaWorkflow,
    v = latestVersion(flow);
  if (flow.status === "site_visit")
    throw new Error("请先完成本次现场考察并反馈企业。");
  if (!flow.versions.some((x) => x.visit?.completedAt))
    throw new Error("本轮尚无已完成的现场考察记录。");
  if (v.comments.length)
    throw new Error(
      "当前版本有待企业回复的审核意见，请再次安排考察并退回修订。",
    );
  if (!decision?.trim()) throw new Error("请填写审核结论。");
  v.decision = decision.trim();
  flow.status = "approved";
  event(flow, user, "填报数据审核通过", decision);
}
export function visibleSubmissions(user, getData) {
  return scopedEnterprises(user)
    .map((e) => getData(e.id))
    .filter((d) => d.oaWorkflow.versions.length)
    .map((d) => ({
      id: d.info.id,
      name: d.info.name,
      city: d.info.city,
      county: d.info.county,
      status: statusLabels[d.oaWorkflow.status],
      version: latestVersion(d.oaWorkflow).number,
      at: latestVersion(d.oaWorkflow).at,
      recipient: latestVersion(d.oaWorkflow).recipientName,
      level: latestVersion(d.oaWorkflow).snapshot.rounds[3].assessment.level,
    }));
}
