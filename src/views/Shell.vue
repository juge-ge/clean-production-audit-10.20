<script setup>
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { session, logout } from "../data/store";
import { menuItems } from "../router";
import Icon from "../components/Icon.vue";
const route = useRoute(),
  router = useRouter(),
  collapsed = ref(false);
const menu = computed(() =>
  menuItems.filter((m) => m.roles.includes(session.user?.role)),
);
const isActive = (item) => route.path === item.path || route.path.startsWith(item.path + '/');
const current = computed(
  () =>
    menu.value.find(isActive)?.label ||
    (session.user?.role !== 'enterprise' && route.path.startsWith('/app/enterprise/') ? '企业审核档案' : '企业详情'),
);
function signOut() {
  const portal =
    session.user?.role === "enterprise" ? "enterprise" : "government";
  logout();
  router.push("/login/" + portal);
}
</script>
<template>
  <div class="admin-shell" :class="{ collapsed }">
    <aside class="sidebar">
      <router-link to="/" class="brand"
        ><span class="brand-mark"><Icon name="leaf" :size="22" /></span
        ><span class="brand-text">清洁生产智慧审核</span></router-link
      >
      <div class="sidebar-section">
        {{
          session.user?.role === "enterprise" ? "企业工作空间" : "政府管理空间"
        }}
      </div>
      <nav>
        <router-link
          v-for="item in menu"
          :key="item.key"
          :to="item.path"
          :class="[
            'sidebar-item',
            { active: isActive(item) },
          ]"
          :title="item.label"
          ><Icon :name="item.icon" /><span>{{ item.label }}</span
          ><Icon name="right" :size="13" class="nav-chevron"
        /></router-link>
      </nav>
      <div class="sidebar-footer">
        <span class="status-dot"></span><span>2026 年度清洁生产审核</span>
        <p>前端设计 · 演示环境</p>
      </div>
    </aside>
    <div class="shell-main">
      <header class="topbar">
        <button
          class="icon-button"
          @click="collapsed = !collapsed"
          aria-label="展开或收起菜单"
        >
          <Icon name="menu" :size="20" />
        </button>
        <div class="breadcrumb">
          <span>工作空间</span><span>/</span><strong>{{ current }}</strong>
        </div>
        <div class="spacer"></div>
        <n-tag size="small" :bordered="false" type="info">{{
          session.user?.label
        }}</n-tag
        ><span class="top-account">{{ session.user?.name }}</span
        ><button
          class="icon-button"
          @click="signOut"
          aria-label="退出登录"
          title="退出登录"
        >
          <Icon name="logout" />
        </button>
      </header>
      <div class="page-tags">
        <router-link
          :to="
            session.user?.role === 'enterprise'
              ? '/app/home'
              : '/app/government'
          "
          >首页</router-link
        ><span class="selected"
          ><span class="tag-dot"></span>{{ current }}</span
        >
        <div class="spacer"></div>
        <router-link to="/" class="return-portal"
          >门户首页 <Icon name="external" :size="12"
        /></router-link>
      </div>
      <main class="content-area"><router-view :key="route.path" /></main>
      <footer class="app-footer">
        清洁生产智慧审核平台<span
          >演示数据 · 已保存的修改仅在本机浏览器保留</span
        >
      </footer>
    </div>
  </div>
</template>
<style scoped>
.admin-shell {
  --sidebar-width: 218px;
  min-height: 100vh;
}
.sidebar {
  width: var(--sidebar-width);
  background: #304156;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  color: #bfcbd9;
  display: flex;
  flex-direction: column;
  z-index: 30;
  transition: width 0.2s;
}
.brand {
  height: 66px;
  display: flex;
  align-items: center;
  padding: 0 18px;
  gap: 10px;
  background: #2b3b4f;
  color: white;
  white-space: nowrap;
  overflow: hidden;
}
.brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 31px;
  height: 31px;
  border: 1px solid #71879a;
  border-radius: 4px;
  color: #e6f3f1;
  flex-shrink: 0;
}
.brand-text {
  font-size: 16px;
  font-weight: 600;
}
.sidebar-section {
  padding: 26px 22px 15px;
  font-size: 11px;
  color: #8295aa;
  letter-spacing: 1px;
  white-space: nowrap;
  overflow: hidden;
}
.sidebar nav {
  min-height: 0;
  overflow-y: auto;
}
.sidebar > .brand,
.sidebar-section,
.sidebar-footer {
  flex-shrink: 0;
}
.sidebar-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 17px 21px;
  font-size: 14px;
  white-space: nowrap;
}
.sidebar-item:hover {
  background: #263445;
}
.sidebar-item.active {
  color: #409eff;
  background: #263445;
  box-shadow: inset 3px 0 #409eff;
}
.nav-chevron {
  margin-left: auto;
  color: #74879a;
}
.sidebar-footer {
  margin-top: auto;
  padding: 22px 20px;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  border-top: 1px solid #ffffff0b;
}
.sidebar-footer p {
  color: #71869d;
  margin: 8px 0 0 13px;
}
.shell-main {
  margin-left: var(--sidebar-width);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  transition: margin 0.2s;
}
.topbar {
  height: 58px;
  background: white;
  border-bottom: 1px solid #f1f2f4;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 0 22px;
}
.icon-button {
  background: transparent;
  border: 0;
  color: #606266;
  padding: 5px;
}
.breadcrumb {
  display: flex;
  gap: 14px;
  color: #909399;
  font-size: 13px;
}
.breadcrumb strong {
  color: #606266;
  font-weight: 400;
}
.top-account {
  font-size: 12px;
  color: #606266;
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.page-tags {
  height: 38px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 8px;
  font-size: 12px;
}
.page-tags > a,
.page-tags > span {
  padding: 2px 10px;
  border: 1px solid #d8dce5;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 6px;
}
.page-tags .selected {
  background: #409eff;
  border-color: #409eff;
  color: white;
}
.tag-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: white;
}
.page-tags .return-portal {
  border: 0;
  color: #909399;
}
.content-area {
  padding: 22px;
  flex: 1;
  min-width: 0;
}
.app-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 24px;
  color: #a6aab2;
  font-size: 11px;
}
.collapsed {
  --sidebar-width: 66px;
}
.collapsed .brand {
  padding: 0 17px;
}
.collapsed .sidebar-item {
  padding: 18px 24px;
}
.collapsed .brand-text,
.collapsed .sidebar-item > span,
.collapsed .nav-chevron,
.collapsed .sidebar-section,
.collapsed .sidebar-footer {
  display: none;
}
.collapsed .sidebar nav {
  padding-top: 24px;
}
@media (max-width: 900px) {
  .admin-shell {
    --sidebar-width: 66px;
  }
  .brand {
    padding: 0 17px;
  }
  .brand-text,
  .sidebar-item > span,
  .nav-chevron,
  .sidebar-section,
  .sidebar-footer {
    display: none;
  }
  .sidebar-item {
    padding: 20px 24px;
  }
  .top-account {
    display: none;
  }
  .content-area {
    padding: 14px;
  }
  .app-footer {
    flex-wrap: wrap;
  }
  .topbar {
    padding: 0 14px;
    gap: 12px;
  }
}
@media (max-width: 550px) {
  .admin-shell {
    --sidebar-width: 52px;
  }
  .brand {
    padding: 0 10px;
  }
  .sidebar-item {
    padding: 18px 17px;
  }
  .topbar .n-tag {
    display: none;
  }
  .breadcrumb {
    gap: 7px;
  }
  .content-area {
    padding: 10px;
  }
  .page-tags {
    padding: 0 10px;
  }
}
</style>
