<script setup>
import { computed, provide, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { session, enterpriseData } from "../data/store";
import { useGovernmentEnterprises } from "../services/governmentWorkspace";
import IndustryFilters from "../components/IndustryFilters.vue";
import DataTable from "../components/DataTable.vue";
import EvidenceDrawer from "../components/EvidenceDrawer.vue";
import Documents from "./Documents.vue";
import EnterpriseInfo from "./EnterpriseInfo.vue";
import Survey from "./Survey.vue";

const route = useRoute(), router = useRouter();
const { filters, rows, options } = useGovernmentEnterprises();
const selected = computed(() => route.params.id ? enterpriseData(route.params.id) : null);
const data = selected, round = ref(3), roundData = computed(() => data.value?.rounds[3]), readOnly = computed(() => true);
const evidence = ref({ show: false, source: "", page: 1 });
const tab = ref("documents");
const components = { documents: Documents, info: EnterpriseInfo, survey: Survey };
function showEvidence(source, page) { evidence.value = { show: true, source, page }; }
provide("audit", { data, round, roundData, readOnly, showEvidence, isOa: true });
</script>

<template>
  <div class="stack government-data-page">
    <div class="between">
      <div><h1 class="page-title">企业数据中心</h1><p class="page-description">{{ selected ? selected.info.name : session.user.name }} · 持续更新资料与数据查询</p></div>
      <n-button v-if="selected" @click="router.push('/app/government-data')">返回企业列表</n-button>
    </div>
    <template v-if="!selected">
      <section class="section-card"><div class="section-body"><IndustryFilters :filters="filters" :options="options" /></div></section>
      <div class="industry-metrics">
        <div><span>当前范围企业</span><strong>{{ rows.length }} <small>家</small></strong></div>
        <div><span>已归集资料</span><strong>{{ rows.reduce((sum, row) => sum + row.files, 0) }} <small>份</small></strong></div>
        <div><span>尚未上传资料</span><strong>{{ rows.filter((row) => !row.files).length }} <small>家</small></strong></div>
      </div>
      <section class="section-card">
        <div class="section-heading"><h3>辖区企业资料</h3><span class="muted small">资料状态沿用企业上传记录</span></div>
        <div class="section-body stack">
          <DataTable :rows="rows" :columns="[
            { field: 'name', title: '企业名称', minWidth: 260 },
            { field: 'city', title: '所属地市', width: 110 },
            { field: 'county', title: '所属区县', width: 110 },
            { field: 'industry', title: '行业', width: 130 },
            { field: 'latest', title: '最近资料上传日期', minWidth: 170 },
            { field: 'files', title: '资料数', width: 90 },
            { field: 'action', title: '操作', width: 125, fixed: 'right' },
          ]"><template #action="{ row }"><button class="link-button" @click="router.push('/app/government-data/' + row.id)">查看企业数据</button></template></DataTable>
          <p class="section-note">按本账号管理范围展示企业持续上传的资料。最近上传日期与资料所属期间分别记录；示例和待核实资料保留原状态。</p>
        </div>
      </section>
    </template>
    <template v-else>
      <div class="tabs-strip">
        <button v-for="item in [{ id: 'documents', name: '资料分类清单' }, { id: 'info', name: '企业基本信息' }, { id: 'survey', name: '生产与资源环境数据' }]" :key="item.id" :class="{ active: tab === item.id }" @click="tab = item.id">{{ item.name }}</button>
      </div>
      <n-alert type="info" :show-icon="false">当前查看企业资料库及已维护数据，原始文件按年度归集。正式评估验收结论请到企业审核档案查询。</n-alert>
      <Documents v-if="tab === 'documents'" :key="selected.info.id" data-center />
      <component v-else :is="components[tab]" :key="selected.info.id + '-' + tab" />
      <EvidenceDrawer v-model:show="evidence.show" :source="evidence.source" :page="evidence.page" :documents="selected.documents" />
    </template>
  </div>
</template>
