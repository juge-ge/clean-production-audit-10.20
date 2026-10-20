export function downloadText(name, text, type = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type });
  downloadBlob(name, blob);
}
export function downloadBlob(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
export const escapeHtml = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function sampleReport(enterprise, round) {
  downloadText(
    `${enterprise.name}_第${round}轮_演示报告.html`,
    `<!doctype html><meta charset="utf-8"><title>演示报告</title><style>body{max-width:800px;margin:50px auto;font:16px/1.9 sans-serif}h1{font-size:26px}aside{background:#fff5df;padding:16px}</style><h1>${escapeHtml(enterprise.name)}<br>第 ${round} 轮清洁生产审核报告</h1><aside>前端演示样例，不是企业真实审核报告，不可用于审核认定。</aside><h2>一、企业信息</h2><p>${escapeHtml(enterprise.address)}</p><h2>二、筹划与组织</h2><p>由领导小组统筹审核，工作小组负责原始资料归集、现场调查与方案整理。</p><h2>三、现状调研与对标</h2><p>生产、资源能源与排放数据待企业核实，正式评价需匹配适用标准。</p><h2>四、问题与改进</h2><p>具体整改措施请参阅平台整改台账。此文件用于验证下载交互。</p>`,
    "text/html;charset=utf-8",
  );
}
let database;
function openDB() {
  if (!database)
    database = new Promise((resolve, reject) => {
      const req = indexedDB.open("cleaner-production-files", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("files");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  return database;
}
async function transaction(mode, fn) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction("files", mode);
    const req = fn(tx.objectStore("files"));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("文件保存已中止"));
  });
}
export const saveFile = (id, file) =>
  transaction("readwrite", (s) => s.put(file, id));
export const getFile = async (id) => {
  const file = await transaction("readonly", (s) => s.get(id));
  if (file) return file;
  if (String(id).startsWith("demo-approved-"))
    return (await import("../data/approvedDemo.js")).demoAttachment(id);
  return file;
};
export const removeFile = (id) => transaction("readwrite", (s) => s.delete(id));
