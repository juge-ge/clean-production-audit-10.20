import { escapeHtml as e, downloadText } from "./files.js";
function table(headers, rows) {
  return `<table><thead><tr>${headers.map((h) => `<th>${e(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${e(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
export function renderAuditReport(report) {
  const a = report.acceptance,
    p = a.plan,
    base = p.baseline,
    s = base.snapshot,
    r = s.rounds[3],
    docs = report.documents || [];
  const files = (ids) =>
    (ids || [])
      .map((id) => docs.find((d) => d.id === id)?.name || id)
      .join("；");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${e(report.name)}</title><style>body{max-width:1050px;margin:40px auto;padding:0 25px;color:#303133;font:14px/1.8 'Microsoft YaHei',sans-serif}h1{font-size:26px;text-align:center}h2{font-size:19px;border-bottom:2px solid #20547d;margin-top:30px;padding-bottom:8px}h3{font-size:15px}p{white-space:pre-wrap}table{border-collapse:collapse;width:100%;margin:15px 0;font-size:12px;table-layout:auto}th,td{border:1px solid #dce2e9;padding:8px;text-align:left;overflow-wrap:anywhere}th{background:#f3f6f9}aside{padding:14px;background:#fff8e7;border-left:3px solid #b68a36}.meta{text-align:center;color:#78818d}@media print{body{margin:0;padding:0}h2{break-after:avoid}tr{break-inside:avoid}thead{display:table-header-group}}</style></head><body><h1>${e(report.name)}</h1><p class="meta">第 3 轮 · 2026 年度 · 生成时间 ${e(report.at)}</p><aside>前端演示汇编报告。按本机保存的获批填报、方案、整改凭证及验收记录生成，未经正式签章，不代表实际行政批准。示例库预计效益与企业填报的实测值分别列示。</aside>
  <h2>一、企业情况与获批数据</h2>${table(
    ["项目", "填报内容"],
    [
      ["企业名称", s.info.name],
      ["统一社会信用代码", s.info.creditCode],
      ["法人代表", s.info.legalPerson],
      ["所属地区", s.info.city + " / " + s.info.county],
      ["联系人及方式", s.info.contact + " / " + s.info.phone],
      ["通讯地址", s.info.address],
      ["获批数据版本", "V" + base.version],
      ["适用标准", base.standard],
      ["企业自评水平", base.level],
    ],
  )}
  <h2>二、筹划与组织</h2>${table(["小组", "姓名", "职务", "职责"], [...r.leadership.map((x) => ["领导小组", x.name, x.position, x.responsibility]), ...r.team.map((x) => ["工作小组", x.name, x.position, x.responsibility])])}${table(
    ["工作内容", "责任人", "计划日期", "执行情况"],
    r.plan.map((x) => [x.name, x.owner, x.date, x.status]),
  )}
  <h2>三、现状调研与问题目标</h2>${table(
    ["基准指标", "数值", "单位"],
    [
      ["产品产量", base.production, "t/a"],
      ["综合能耗", base.energy, "tce/a"],
      ["新鲜水量", base.water, "m³/a"],
      ["NOx排放", base.nox, "t/a"],
    ],
  )}${Object.entries(r.survey)
    .map(
      ([k, rows]) =>
        `<h3>${e({ products: "产品产能", materials: "原辅材料", energy: "能源", water: "用水", emissions: "污染物排放" }[k] || k)}</h3>${table(
          ["项目", "规格 / 口径", "数量", "来源文件", "页码"],
          rows.map((x) => [x.name, x.spec, x.amount, x.source, x.page]),
        )}`,
    )
    .join("")}${table(
    ["问题", "现状", "目标", "责任人", "期限"],
    r.problems.map((x) => [x.name, x.current, x.target, x.owner, x.date]),
  )}
  <h3>生产工艺与装备</h3>${table(
    ["工序", "设备名称", "型号", "数量"],
    r.equipment.map((x) => [x.process, x.name, x.model, x.quantity]),
  )}${Object.entries(r.graphs)
    .map(
      ([kind, g]) =>
        "<h3>" +
        e(
          { production: "生产工艺", water: "废水处理", air: "废气处理" }[
            kind
          ] || kind,
        ) +
        "</h3>" +
        table(
          ["流程节点", "说明"],
          g.nodes.map((x) => [
            x.data?.label || x.id,
            x.data?.description || "",
          ]),
        ) +
        table(
          ["起点", "终点", "流向 / 数量"],
          g.edges.map((x) => [
            g.nodes.find((n) => n.id === x.source)?.data?.label || x.source,
            g.nodes.find((n) => n.id === x.target)?.data?.label || x.target,
            x.label || "",
          ]),
        ),
    )
    .join("")}<h3>企业对标与评价记录</h3>${table(
    ["指标", "现状", "标准要求", "评价"],
    r.assessment.criteria.map((x) => [
      x.name,
      x.actual,
      x.requirement,
      x.result,
    ]),
  )}
  <h2>四、方案优化、专家修订与报备</h2>${table(
    ["优化约束", "值"],
    [
      ["预算上限（万元）", p.constraints.budget],
      ["工期上限（天）", p.constraints.maxDays],
      ["停产上限（天）", p.constraints.maxDowntime],
      ["回收期上限（年）", p.constraints.maxPayback],
      ["节能比例下限（%）", p.constraints.minEnergy],
      ["节水比例下限（%）", p.constraints.minWater],
      ["NOx减排比例下限（%）", p.constraints.minNox],
    ],
  )}<p>方案版本 P${p.number}；批复文号：${e(p.decision.approvalNo)}。实施考察期 ${e(p.decision.periodStart)} 至 ${e(p.decision.periodEnd)}。</p><p>处理意见：${e(p.decision.comment)}</p>${table(
    [
      "方案",
      "投资万元",
      "预计年效益万元",
      "预计节能tce/a",
      "预计节水m³/a",
      "预计NOx减排t/a",
    ],
    p.plan.items.map((x) => [
      x.name,
      x.investment,
      x.saving,
      x.energy,
      x.water,
      x.nox,
    ]),
  )}${table(
    ["方案", "实施措施", "人工调整依据"],
    p.plan.items.map((x) => [
      x.name,
      x.description,
      x.reason || "沿用候选参数",
    ]),
  )}<p>专家：${e(p.expertReview.expert.name)}，${e(p.expertReview.expert.organization)}。资质说明：${e(p.expertReview.expert.qualification)}。</p><p>专家复核意见（企业代录）：${e(p.expertReview.content)}</p>
  <h2>五、实施考察与整改凭证</h2>${table(
    ["日期", "方案", "进度", "整改情况", "凭证"],
    a.records.map((x) => [
      x.date,
      p.plan.items.find((y) => y.id === x.schemeId)?.name || x.schemeId,
      x.progress + "%",
      x.content,
      files(x.files),
    ]),
  )}
  <h2>六、验收自查、上级检查与指导</h2><p>企业相关批准：${e(a.draft.approvalNo)}</p><p>企业验收说明：${e(a.draft.conclusion)}</p>${table(
    ["指标", "依据 / 标准条款", "目标", "实测值", "凭证"],
    a.draft.checks.map((x) => [
      x.name,
      x.basis,
      x.operator + " " + x.target + " " + x.unit,
      x.actual + " " + x.unit,
      files(x.files),
    ]),
  )}<p>检查日期：${e(a.decision.date)}；检查单位：${e(a.decision.actor)}</p><p>检查情况：${e(a.decision.inspection)}</p><p>指导意见：${e(a.decision.guidance)}</p><p>验收结论：${e(a.decision.comment)}；批复文号：${e(a.decision.approvalNo)}</p><p>批复附件：${e(files(a.decision.files))}</p>
  <h2>七、持续清洁生产</h2>${table(
    ["事项", "目标", "措施", "责任人", "执行情况"],
    a.continuity.map((x) => [x.name, x.target, x.measures, x.owner, x.effect]),
  )}
  <h2>八、材料索引与办理记录</h2>${table(
    ["材料名称", "类别", "保存时间"],
    docs.map((x) => [x.name, x.category, x.date]),
  )}${table(
    ["时间", "办理单位", "操作", "说明"],
    report.events.map((x) => [x.at, x.actor, x.action, x.note]),
  )}</body></html>`;
}
export const downloadAuditReport = (report) =>
  downloadText(
    report.name + ".html",
    renderAuditReport(report),
    "text/html;charset=utf-8",
  );
