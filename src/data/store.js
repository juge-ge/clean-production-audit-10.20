import { reactive, watch } from "vue";
import { accounts, seedEnterprise } from "./domain";
import { upgradeEnterprise } from "./auditWorkflow";
import { applyApprovedDemo } from "./approvedDemo";
const STORAGE = "cleaner-production-demo-v1";
function read(key, storage = localStorage) {
  try {
    return JSON.parse(storage.getItem(key) || "null");
  } catch (error) {
    console.warn("演示数据读取失败", error);
    return null;
  }
}
const saved = read(STORAGE);
export const db = reactive(saved || { enterprises: {} });
export const storageStatus = reactive({ error: "" });
watch(
  db,
  () => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(db));
      storageStatus.error = "";
    } catch (error) {
      storageStatus.error = "本地保存失败，请导出备份后检查浏览器存储空间。";
      console.error(error);
    }
  },
  { deep: true },
);
export const session = reactive({
  user:
    accounts.find((a) => a.username === read("cp-session", sessionStorage)) ||
    null,
});
export function login(account) {
  session.user = account;
  sessionStorage.setItem("cp-session", JSON.stringify(account.username));
}
export function logout() {
  session.user = null;
  sessionStorage.removeItem("cp-session");
}
export function enterpriseData(id) {
  if (!db.enterprises[id]) db.enterprises[id] = seedEnterprise(id);
  const data = upgradeEnterprise(db.enterprises[id]);
  return db.demoPreset === "manual" ? data : applyApprovedDemo(data);
}
export const uid = () => crypto.randomUUID();
