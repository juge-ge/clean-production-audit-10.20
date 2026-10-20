<script setup>
import { ref, computed } from "vue";
import { session, enterpriseData } from "../data/store";
import { scopedEnterprises, regions, accounts } from "../data/domain";
import { useRouter } from "vue-router";
import Icon from "../components/Icon.vue";
import DataTable from "../components/DataTable.vue";
import { dataApproved, deliveryLabels } from "../data/deliveryWorkflow";
import { statusLabels } from "../data/auditWorkflow";
const router = useRouter(),
  query = ref(""),
  county = ref(null),
  stage = ref(null),
  showScope = ref(false);
const scope = computed(() => scopedEnterprises(session.user));
const scopeCounties = computed(() =>
  regions.filter((r) => scope.value.some((e) => e.countyId === r.id)),
);
const scopeCities = computed(() => [
  ...new Set(scope.value.map((e) => e.city)),
]);
const rows = computed(() =>
  scope.value
    .map((e) => ({
      ...e,
      ...enterpriseData(e.id).info,
      files: enterpriseData(e.id).documents.length,
      stage: dataApproved(enterpriseData(e.id))
        ? deliveryLabels[enterpriseData(e.id).delivery.status]
        : statusLabels[enterpriseData(e.id).oaWorkflow.status],
    }))
    .filter(
      (e) =>
        (!county.value || e.countyId === county.value) &&
        (!stage.value || e.stage === stage.value) &&
        (e.name + e.creditCode).includes(query.value),
    ),
);
const scopeAccounts = computed(() =>
  accounts.filter(
    (a) =>
      a.username === session.user.username ||
      session.user.role === "province" ||
      (session.user.role === "city" &&
        ((a.role === "county" &&
          scopeCounties.value.some((r) => r.id === a.region)) ||
          (a.role === "enterprise" &&
            scope.value.some((e) => e.id === a.enterpriseId)))) ||
      (session.user.role === "county" &&
        a.role === "enterprise" &&
        a.region === session.user.region),
  ),
);
</script>
<template>
  <div class="stack">
    <div class="between">
      <div>
        <div class="muted small">政府管理端 / {{ session.user.label }}</div>
        <h1 class="page-title" style="margin-top: 7px">
          {{ session.user.name }}监管总览
        </h1>
        <p class="page-description">
          统筹辖区审核进度，查看企业资料与持续改进情况。
        </p>
      </div>
      <n-button @click="showScope = true"
        ><Icon name="shield" :size="15" />&nbsp; 查看管理范围</n-button
      >
    </div>
    <section class="section-card">
      <div class="section-heading"><h3>业务入口</h3><span class="muted small">辖区数据、企业档案与正式办理</span></div>
      <div class="section-body row wrap">
        <n-button @click="router.push('/app/government-data')"><Icon name="folder" :size="16" />&nbsp; 企业数据中心</n-button>
        <n-button @click="router.push('/app/enterprise-archives')"><Icon name="book" :size="16" />&nbsp; 企业审核档案</n-button>
        <n-button @click="router.push('/app/industry-assessment')"><Icon name="chart" :size="16" />&nbsp; 行业水平评估</n-button>
        <n-button type="primary" secondary @click="router.push('/app/oa')"><Icon name="clipboard" :size="16" />&nbsp; OA 收件办理</n-button>
      </div>
    </section>
    <div class="metrics">
      <div class="metric">
        <div class="metric-label">辖区企业</div>
        <div class="metric-value">{{ scope.length }}<small>家</small></div>
        <div class="metric-foot">本账号管理范围</div>
      </div>
      <div class="metric">
        <div class="metric-label">覆盖区县</div>
        <div class="metric-value">
          {{ scopeCounties.length }}<small>个</small>
        </div>
        <div class="metric-foot">{{ scopeCities.join(" / ") }}</div>
      </div>
      <div class="metric">
        <div class="metric-label">本年度审核</div>
        <div class="metric-value">{{ scope.length }}<small>家</small></div>
        <div class="metric-foot">2026 年度 · 测试企业</div>
      </div>
      <div class="metric">
        <div class="metric-label">已归集文件</div>
        <div class="metric-value">
          {{
            scope.reduce(
              (sum, e) => sum + enterpriseData(e.id).documents.length,
              0,
            )
          }}<small>份</small>
        </div>
        <div class="metric-foot">企业资料库</div>
      </div>
    </div>
    <div class="government-grid">
      <aside class="section-card">
        <div class="section-heading"><h3>行政区划</h3></div>
        <div class="region-tree">
          <button :class="{ active: !county }" @click="county = null">
            <Icon name="building" :size="16" /> 全部管理范围
            <small>{{ scope.length }}</small>
          </button>
          <div v-for="city in scopeCities" :key="city">
            <div class="city-node">
              <Icon name="down" :size="13" />{{ city }}
            </div>
            <button
              v-for="r in scopeCounties.filter((c) => c.city === city)"
              :key="r.id"
              :class="{ active: county === r.id }"
              @click="county = r.id"
            >
              <Icon name="folder" :size="14" />{{ r.name
              }}<small>{{
                scope.filter((e) => e.countyId === r.id).length
              }}</small>
            </button>
          </div>
        </div>
      </aside>
      <section class="section-card">
        <div class="section-heading">
          <h3><Icon name="factory" /> 辖区企业审核台账</h3>
          <span class="muted small">共 {{ rows.length }} 家</span>
        </div>
        <div class="section-body">
          <div class="toolbar">
            <n-input
              v-model:value="query"
              placeholder="企业名称 / 统一社会信用代码"
              clearable
              style="width: 280px"
              ><template #prefix
                ><Icon name="search" :size="16" /></template></n-input
            ><n-select
              v-model:value="stage"
              clearable
              placeholder="全部审核阶段"
              :options="
                [
                  ...Object.values(statusLabels),
                  ...Object.values(deliveryLabels),
                ].map((s) => ({
                  label: s,
                  value: s,
                }))
              "
              style="width: 180px"
            /><n-button
              @click="
                query = '';
                county = null;
                stage = null;
              "
              >重置</n-button
            >
          </div>
          <DataTable
            :rows="rows"
            :columns="[
              { field: 'name', title: '企业名称', minWidth: 255 },
              { field: 'city', title: '所属地市', width: 100 },
              { field: 'county', title: '所属区县', width: 100 },
              { field: 'stage', title: '当前审核阶段', width: 200 },
              { field: 'files', title: '资料数', width: 80 },
              { field: 'action', title: '操作', width: 110, fixed: 'right' },
            ]"
            ><template #name="{ row }"
              ><button
                class="link-button"
                @click="router.push('/app/enterprise-archives/' + row.id)"
              >
                {{ row.name }}
              </button></template
            ><template #stage="{ row }"
              ><n-tag size="small" :bordered="false" type="info">{{
                row.stage
              }}</n-tag></template
            ><template #action="{ row }"
              ><button
                class="link-button"
                @click="router.push('/app/enterprise-archives/' + row.id)"
              >
                查看审核
              </button></template
            ></DataTable
          >
          <div class="table-end">仅展示本账号所辖企业 · 前端权限演示</div>
        </div>
      </section>
    </div>
    <n-drawer v-model:show="showScope" :width="750"
      ><n-drawer-content title="账号与管理范围" closable
        ><n-alert type="info" :show-icon="false" style="margin-bottom: 20px"
          >省级可查看全省 8 家企业；市级可查看下属 2 个区县的 4
          家企业；县级可查看本县 2 家企业。此为前端数据范围演示。</n-alert
        ><DataTable
          :rows="scopeAccounts.map((a) => ({ ...a, id: a.username }))"
          :columns="[
            { field: 'username', title: '账号', width: 145 },
            { field: 'name', title: '单位名称', minWidth: 280 },
            { field: 'label', title: '角色', width: 110 },
          ]" /></n-drawer-content
    ></n-drawer>
  </div>
</template>
<style scoped>
.government-grid {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
  gap: 20px;
}
.region-tree {
  padding: 12px 8px;
}
.region-tree button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 12px;
  border: 0;
  width: 100%;
  background: none;
  text-align: left;
  font-size: 13px;
  color: #606266;
  border-radius: 3px;
}
.region-tree button:hover {
  background: #f5f7fa;
}
.region-tree button.active {
  background: #ecf5ff;
  color: #409eff;
}
.region-tree small {
  margin-left: auto;
  color: #909399;
}
.city-node {
  padding: 17px 12px 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.region-tree > div button {
  padding-left: 30px;
}
@media (max-width: 1100px) {
  .government-grid {
    grid-template-columns: 1fr;
  }
  .region-tree {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
  }
  .region-tree > button {
    width: auto;
    align-self: flex-start;
  }
  .region-tree > div {
    display: flex;
    align-items: center;
  }
  .region-tree > div button {
    padding-left: 12px;
  }
  .city-node {
    padding: 10px;
    white-space: nowrap;
  }
}
</style>
