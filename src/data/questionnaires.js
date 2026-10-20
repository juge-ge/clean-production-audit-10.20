import { scopedEnterprises } from "./domain.js";
import { experts } from "./experts.js";
import { clone, timestamp } from "./deliveryWorkflow.js";
export const indicatorTemplate = [
  {
    id: "energy",
    name: "资源能源利用指标",
    criterion: "评价单位产品能源与水耗指标的适用性、可测量性",
    weight: 25,
  },
  {
    id: "pollution",
    name: "污染物产生与排放指标",
    criterion: "评价污染物统计边界、监测条件与指标代表性",
    weight: 25,
  },
  {
    id: "process",
    name: "技术工艺与装备指标",
    criterion: "评价非线性工艺和设备条件的可核查性",
    weight: 20,
  },
  {
    id: "material",
    name: "原辅材料与资源循环指标",
    criterion: "评价原料利用与循环利用指标的行业适用性",
    weight: 15,
  },
  {
    id: "management",
    name: "清洁生产管理指标",
    criterion: "评价审核机制、台账、持续改进指标的完整性",
    weight: 15,
  },
];
export const surveyLabels = {
  draft: "草稿",
  issued: "已模拟发放 · 回收中",
  closed: "回收已结束",
};
export function ensureQuestionnaires(db, user) {
  db.industrySurveys ??= [];
  if (!db.industrySurveys.some((s) => s.owner === user.username)) {
    const s = {
      id: crypto.randomUUID(),
      title: "2026 年白酒行业清洁生产指标专家调查（示例）",
      industry: "白酒制造",
      deadline: "2026-11-30",
      description:
        "请对各类指标的适用性和重要性进行 0—100 分评分，并提出标准完善建议。",
      owner: user.username,
      ownerName: user.name,
      scopeIds: scopedEnterprises(user).map((e) => e.id),
      status: "issued",
      indicators: clone(indicatorTemplate),
      experts: clone(experts.slice(0, 3)),
      responses: [],
      at: timestamp(),
      issuedAt: timestamp(),
      demo: true,
    };
    s.responses = s.experts
      .slice(0, 2)
      .map((e, i) => ({
        id: crypto.randomUUID(),
        expertId: e.id,
        at: timestamp(),
        recorder: "示例回收",
        scores: s.indicators.map((x, j) => ({
          indicatorId: x.id,
          score: 88 - i * 4 + j,
          comment: "指标具有代表性，建议补充统计口径说明（示例）。",
        })),
      }));
    db.industrySurveys.push(s);
  }
  return db.industrySurveys;
}
export function visibleSurveys(db, user) {
  if (user.role === "enterprise") return [];
  const ids = new Set(scopedEnterprises(user).map((e) => e.id));
  return (db.industrySurveys || []).filter(
    (s) => s.scopeIds.length && s.scopeIds.every((id) => ids.has(id)),
  );
}
export const managesSurvey = (s, user) => s.owner === user.username;
function guard(s, user) {
  if (!managesSurvey(s, user)) throw Error("仅发起单位可以操作该问卷");
}
export function validateSurvey(form) {
  if (
    !form.title?.trim() ||
    !form.industry?.trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(form.deadline) ||
    Number.isNaN(Date.parse(form.deadline))
  )
    throw Error("请填写问卷名称、行业和有效截止日期");
  if (!form.experts?.length || !form.indicators?.length)
    throw Error("请选择专家并设置评分指标");
  if (new Set(form.experts.map((x) => x.id)).size !== form.experts.length)
    throw Error("专家不能重复");
  if (
    form.indicators.some(
      (x) =>
        !x.name?.trim() ||
        !x.criterion?.trim() ||
        !Number.isFinite(Number(x.weight)) ||
        Number(x.weight) < 0,
    )
  )
    throw Error("请填写指标、评分说明和有效权重");
  if (
    Math.abs(form.indicators.reduce((s, x) => s + Number(x.weight), 0) - 100) >
    0.001
  )
    throw Error("指标权重合计须为 100%");
}
export function saveSurvey(db, user, form) {
  if (user.role === "enterprise") throw Error("仅政府端可以设置问卷");
  validateSurvey(form);
  let s = db.industrySurveys.find((x) => x.id === form.id);
  if (s) {
    guard(s, user);
    if (s.status !== "draft") throw Error("已发放问卷不能修改题目与专家");
    Object.assign(s, clone(form));
  } else {
    s = {
      ...clone(form),
      id: crypto.randomUUID(),
      owner: user.username,
      ownerName: user.name,
      scopeIds: scopedEnterprises(user).map((e) => e.id),
      status: "draft",
      responses: [],
      at: timestamp(),
    };
    db.industrySurveys.push(s);
  }
  return s;
}
export function issueSurvey(s, user) {
  guard(s, user);
  if (s.status !== "draft") throw Error("仅草稿可以发放");
  validateSurvey(s);
  s.status = "issued";
  s.issuedAt = timestamp();
}
export function recordResponse(s, user, expertId, scores) {
  guard(s, user);
  if (s.status !== "issued") throw Error("当前问卷不在回收期");
  if (!s.experts.some((e) => e.id === expertId))
    throw Error("该专家不在发放名单");
  if (
    scores.length !== s.indicators.length ||
    new Set(scores.map((x) => x.indicatorId)).size !== scores.length ||
    s.indicators.some((x) => !scores.some((y) => y.indicatorId === x.id)) ||
    scores.some(
      (x) =>
        x.score == null ||
        x.score === "" ||
        !Number.isFinite(Number(x.score)) ||
        x.score < 0 ||
        x.score > 100,
    )
  )
    throw Error("每个指标均须填写 0—100 分评分");
  const response = {
    id: crypto.randomUUID(),
    expertId,
    scores: clone(scores),
    at: timestamp(),
    recorder: user.name,
  };
  const i = s.responses.findIndex((x) => x.expertId === expertId);
  if (i < 0) s.responses.push(response);
  else s.responses[i] = response;
}
export function scoringResults(s) {
  const rows = s.indicators.map((x) => {
    const values = s.responses
      .map((r) => r.scores.find((v) => v.indicatorId === x.id)?.score)
      .filter((v) => v != null)
      .map(Number);
    const avg = values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : null;
    return {
      ...x,
      count: values.length,
      average: avg == null ? null : Number(avg.toFixed(2)),
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
    };
  });
  const sum = rows.reduce((n, x) => n + (x.average || 0), 0);
  let assigned = 0;
  return rows.map((x, i) => {
    const suggested = sum
      ? i === rows.length - 1
        ? Number((100 - assigned).toFixed(2))
        : Number(((x.average / sum) * 100).toFixed(2))
      : null;
    assigned += suggested || 0;
    return { ...x, suggested };
  });
}
export function closeSurvey(s, user) {
  guard(s, user);
  if (s.status !== "issued" || !s.responses.length)
    throw Error("至少回收一份完整问卷后才能结束");
  s.status = "closed";
  s.closedAt = timestamp();
}
export function adoptWeights(s, user) {
  guard(s, user);
  if (s.status !== "closed") throw Error("请先结束问卷回收");
  const rows = scoringResults(s);
  if (rows.some((x) => x.suggested === null)) throw Error("评分总和须大于零");
  s.adoptedWeights = rows.map((x) => ({
    id: x.id,
    name: x.name,
    weight: x.suggested,
  }));
  s.adoptedAt = timestamp();
}
