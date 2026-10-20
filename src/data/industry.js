import { scopedEnterprises, total } from "./domain.js";
import { approvedPlan, deliveryLabels } from "./deliveryWorkflow.js";
export const dimensions = [
  { id: "pollution", name: "污染物排放情况" },
  { id: "carbon", name: "行业碳排放情况" },
  { id: "scale", name: "企业规模评估" },
  { id: "technology", name: "原辅材料技术工艺及装备评估" },
  { id: "energy", name: "能源消耗" },
  { id: "audit", name: "清洁生产审核开展情况" },
];
export const number = (v, d = 2) => Number((Number(v) || 0).toFixed(d));
export function profile(data) {
  const i = Number(data.info.id.slice(-2)) - 1;
  data.industryProfile ??= {
    year: 2025,
    carbonDirect: 5200 + i * 430,
    carbonIndirect: 3900 + i * 210,
    employees: 180 + i * 35,
    revenue: 16000 + i * 1900,
    scale: ["中型", "小型", "大型", "中型"][i % 4],
    process: "固态发酵 · 蒸馏 · 陈酿",
    equipmentLevel: "已建立主要设备与计量台账",
    materialReuse: 72 + i * 2,
    efficientEquipment: 66 + i * 3,
    level:
      ["二级", "三级", "一级", "二级", "二级", "三级", "一级", "二级"][i] +
      "（示例）",
    score: [83, 71, 92, 86, 81, 73, 91, 84][i],
    standard: "行业评价口径（演示，待核实正式适用标准）",
    source: "行业年度资料与模拟评价数据",
    demo: true,
  };
  return data.industryProfile;
}
export function industryRows(user, getData, filters = {}) {
  return scopedEnterprises(user)
    .map((e) => {
      const d = getData(e.id),
        p = profile(d),
        r = d.oaWorkflow.versions.at(-1)?.snapshot.rounds[3] || d.rounds[3],
        info = d.info,
        production = total(r.survey.products),
        energy = total(r.survey.energy),
        water = total(r.survey.water);
      const emission = (re) =>
        total(r.survey.emissions.filter((x) => re.test(x.name + " " + x.spec)));
      const plan = approvedPlan(d),
        assessment = r.assessment;
      const level =
        assessment.level && assessment.level !== "待评价"
          ? assessment.level
          : p.level;
      return {
        id: e.id,
        name: info.name,
        city: info.city,
        cityId: info.cityId,
        county: info.county,
        countyId: info.countyId,
        industry: info.industry,
        year: p.year,
        production,
        capacity: r.survey.products.reduce(
          (n, x) => n + (Number(x.capacity) || 0),
          0,
        ),
        energy,
        water,
        cod: number(emission(/COD|化学需氧量/i), 3),
        nox: number(emission(/NOx|氮氧化物/i), 3),
        carbonDirect: p.carbonDirect,
        carbonIndirect: p.carbonIndirect,
        carbon: number(p.carbonDirect + p.carbonIndirect),
        carbonIntensity: production
          ? number((p.carbonDirect + p.carbonIndirect) / production, 3)
          : null,
        energyIntensity: production ? number(energy / production, 3) : null,
        waterIntensity: production ? number(water / production, 3) : null,
        employees: p.employees,
        revenue: p.revenue,
        scale: p.scale,
        materials: total(r.survey.materials),
        materialReuse: p.materialReuse,
        process: p.process,
        equipmentLevel: p.equipmentLevel,
        equipment: r.equipment.reduce(
          (n, x) => n + (Number(x.quantity) || 0),
          0,
        ),
        efficientEquipment: p.efficientEquipment,
        level,
        score: assessment.score ?? p.score,
        standard: assessment.standard || p.standard,
        schemeCount: plan?.plan.items.length || 0,
        progress:
          d.delivery.status === "reported"
            ? "持续清洁生产"
            : deliveryLabels[d.delivery.status],
        round: 3,
        report: !!d.delivery.report,
        continuous: d.continuousRecords?.length || 0,
        version: d.oaWorkflow.versions.at(-1)?.number || 0,
        data: d,
      };
    })
    .filter(
      (r) =>
        (!filters.city || r.cityId === filters.city) &&
        (!filters.county || r.countyId === filters.county) &&
        (!filters.industry || r.industry === filters.industry) &&
        (!filters.search || (r.name + r.county).includes(filters.search)),
    );
}
export function summarize(rows) {
  const sum = (k) =>
      number(
        rows.reduce((n, r) => n + Number(r[k] || 0), 0),
        3,
      ),
    production = sum("production");
  return {
    count: rows.length,
    production,
    energy: sum("energy"),
    water: sum("water"),
    cod: sum("cod"),
    nox: sum("nox"),
    carbon: sum("carbon"),
    energyIntensity: production ? number(sum("energy") / production, 3) : null,
    carbonIntensity: production ? number(sum("carbon") / production, 3) : null,
    schemeCount: sum("schemeCount"),
    reported: rows.filter((r) => r.report).length,
    continuous: rows.filter((r) => r.progress === "持续清洁生产").length,
  };
}
export function levelRows(rows) {
  return ["一级", "二级", "三级", "待评价"].map((level, i) => {
    const group = rows.filter((r) =>
      level === "待评价"
        ? !/^[一二三]级/.test(r.level)
        : r.level.startsWith(level),
    );
    return {
      id: "level" + i,
      level: level === "待评价" ? "其他 / 待评价" : level,
      count: group.length,
      ratio: rows.length ? number((group.length / rows.length) * 100, 1) : 0,
      names: group.map((r) => r.name).join("、") || "—",
    };
  });
}
export function problemRows(rows) {
  const map = new Map();
  for (const r of rows)
    for (const p of r.data.rounds[3].problems) {
      const key = p.name;
      if (!map.has(key))
        map.set(key, {
          id: "problem-" + map.size,
          name: key,
          category: /水/.test(key)
            ? "水资源利用"
            : /设备/.test(key)
              ? "工艺与装备"
              : "综合管理",
          members: [],
          items: [],
        });
      const entry = map.get(key);
      if (!entry.members.some((x) => x.id === r.id))
        entry.members.push({ id: r.id, name: r.name });
      entry.items.push({ ...p, enterprise: r.name, enterpriseId: r.id });
    }
  return [...map.values()].map((x) => ({
    ...x,
    count: x.members.length,
    target: [...new Set(x.items.map((p) => p.target))].join("；"),
  }));
}
export function planRows(rows) {
  const map = new Map();
  for (const r of rows) {
    const p = approvedPlan(r.data);
    for (const s of p?.plan.items || []) {
      if (!map.has(s.name))
        map.set(s.name, {
          ...s,
          id: "industry-plan-" + map.size,
          members: [],
          items: [],
        });
      const x = map.get(s.name);
      x.members.push({ id: r.id, name: r.name });
      x.items.push({ ...s, enterprise: r.name });
    }
  }
  return [...map.values()].map((x) => ({
    ...x,
    count: x.members.length,
    investmentAvg: number(
      x.items.reduce((s, a) => s + a.investment, 0) / x.items.length,
    ),
    savingAvg: number(
      x.items.reduce((s, a) => s + a.saving, 0) / x.items.length,
    ),
  }));
}
export const assessmentColumns = {
  pollution: [
    ["cod", "COD 排放（t/a）", 155],
    ["nox", "NOx 排放（t/a）", 155],
    ["water", "新鲜水量（m³/a）", 165],
    ["level", "当前评价水平", 150],
  ],
  carbon: [
    ["carbonDirect", "直接排放（tCO₂e/a）", 180],
    ["carbonIndirect", "间接排放（tCO₂e/a）", 180],
    ["carbon", "合计（tCO₂e/a）", 170],
    ["carbonIntensity", "单位产品（tCO₂e/t）", 185],
  ],
  scale: [
    ["scale", "企业规模（示例）", 150],
    ["employees", "从业人数", 120],
    ["revenue", "营业收入（万元/a）", 180],
    ["capacity", "设计产能（t/a）", 165],
    ["production", "实际产量（t/a）", 165],
  ],
  technology: [
    ["materials", "原辅材料用量（t/a）", 185],
    ["materialReuse", "资源回用率（%）", 165],
    ["process", "主要生产工艺", 240],
    ["equipment", "设备数量（台/套）", 165],
    ["efficientEquipment", "高效设备占比（%）", 180],
    ["equipmentLevel", "工艺装备管理情况", 260],
  ],
  energy: [
    ["energy", "综合能耗（tce/a）", 175],
    ["energyIntensity", "单位产品能耗（tce/t）", 200],
    ["waterIntensity", "单位产品水耗（m³/t）", 195],
    ["level", "当前评价水平", 150],
  ],
  audit: [
    ["round", "本轮轮次", 100],
    ["version", "获批数据版本", 135],
    ["progress", "当前阶段", 200],
    ["schemeCount", "获批方案数", 120],
    ["report", "审核报告", 130],
    ["continuous", "持续记录数", 130],
  ],
};
