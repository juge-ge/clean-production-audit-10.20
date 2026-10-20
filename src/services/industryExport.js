import { downloadText, escapeHtml } from "./files.js";
export function csv(name, columns, rows) {
  const cell = (v) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
  downloadText(
    name + ".csv",
    "\uFEFF" +
      [
        columns.map((x) => cell(x.title)).join(","),
        ...rows.map((r) =>
          columns
            .map((c) =>
              cell(
                typeof r[c.field] === "boolean"
                  ? r[c.field]
                    ? "已归档"
                    : "未归档"
                  : r[c.field],
              ),
            )
            .join(","),
        ),
      ].join("\r\n"),
    "text/csv;charset=utf-8",
  );
}
export function documentHtml(title, intro, sections) {
  const e = escapeHtml;
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${e(title)}</title><style>body{max-width:1100px;margin:40px auto;padding:20px;font:14px/1.9 'Microsoft YaHei',sans-serif;color:#303133}h1{font-size:25px}h2{font-size:18px;margin-top:30px;color:#265879}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #dce2e9;padding:9px;text-align:left}th{background:#f3f6f9}aside{background:#f5f7fa;padding:14px}@media print{tr{break-inside:avoid}}</style><h1>${e(title)}</h1><aside>${e(intro)}</aside>${sections.map((s) => `<h2>${e(s.title)}</h2><table><tr>${s.columns.map((c) => `<th>${e(c.title)}</th>`).join("")}</tr>${s.rows.map((r) => `<tr>${s.columns.map((c) => `<td>${e(r[c.field])}</td>`).join("")}</tr>`).join("")}</table>`).join("")}</html>`;
}
