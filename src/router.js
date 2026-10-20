import { createRouter, createWebHashHistory } from "vue-router";
import { session } from "./data/store";
import { scopedEnterprises } from "./data/domain";
export const menuItems = [
  {
    key: "government",
    label: "监管总览",
    path: "/app/government",
    icon: "building",
    roles: ["province", "city", "county"],
  },
  {
    key: "government-data",
    label: "企业数据中心",
    path: "/app/government-data",
    icon: "folder",
    roles: ["province", "city", "county"],
  },
  {
    key: "enterprise-archives",
    label: "企业审核档案",
    path: "/app/enterprise-archives",
    icon: "factory",
    roles: ["province", "city", "county"],
  },
  {
    key: "industry-assessment",
    label: "行业水平评估",
    path: "/app/industry-assessment",
    icon: "chart",
    roles: ["province", "city", "county"],
  },
  {
    key: "enterprise",
    label: "企业详情",
    path: "/app/enterprise",
    icon: "factory",
    roles: ["enterprise"],
  },
  {
    key: "data-center",
    label: "企业数据中心",
    path: "/app/data-center",
    icon: "folder",
    roles: ["enterprise"],
  },
  {
    key: "audit-workbench",
    label: "审核工作台",
    path: "/app/audit-workbench",
    icon: "file",
    roles: ["enterprise"],
  },
  {
    key: "oa",
    label: "清洁生产审核 OA",
    path: "/app/oa",
    icon: "clipboard",
    roles: ["enterprise", "province", "city", "county"],
  },
  {
    key: "industry-reports",
    label: "行业报告工作台",
    path: "/app/industry-reports",
    icon: "book",
    roles: ["province", "city", "county"],
  },
  {
    key: "industry-indicators",
    label: "地方指标建设",
    path: "/app/industry-indicators",
    icon: "clipboard",
    roles: ["province", "city", "county"],
  },
  {
    key: "experts",
    label: "专家库",
    path: "/app/experts",
    icon: "users",
    roles: ["enterprise", "province", "city", "county"],
  },
  {
    key: "consultants",
    label: "第三方咨询库",
    path: "/app/consultants",
    icon: "briefcase",
    roles: ["enterprise"],
  },
  {
    key: "government-consultants",
    label: "第三方资讯库",
    path: "/app/consultants",
    icon: "briefcase",
    roles: ["province", "city", "county"],
  },
];
const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: "/", component: () => import("./views/HomePage.vue") },
    { path: "/login/:portal", component: () => import("./views/Login.vue") },
    {
      path: "/app",
      component: () => import("./views/Shell.vue"),
      meta: { auth: true },
      children: [
        {
          path: "industry-assessment",
          component: () => import("./views/IndustryAssessment.vue"),
          meta: {
            title: "行业水平评估",
            roles: ["province", "city", "county"],
          },
        },
        {
          path: "industry-reports",
          component: () => import("./views/GovernmentIndustryReports.vue"),
          meta: {
            title: "行业报告工作台",
            roles: ["province", "city", "county"],
          },
        },
        {
          path: "industry-indicators",
          component: () => import("./views/LocalIndicatorConstruction.vue"),
          meta: {
            title: "地方指标建设",
            roles: ["province", "city", "county"],
          },
        },
        {
          path: "home",
          component: () => import("./views/Dashboard.vue"),
          meta: { title: "首页", roles: ["enterprise"] },
        },
        {
          path: "government",
          component: () => import("./views/Government.vue"),
          meta: { title: "监管总览", roles: ["province", "city", "county"] },
        },
        {
          path: "government-data/:id?",
          component: () => import("./views/GovernmentDataCenter.vue"),
          meta: { title: "企业数据中心", roles: ["province", "city", "county"] },
        },
        {
          path: "enterprise-archives/:id?",
          component: () => import("./views/GovernmentArchives.vue"),
          meta: { title: "企业审核档案", roles: ["province", "city", "county"] },
        },
        {
          path: "enterprise/:id?",
          component: () => import("./views/Enterprise.vue"),
          meta: { title: "企业详情" },
        },
        {
          path: "data-center",
          component: () => import("./views/EnterpriseDataCenter.vue"),
          meta: { title: "企业数据中心", roles: ["enterprise"] },
        },
        {
          path: "audit-workbench",
          component: () => import("./views/AuditWorkbench.vue"),
          meta: { title: "审核工作台", roles: ["enterprise"] },
        },
        {
          path: "oa/:id?",
          component: () => import("./views/OA.vue"),
          meta: { title: "清洁生产审核 OA" },
        },
        {
          path: ":section(experts|consultants)",
          component: () => import("./views/Directory.vue"),
          meta: { title: "业务管理" },
        },
      ],
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});
router.beforeEach((to) => {
  if (
    to.path.startsWith("/login/") &&
    !["government", "enterprise"].includes(to.params.portal)
  )
    return "/login/enterprise";
  if (to.meta.auth && !session.user) return "/login/enterprise";
  if (to.meta.auth) {
    const user = session.user;
    const home = user.role === "enterprise" ? "/app/home" : "/app/government";
    if (to.path === "/app") return home;
    if (to.meta.roles && !to.meta.roles.includes(user.role)) return home;
    if (
      (to.path.startsWith("/app/enterprise") ||
        to.path.startsWith("/app/government-data") ||
        to.path.startsWith("/app/oa")) &&
      to.params.id &&
      !scopedEnterprises(user).some((e) => e.id === to.params.id)
    )
      return home;
  }
  document.title = `${to.meta.title || "清洁生产智慧审核平台"} · 清洁生产智慧审核平台`;
});
export default router;
