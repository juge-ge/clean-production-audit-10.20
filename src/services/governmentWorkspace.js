import { computed, reactive } from "vue";
import { session, enterpriseData, db } from "../data/store";
import { scopedEnterprises } from "../data/domain";
import { copy } from "../data/auditWorkflow";
import { summarize, levelRows, problemRows, planRows } from "../data/industry";

export function useGovernmentEnterprises() {
  const filters = reactive({ city: null, county: null, industry: null, search: "" });
  const scope = computed(() => scopedEnterprises(session.user));
  const rows = computed(() => scope.value.map((entry) => {
    const data = enterpriseData(entry.id);
    const documents = data.documents;
    const latest = [...documents].sort((a, b) => dateNumber(b.date) - dateNumber(a.date))[0];
    return { ...entry, ...data.info, data, files: documents.length, latest: latest?.date || "尚未上传", reportCount: data.reports.length };
  }).filter((entry) =>
    (!filters.city || entry.cityId === filters.city) &&
    (!filters.county || entry.countyId === filters.county) &&
    (!filters.industry || entry.industry === filters.industry) &&
    (!filters.search || (entry.name + entry.creditCode + entry.county).includes(filters.search)),
  ));
  const options = computed(() => ({
    cities: [...new Map(scope.value.map((e) => [e.cityId, { label: e.city, value: e.cityId }])).values()],
    counties: [...new Map(scope.value.filter((e) => !filters.city || e.cityId === filters.city).map((e) => [e.countyId, { label: e.county, value: e.countyId }])).values()],
    industries: [...new Set(scope.value.map((e) => enterpriseData(e.id).info.industry))].map((value) => ({ label: value, value })),
  }));
  return { filters, scope, rows, options };
}

function dateNumber(value) {
  return Date.parse(String(value || "").replaceAll("年", "/").replaceAll("月", "/").replaceAll("日", "")) || 0;
}

export const workspaceTime = () => new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
export function governmentProjects(key) {
  db[key] ??= [];
  return computed(() => db[key].filter((project) => project.owner === session.user.username));
}

export function industrySnapshot(rows, filters) {
  const fields = ["id", "name", "city", "county", "industry", "year", "production", "energy", "water", "cod", "nox", "level", "standard", "version", "energyIntensity", "waterIntensity", "carbonIntensity", "materialReuse"];
  return copy({
    at: workspaceTime(), filters, summary: summarize(rows),
    enterprises: rows.map((row) => Object.fromEntries(fields.map((field) => [field, row[field]]))),
    levels: levelRows(rows), problems: problemRows(rows), plans: planRows(rows),
    references: rows.flatMap((row) => row.data.reports.map((report) => ({
      enterpriseId: row.id, enterprise: row.name, round: report.round,
      name: report.name, year: report.year, fileId: report.fileId || "", status: report.status,
      source: report.generatedId ? "前端汇编" : report.fileId ? "企业上传" : "示例占位 · 未关联原件",
    }))),
  });
}

export function trialLevel(value, indicator) {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return '数据缺失';
  const raw = [indicator.first, indicator.second, indicator.third];
  if (raw.some((item) => item === null || item === undefined || item === '' || !Number.isFinite(Number(item)))) return '待设置基准值';
  const limits = raw.map(Number), higher = indicator.direction === 'higher';
  if (higher ? !(limits[0] >= limits[1] && limits[1] >= limits[2]) : !(limits[0] <= limits[1] && limits[1] <= limits[2])) return '基准值顺序待校准';
  const index = limits.findIndex((limit) => higher ? Number(value) >= limit : Number(value) <= limit);
  return index < 0 ? '未达三级拟定基准' : ['一级', '二级', '三级'][index];
}
