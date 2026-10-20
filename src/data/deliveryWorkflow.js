import { randomId } from "../services/id.js";
import { accounts, total } from "./domain.js";

export const clone = (value) => JSON.parse(JSON.stringify(value));
const uid = () => randomId();
const validDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export const timestamp = () =>
  new Date().toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
  });
export const deliveryLabels = {
  planning: "方案优化与专家修订",
  plan_submitted: "方案报备待批准",
  plan_returned: "方案退回修改",
  implementing: "方案实施考察期",
  acceptance_submitted: "验收申请待检查",
  acceptance_returned: "验收退回整改",
  accepted: "验收通过 · 待生成报告",
  reported: "持续清洁生产 · 报告已归档",
};
export const constraintFields = [
  { key: "budget", label: "投资上限", unit: "万元", min: 0 },
  { key: "maxDays", label: "工期上限", unit: "天", min: 1 },
  { key: "maxDowntime", label: "停产上限", unit: "天", min: 0 },
  { key: "maxPayback", label: "回收期上限", unit: "年", min: 0.1 },
  { key: "minEnergy", label: "最低节能比例", unit: "%", min: 0, max: 100 },
  { key: "minWater", label: "最低节水比例", unit: "%", min: 0, max: 100 },
  { key: "minNox", label: "最低 NOx 减排比例", unit: "%", min: 0, max: 100 },
];
export const defaultConstraints = {
  budget: 200,
  maxDays: 90,
  maxDowntime: 7,
  maxPayback: 15,
  minEnergy: 3,
  minWater: 5,
  minNox: 0,
  weights: { cost: 25, energy: 30, water: 30, nox: 15 },
};
// Demonstration cases only. Quantities share the same annual boundary; effects are not measured values.
export const schemeLibrary = [
  {
    id: "lib-1",
    name: "蒸汽阀门巡检与保温修复",
    type: "无低费方案",
    area: "蒸汽系统",
    investment: 2.5,
    saving: 5.2,
    energy: 90,
    water: 0,
    nox: 0.005,
    days: 15,
    downtime: 0,
    description: "修复管网保温、处理阀门泄漏并建立定期巡检记录。",
    source: "调研方案库 · 酿造行业样例 01",
    prerequisite: "核实蒸汽管网泄漏点及保温层情况",
  },
  {
    id: "lib-2",
    name: "冷凝水回收系统改造",
    type: "中高费方案",
    area: "蒸汽与用水",
    investment: 86,
    saving: 24,
    energy: 220,
    water: 7500,
    nox: 0.012,
    days: 60,
    downtime: 3,
    description: "增设回收管路与计量装置，将可回用冷凝水引入合适用水环节。",
    source: "调研方案库 · 酿造行业样例 02",
    prerequisite: "核实回收水质、回水温度与管路敷设条件",
  },
  {
    id: "lib-3",
    name: "循环泵变频与运行优化",
    type: "中高费方案",
    area: "电机系统",
    investment: 38,
    saving: 10,
    energy: 120,
    water: 0,
    nox: 0,
    days: 35,
    downtime: 1,
    description: "按实际负荷调节循环泵运行，完善电量分项计量。",
    source: "调研方案库 · 酿造行业样例 03",
    prerequisite: "核实泵组运行曲线和变频适配情况",
  },
  {
    id: "lib-4",
    name: "用水计量与清洗操作改进",
    type: "无低费方案",
    area: "用水管理",
    investment: 8,
    saving: 4,
    energy: 10,
    water: 3000,
    nox: 0,
    days: 20,
    downtime: 0,
    description: "补齐计量点，优化清洗程序并记录单位产品用水。",
    source: "调研方案库 · 酿造行业样例 04",
    prerequisite: "明确用水统计边界与清洗卫生要求",
  },
  {
    id: "lib-5",
    name: "锅炉低氮燃烧改造",
    type: "中高费方案",
    area: "废气治理",
    investment: 120,
    saving: 8,
    energy: 35,
    water: 0,
    nox: 0.9,
    days: 90,
    downtime: 5,
    description: "核实燃烧系统兼容性后改造，并进行实际排放监测。",
    source: "调研方案库 · 酿造行业样例 05",
    prerequisite: "核实锅炉型号、许可限值与燃烧安全条件",
  },
  {
    id: "lib-6",
    name: "分质回用与中水替代",
    type: "中高费方案",
    area: "水资源利用",
    investment: 65,
    saving: 16,
    energy: 30,
    water: 18000,
    nox: 0,
    days: 75,
    downtime: 2,
    description: "分质收集处理并回用于允许的非接触环节，完善回用水计量。",
    source: "调研方案库 · 酿造行业样例 06",
    prerequisite: "核实回用水水质与生产工艺适用范围",
  },
];
export function initDelivery(data) {
  data.delivery ??= {
    status: "planning",
    constraints: clone(defaultConstraints),
    enabled: schemeLibrary.map((s) => s.id),
    candidates: [],
    runs: [],
    selected: null,
    revision: 0,
    expert: null,
    expertReviews: [],
    chat: [],
    suggestion: null,
    planVersions: [],
    records: [],
    acceptanceDraft: { approvalNo: "", conclusion: "", files: [], checks: [] },
    acceptanceVersions: [],
    events: [],
    report: null,
  };
  return data.delivery;
}
export const dataApproved = (data) =>
  data.oaWorkflow.status === "approved" &&
  !!data.oaWorkflow.versions.at(-1)?.snapshot;
export const recipient = (data) =>
  accounts.find((a) => a.role === "county" && a.region === data.info.countyId);
export const canHandle = (data, user) =>
  recipient(data)?.username === user?.username;
export const isOwner = (data, user) =>
  user?.role === "enterprise" && user.enterpriseId === data.info.id;
export const planEditable = (data) =>
  dataApproved(data) &&
  ["planning", "plan_returned"].includes(data.delivery.status);
export const approvedPlan = (data) =>
  data.delivery.planVersions.findLast((v) => v.decision?.result === "approved");
const ownerGuard = (data, user) => {
  if (!isOwner(data, user)) throw new Error("仅本企业管理员可操作。");
  if (!dataApproved(data)) throw new Error("请先完成填报数据审批。");
};
const stageGuard = (data, statuses) => {
  if (!statuses.includes(data.delivery.status))
    throw new Error("当前阶段不允许此操作。");
};
const editGuard = (data, user) => {
  ownerGuard(data, user);
  stageGuard(data, ["planning", "plan_returned"]);
};
const reviewerGuard = (data, user) => {
  if (!canHandle(data, user)) throw new Error("仅本次接收单位可办理。");
};
const log = (data, user, action, note = "") =>
  data.delivery.events.unshift({
    id: uid(),
    at: timestamp(),
    actor: user.name,
    action,
    note,
  });
export function baseline(data) {
  const v = data.oaWorkflow.versions.at(-1),
    r = v?.snapshot?.rounds[3];
  if (!r) return null;
  return {
    version: v.number,
    production: total(r.survey.products),
    energy: total(r.survey.energy),
    water: total(r.survey.water),
    nox: total(
      r.survey.emissions.filter((x) =>
        /NOx|氮氧化物/i.test(x.name + " " + x.spec),
      ),
    ),
    level: r.assessment.level,
    standard: r.assessment.standard || "尚未确认",
    snapshot: v.snapshot,
  };
}
export function measures(items) {
  const sum = (k) =>
    Number(items.reduce((n, x) => n + Number(x[k] || 0), 0).toFixed(3));
  const saving = sum("saving"),
    investment = sum("investment");
  return {
    investment,
    saving,
    energy: sum("energy"),
    water: sum("water"),
    nox: sum("nox"),
    days: Math.max(0, ...items.map((x) => Number(x.days) || 0)),
    downtime: sum("downtime"),
    payback: saving > 0 ? Number((investment / saving).toFixed(2)) : Infinity,
  };
}
export function validateConstraints(c) {
  for (const f of constraintFields) {
    if (
      c[f.key] == null ||
      !Number.isFinite(Number(c[f.key])) ||
      Number(c[f.key]) < f.min ||
      (f.max != null && Number(c[f.key]) > f.max)
    )
      throw new Error(`请填写有效的${f.label}。`);
  }
  if (
    !c.weights ||
    Object.values(c.weights).some(
      (v) => !Number.isFinite(Number(v)) || Number(v) < 0,
    ) ||
    Object.values(c.weights).reduce((a, b) => a + Number(b), 0) <= 0
  )
    throw new Error("目标权重必须非负且合计大于零。");
}
export function constraintsCheck(items, c, b) {
  const m = measures(items),
    rows = [
      ["投资上限", m.investment, c.budget, "≤", "万元"],
      ["工期上限", m.days, c.maxDays, "≤", "天"],
      ["停产上限", m.downtime, c.maxDowntime, "≤", "天"],
      ["回收期上限", m.payback, c.maxPayback, "≤", "年"],
      [
        "节能比例",
        b.energy ? (m.energy / b.energy) * 100 : 0,
        c.minEnergy,
        "≥",
        "%",
      ],
      [
        "节水比例",
        b.water ? (m.water / b.water) * 100 : 0,
        c.minWater,
        "≥",
        "%",
      ],
      ["NOx 减排比例", b.nox ? (m.nox / b.nox) * 100 : 0, c.minNox, "≥", "%"],
    ];
  const result = rows.map(([name, actual, target, operator, unit], i) => ({
    id: "constraint-" + i,
    name,
    actual: Number.isFinite(actual) ? Number(actual.toFixed(2)) : "—",
    target,
    operator,
    unit,
    pass:
      Number.isFinite(actual) &&
      (operator === "≤" ? actual <= target : actual >= target),
  }));
  result.push({
    id: "physical",
    name: "节约量与基准一致性",
    actual: "不超过获批基准",
    target: "同一统计边界",
    operator: "",
    unit: "",
    pass: m.energy <= b.energy && m.water <= b.water && m.nox <= b.nox,
  });
  return result;
}
export function optimize(data) {
  const f = data.delivery,
    b = baseline(data),
    c = f.constraints;
  validateConstraints(c);
  if (!b) throw new Error("尚无获批数据。");
  const pool = schemeLibrary.filter((s) => f.enabled.includes(s.id));
  if (!pool.length) throw new Error("请至少选择一个调研方案。");
  const feasible = [];
  for (let mask = 1; mask < 2 ** pool.length; mask++) {
    const items = pool.filter((_, i) => mask & (1 << i));
    if (constraintsCheck(items, c, b).every((r) => r.pass))
      feasible.push({ items: clone(items), metrics: measures(items) });
  }
  // Non-dominated combinations from this finite demo library, followed by weighted ranking.
  const frontier = feasible.filter(
    (a) =>
      !feasible.some(
        (b) =>
          b !== a &&
          b.metrics.investment <= a.metrics.investment &&
          ["energy", "water", "nox"].every(
            (k) => b.metrics[k] >= a.metrics[k],
          ) &&
          (b.metrics.investment < a.metrics.investment ||
            ["energy", "water", "nox"].some(
              (k) => b.metrics[k] > a.metrics[k],
            )),
      ),
  );
  const max = (k) => Math.max(1, ...feasible.map((x) => x.metrics[k])),
    sumWeights = Object.values(c.weights).reduce((a, b) => a + Number(b), 0);
  return frontier
    .map((x) => ({
      ...x,
      score: Number(
        (
          ((c.weights.cost * (1 - x.metrics.investment / max("investment")) +
            (c.weights.energy * x.metrics.energy) / max("energy") +
            (c.weights.water * x.metrics.water) / max("water") +
            (c.weights.nox * x.metrics.nox) / max("nox")) /
            sumWeights) *
          100
        ).toFixed(1),
      ),
    }))
    .sort(
      (a, b) =>
        b.score - a.score || a.metrics.investment - b.metrics.investment,
    )
    .slice(0, 3)
    .map((x, i) => ({
      ...x,
      id: uid(),
      name: ["综合推荐组合", "备选组合一", "备选组合二"][i],
      constraints: clone(c),
      enabled: [...f.enabled].sort(),
      baselineVersion: b.version,
    }));
}
export function generateCandidates(data, user) {
  editGuard(data, user);
  const results = optimize(data);
  data.delivery.candidates = results;
  data.delivery.runs.unshift({
    id: uid(),
    at: timestamp(),
    constraints: clone(data.delivery.constraints),
    enabled: [...data.delivery.enabled],
    count: results.length,
  });
  log(
    data,
    user,
    "生成方案组合",
    results.length
      ? `生成 ${results.length} 个可行候选组合`
      : "无满足全部约束的组合，请调整约束",
  );
  return results;
}
export function selectCandidate(data, user, id) {
  editGuard(data, user);
  const c = data.delivery.candidates.find((x) => x.id === id);
  if (!c) throw new Error("候选组合不存在。");
  if (
    JSON.stringify(c.constraints) !==
      JSON.stringify(data.delivery.constraints) ||
    JSON.stringify(c.enabled) !==
      JSON.stringify([...data.delivery.enabled].sort())
  )
    throw new Error("约束或参与措施已经变化，请重新生成方案。");
  data.delivery.selected = clone(c);
  data.delivery.revision++;
  log(data, user, "选择推荐方案", c.name);
}
export function updatePlanItem(data, user, form) {
  editGuard(data, user);
  const f = data.delivery;
  if (!f.selected) throw new Error("请先选择候选组合。");
  for (const k of [
    "investment",
    "saving",
    "energy",
    "water",
    "nox",
    "days",
    "downtime",
  ])
    if (form[k] == null || !Number.isFinite(Number(form[k])) || form[k] < 0)
      throw new Error("请填写非负的费用、效益和实施周期。");
  if (!form.name?.trim() || !form.reason?.trim())
    throw new Error("请填写方案名称和人工调整依据。");
  const i = f.selected.items.findIndex((x) => x.id === form.id);
  if (i < 0) throw new Error("方案不存在。");
  f.selected.items[i] = clone(form);
  f.selected.metrics = measures(f.selected.items);
  f.revision++;
  log(data, user, "人工修订方案", form.name + "：" + form.reason);
}
export function saveConstraints(data, user, c) {
  editGuard(data, user);
  validateConstraints(c);
  data.delivery.constraints = clone(c);
  data.delivery.suggestion = null;
  data.delivery.revision++;
  log(
    data,
    user,
    "调整优化约束",
    "已保存约束；已有方案须重新校核并完成专家复核。",
  );
}
export function parseDemand(text, current) {
  const next = clone(current),
    changes = [];
  const patterns = [
    ["budget", /预算[^\d]{0,12}(\d+(?:\.\d+)?)\s*万/],
    ["maxDays", /工期[^\d]{0,12}(\d+(?:\.\d+)?)\s*天/],
    ["maxDowntime", /停产[^\d]{0,12}(\d+(?:\.\d+)?)\s*天/],
    ["maxPayback", /回收期[^\d]{0,12}(\d+(?:\.\d+)?)\s*年/],
    ["minEnergy", /节能[^\d]{0,12}(\d+(?:\.\d+)?)\s*[%％]/],
    ["minWater", /节水[^\d]{0,12}(\d+(?:\.\d+)?)\s*[%％]/],
    ["minNox", /(?:NOx|氮氧化物)[^\d]{0,12}(\d+(?:\.\d+)?)\s*[%％]/i],
  ];
  for (const [key, re] of patterns) {
    const m = text.match(re);
    if (m) {
      const field = constraintFields.find((f) => f.key === key);
      next[key] = Number(m[1]);
      changes.push({
        key,
        label: field.label,
        before: current[key],
        after: next[key],
        unit: field.unit,
      });
    }
  }
  const preference = text.includes("优先节水")
    ? "water"
    : text.includes("优先节能")
      ? "energy"
      : text.includes("优先减排")
        ? "nox"
        : text.includes("优先低投资")
          ? "cost"
          : null;
  if (preference) {
    next.weights = { cost: 15, energy: 15, water: 15, nox: 15 };
    next.weights[preference] = 55;
    changes.push({
      key: "weights",
      label: "优化目标偏好",
      before: "当前权重",
      after: {
        water: "节水优先",
        energy: "节能优先",
        nox: "减排优先",
        cost: "低投资优先",
      }[preference],
      unit: "",
    });
  }
  return { next, changes };
}
export function setExpert(data, user, expert) {
  editGuard(data, user);
  if (
    !expert.name?.trim() ||
    !expert.organization?.trim() ||
    !expert.qualification?.trim()
  )
    throw new Error("请补齐专家姓名、单位与资质说明。");
  if (expert.source === "自选专家" && !expert.files?.length)
    throw new Error("请上传自选专家的资质证明。");
  data.delivery.expert = clone(expert);
  data.delivery.revision++;
  log(data, user, "选择评审专家", expert.name + " · " + expert.source);
}
export function recordExpertReview(data, user, content) {
  editGuard(data, user);
  const f = data.delivery;
  if (!f.selected || !f.expert) throw new Error("请先选择方案及评审专家。");
  if (!content?.trim()) throw new Error("请填写专家意见及修订说明。");
  if (
    !constraintsCheck(f.selected.items, f.constraints, baseline(data)).every(
      (x) => x.pass,
    )
  )
    throw new Error("当前方案仍有约束不满足，请先调整。");
  f.expertReviews.push({
    id: uid(),
    revision: f.revision,
    expert: clone(f.expert),
    content,
    at: timestamp(),
    recorder: user.name,
  });
  log(
    data,
    user,
    "录入专家复核意见",
    f.expert.name + " · 方案修订版 R" + f.revision,
  );
}
export function submitPlan(data, user, note) {
  editGuard(data, user);
  const f = data.delivery,
    review = f.expertReviews.at(-1);
  if (!f.selected || !review || review.revision !== f.revision)
    throw new Error("请先完成当前修订版的专家复核。");
  if (!note?.trim()) throw new Error("请填写方案报备说明或退回意见回复。");
  if (
    !constraintsCheck(f.selected.items, f.constraints, baseline(data)).every(
      (x) => x.pass,
    )
  )
    throw new Error("方案不满足当前约束。");
  const v = {
    id: uid(),
    number: f.planVersions.length + 1,
    at: timestamp(),
    plan: clone(f.selected),
    constraints: clone(f.constraints),
    baseline: clone(baseline(data)),
    expertReview: clone(review),
    note,
    recipient: recipient(data).username,
    decision: null,
  };
  v.plan.metrics = measures(v.plan.items);
  f.planVersions.push(v);
  f.status = "plan_submitted";
  log(data, user, "提交方案报备", "P" + v.number);
  return v;
}
export function decidePlan(data, user, result, form) {
  reviewerGuard(data, user);
  stageGuard(data, ["plan_submitted"]);
  if (!["approved", "returned"].includes(result) || !form.comment?.trim())
    throw new Error("请填写处理意见。");
  if (
    result === "approved" &&
    (!form.approvalNo?.trim() ||
      !validDate(form.periodStart) ||
      !validDate(form.periodEnd) ||
      form.periodEnd < form.periodStart)
  )
    throw new Error("请填写批复编号及有效的实施考察起止日期。");
  const v = data.delivery.planVersions.at(-1);
  v.decision = { ...clone(form), result, actor: user.name, at: timestamp() };
  data.delivery.status =
    result === "approved" ? "implementing" : "plan_returned";
  log(
    data,
    user,
    result === "approved" ? "方案报备获批，进入实施考察期" : "方案报备退回修改",
    form.comment,
  );
}
export function addProgress(data, user, record) {
  ownerGuard(data, user);
  stageGuard(data, ["implementing", "acceptance_returned"]);
  const p = approvedPlan(data);
  if (!p?.plan.items.some((x) => x.id === record.schemeId))
    throw new Error("请选择获批方案。");
  if (
    !record.content?.trim() ||
    record.progress == null ||
    !Number.isFinite(record.progress) ||
    record.progress < 0 ||
    record.progress > 100 ||
    !validDate(record.date) ||
    !record.files?.length
  )
    throw new Error("请填写日期、整改情况、进度并附上凭证。");
  const previous = data.delivery.records.findLast(
    (x) => x.schemeId === record.schemeId,
  );
  if (previous && record.progress < previous.progress && !record.reason?.trim())
    throw new Error("进度回调时请填写原因。");
  data.delivery.records.push({
    ...clone(record),
    id: uid(),
    at: timestamp(),
    author: user.name,
  });
  log(
    data,
    user,
    "补充实施考察记录",
    p.plan.items.find((x) => x.id === record.schemeId).name +
      " · " +
      record.progress +
      "%",
  );
}
export function latestProgress(data, schemeId) {
  return data.delivery.records.findLast((x) => x.schemeId === schemeId);
}
export function acceptanceChecks(data, draft = data.delivery.acceptanceDraft) {
  const p = approvedPlan(data);
  return [
    {
      id: "plan",
      name: "上级方案批准",
      pass: !!p?.decision?.approvalNo,
      detail: p?.decision?.approvalNo || "尚未批准方案",
    },
    {
      id: "progress",
      name: "获批方案完成与凭证",
      pass:
        !!p &&
        p.plan.items.every(
          (s) =>
            latestProgress(data, s.id)?.progress === 100 &&
            latestProgress(data, s.id)?.files?.length,
        ),
      detail: "每个获批方案须完成 100% 并留存整改凭证",
    },
    {
      id: "approvals",
      name: "相关批准与验收材料",
      pass: !!draft.approvalNo?.trim() && !!draft.files?.length,
      detail: "填写相关批准文号并上传验收资料",
    },
    {
      id: "targets",
      name: "验收指标自查",
      pass:
        draft.checks?.length > 0 &&
        draft.checks.every(
          (x) =>
            x.name?.trim() &&
            x.basis?.trim() &&
            x.target !== null &&
            x.target !== "" &&
            Number.isFinite(Number(x.target)) &&
            x.actual !== null &&
            x.actual !== "" &&
            Number.isFinite(Number(x.actual)) &&
            ["≤", "≥"].includes(x.operator) &&
            (x.operator === "≤"
              ? Number(x.actual) <= Number(x.target)
              : Number(x.actual) >= Number(x.target)) &&
            x.files?.length,
        ),
      detail: "逐项填写依据、目标值、实测值与证明材料，所有指标自查达标",
    },
    {
      id: "conclusion",
      name: "企业验收说明",
      pass: !!draft.conclusion?.trim(),
      detail: "说明本轮实施效果及验收申请事项",
    },
  ];
}
export function submitAcceptance(data, user) {
  ownerGuard(data, user);
  stageGuard(data, ["implementing", "acceptance_returned"]);
  const checks = acceptanceChecks(data);
  if (checks.some((x) => !x.pass))
    throw new Error("请先补齐验收检查中的未完成项。");
  const f = data.delivery;
  const v = {
    id: uid(),
    number: f.acceptanceVersions.length + 1,
    at: timestamp(),
    draft: clone(f.acceptanceDraft),
    plan: clone(approvedPlan(data)),
    records: clone(f.records),
    continuity: clone(data.rounds[3].continuity),
    decision: null,
  };
  f.acceptanceVersions.push(v);
  f.status = "acceptance_submitted";
  log(data, user, "提交本轮验收申请", "A" + v.number);
  return v;
}
export function decideAcceptance(data, user, result, form) {
  reviewerGuard(data, user);
  stageGuard(data, ["acceptance_submitted"]);
  if (
    !["approved", "returned"].includes(result) ||
    !form.inspection?.trim() ||
    !form.guidance?.trim() ||
    !form.comment?.trim() ||
    !validDate(form.date)
  )
    throw new Error("请填写检查日期、现场检查情况、指导意见和办理结论。");
  if (
    result === "approved" &&
    (!form.approvalNo?.trim() || !form.files?.length)
  )
    throw new Error("请填写验收批复文号并上传批复材料。");
  const v = data.delivery.acceptanceVersions.at(-1);
  v.decision = { ...clone(form), result, actor: user.name, at: timestamp() };
  data.delivery.status =
    result === "approved" ? "accepted" : "acceptance_returned";
  log(
    data,
    user,
    result === "approved" ? "上级检查指导后验收通过" : "验收退回继续整改",
    form.comment,
  );
}
export function createReport(data, user) {
  ownerGuard(data, user);
  stageGuard(data, ["accepted", "reported"]);
  if (data.delivery.report) return data.delivery.report;
  const acceptance = data.delivery.acceptanceVersions.at(-1);
  if (acceptance?.decision?.result !== "approved")
    throw new Error("验收尚未通过。");
  const report = {
    id: uid(),
    at: timestamp(),
    name: `${data.info.name}第3轮清洁生产审核报告`,
    acceptance: clone(acceptance),
    documents: clone(data.documents),
    events: clone(data.delivery.events),
  };
  data.delivery.report = report;
  data.delivery.status = "reported";
  data.reports.push({
    id: report.id,
    generatedId: report.id,
    name: report.name,
    round: 3,
    year: 2026,
    status: "验收后汇编",
    date: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" }),
  });
  log(
    data,
    user,
    "生成清洁生产审核报告",
    "按获批数据、方案、实施记录及验收结果汇编",
  );
  return report;
}
export function deliveryFileReferenced(data, id) {
  const f = data.delivery;
  return (
    f &&
    JSON.stringify({
      expert: f.expert,
      reviews: f.expertReviews,
      plans: f.planVersions,
      records: f.records,
      acceptance: f.acceptanceVersions,
      draft: f.acceptanceDraft,
      report: f.report,
      continuous: data.continuousRecords,
      priorWorkflow: data.beforeApprovedDemo,
    }).includes('"' + id + '"')
  );
}
