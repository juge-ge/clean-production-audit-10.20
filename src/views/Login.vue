<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useMessage } from "naive-ui";
import { accounts, DEMO_PASSWORD } from "../data/domain";
import { login } from "../data/store";
import Icon from "../components/Icon.vue";
import DataTable from "../components/DataTable.vue";
const route = useRoute(),
  router = useRouter(),
  message = useMessage();
const gov = computed(() => route.params.portal === "government");
const username = ref(""),
  password = ref(DEMO_PASSWORD),
  showAccounts = ref(false),
  busy = ref(false);
const available = computed(() =>
  accounts.filter((a) =>
    gov.value ? a.role !== "enterprise" : a.role === "enterprise",
  ),
);
watch(gov, () => (username.value = gov.value ? "gov_province" : "ent_01"), {
  immediate: true,
});
async function submit() {
  const account = available.value.find((a) => a.username === username.value);
  if (!account || password.value !== DEMO_PASSWORD)
    return message.error("账号或密码不正确，请使用下方的测试账号");
  busy.value = true;
  login(account);
  await router.push(gov.value ? "/app/government" : "/app/home");
  busy.value = false;
}
</script>
<template>
  <div class="login-page">
    <header class="login-header">
      <router-link to="/" class="row"
        ><img src="/assets/institute-logo.png" alt="中国环境科学研究院" /><span
          >清洁生产智慧审核平台</span
        ></router-link
      ><router-link to="/" class="muted"
        ><Icon name="back" :size="14" /> 返回门户首页</router-link
      >
    </header>
    <main class="login-main">
      <div class="login-intro">
        <div class="login-kicker">CLEANER PRODUCTION AUDIT</div>
        <h1>让清洁生产审核<br />有据可循，有序推进。</h1>
        <p>连接企业与管理部门，<br />贯通资料归集、现状对标与持续改进。</p>
        <div class="login-features">
          <span><Icon name="file" /> 数据归集</span
          ><span><Icon name="chart" /> 标准对标</span
          ><span><Icon name="clipboard" /> 全程管理</span>
        </div>
        <div class="login-lines"><span></span><span></span><span></span></div>
      </div>
      <section class="login-card">
        <div class="row">
          <span class="login-emblem"
            ><Icon :name="gov ? 'building' : 'factory'" :size="24"
          /></span>
          <div>
            <h2>{{ gov ? "政府管理端" : "企业填报端" }}</h2>
            <p class="muted">欢迎登录清洁生产智慧审核平台</p>
          </div>
        </div>
        <div class="portal-switch">
          <router-link to="/login/enterprise" :class="{ active: !gov }"
            >企业登录</router-link
          ><router-link to="/login/government" :class="{ active: gov }"
            >政府登录</router-link
          >
        </div>
        <n-form @submit.prevent="submit" label-placement="top"
          ><n-form-item label="账号"
            ><n-input
              v-model:value="username"
              size="large"
              placeholder="请输入账号"
              autocomplete="username"
              ><template #prefix
                ><Icon
                  name="user"
                  :size="17" /></template></n-input></n-form-item
          ><n-form-item label="密码"
            ><n-input
              v-model:value="password"
              size="large"
              type="password"
              show-password-on="click"
              placeholder="请输入密码"
              autocomplete="current-password"
              ><template #prefix
                ><Icon
                  name="shield"
                  :size="17" /></template></n-input></n-form-item
          ><n-button
            type="primary"
            size="large"
            block
            attr-type="submit"
            :loading="busy"
            >登 录</n-button
          ></n-form
        >
        <div class="test-login">
          <div class="between">
            <span>快速选择测试账号</span
            ><button class="link-button" @click="showAccounts = true">
              查看全部
            </button>
          </div>
          <n-select
            v-model:value="username"
            :options="
              available.map((a) => ({
                label: a.name + ' · ' + a.username,
                value: a.username,
              }))
            "
            size="small"
          />
          <p>
            测试密码：<code>{{ DEMO_PASSWORD }}</code
            ><span class="muted"> · 仅用于前端演示</span>
          </p>
        </div>
      </section>
    </main>
    <footer class="login-footer">
      中国环境科学研究院 · 清洁生产与循环经济研究中心 <span>前端设计演示</span>
    </footer>
    <n-drawer v-model:show="showAccounts" :width="850"
      ><n-drawer-content title="测试账号 · 省 / 市 / 县 / 企业" closable
        ><n-alert type="info" style="margin-bottom: 20px"
          >15 个测试账号统一密码：{{
            DEMO_PASSWORD
          }}。企业名称与业务数据均为演示数据。</n-alert
        ><DataTable
          :rows="accounts.map((a) => ({ ...a, id: a.username }))"
          :columns="[
            { field: 'username', title: '账号', width: 150 },
            { field: 'name', title: '所属单位', minWidth: 280 },
            { field: 'label', title: '权限范围', width: 110 },
          ]" /></n-drawer-content
    ></n-drawer>
  </div>
</template>
<style scoped>
.login-page {
  min-height: 100vh;
  background: #f4f6f9;
  display: flex;
  flex-direction: column;
}
.login-header {
  height: 100px;
  padding: 0 6%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  border-bottom: 1px solid #e8ebf0;
}
.login-header img {
  width: 200px;
  max-height: 56px;
  object-fit: contain;
}
.login-header span {
  font-size: 21px;
  font-weight: 600;
  color: #234b6b;
  border-left: 1px solid #dcdfe6;
  padding-left: 24px;
  margin-left: 12px;
}
.login-main {
  max-width: 1150px;
  margin: auto;
  width: 100%;
  padding: 70px 30px;
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 90px;
  align-items: center;
}
.login-kicker {
  font-size: 12px;
  letter-spacing: 2px;
  color: #8094a5;
  margin-bottom: 23px;
}
.login-intro h1 {
  font-size: 38px;
  line-height: 1.65;
  color: #294b68;
  letter-spacing: 1px;
  font-weight: 500;
}
.login-intro > p {
  margin-top: 23px;
  color: #7c8b98;
  line-height: 2;
}
.login-features {
  display: flex;
  gap: 28px;
  color: #59748c;
  font-size: 13px;
  margin-top: 40px;
}
.login-features span {
  display: flex;
  align-items: center;
  gap: 8px;
}
.login-lines {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  height: 90px;
  margin-top: 35px;
  border-bottom: 1px solid #cbd7e2;
  opacity: 0.65;
}
.login-lines span {
  display: block;
  border: 1px solid #b4c6d6;
  border-bottom: 0;
  width: 100px;
  height: 50px;
}
.login-lines span:nth-child(2) {
  height: 75px;
  width: 170px;
}
.login-lines span:nth-child(3) {
  height: 35px;
  width: 140px;
}
.login-card {
  background: white;
  padding: 35px 36px;
  border: 1px solid #e3e8ee;
  border-radius: 6px;
  box-shadow: 0 12px 40px #213a5010;
}
.login-card h2 {
  font-size: 23px;
  margin-bottom: 5px;
}
.login-emblem {
  color: #387fb6;
  background: #edf5fc;
  padding: 12px;
  border-radius: 5px;
}
.portal-switch {
  display: flex;
  margin: 28px 0 23px;
  border-bottom: 1px solid #ebeef5;
}
.portal-switch a {
  width: 50%;
  text-align: center;
  padding: 11px 0;
  color: #909399;
  border-bottom: 2px solid transparent;
}
.portal-switch a.active {
  color: #409eff;
  border-color: #409eff;
}
.test-login {
  margin-top: 25px;
  padding-top: 18px;
  border-top: 1px solid #ebeef5;
  font-size: 12px;
  color: #909399;
}
.test-login > .between {
  margin-bottom: 10px;
}
.test-login p {
  margin-top: 10px;
}
.test-login code {
  font-family: inherit;
  color: #606266;
}
.login-footer {
  text-align: center;
  color: #909399;
  font-size: 12px;
  padding: 20px;
}
.login-footer span {
  margin-left: 25px;
  color: #b1b5bc;
}
@media (max-width: 900px) {
  .login-intro {
    display: none;
  }
  .login-main {
    display: block;
    max-width: 480px;
    padding: 35px 20px;
  }
  .login-header {
    padding: 18px;
    height: auto;
    gap: 20px;
    flex-wrap: wrap;
  }
  .login-header img {
    width: 130px;
  }
  .login-header span {
    font-size: 15px;
    padding-left: 12px;
    margin-left: 0;
  }
  .login-card {
    padding: 26px;
  }
}
</style>
