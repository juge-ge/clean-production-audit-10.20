<script setup>
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useMessage } from "naive-ui";
import { session, enterpriseData } from "../data/store";
import { roundOptions } from "../data/domain";
import { useGovernmentEnterprises } from "../services/governmentWorkspace";
import { sampleReport, getFile, downloadBlob } from "../services/files";
import { downloadAuditReport } from "../services/auditReport";
import IndustryFilters from "../components/IndustryFilters.vue";
import DataTable from "../components/DataTable.vue";
import EvidenceDrawer from "../components/EvidenceDrawer.vue";
import Enterprise from "./Enterprise.vue";

const route = useRoute(), router = useRouter(), message = useMessage();
const { filters, rows, options } = useGovernmentEnterprises();
const tab = ref(route.query.tab === "reports" ? "reports" : "enterprises"), reportQuery = ref(""), reportYear = ref(null), reportRound = ref(null);
const reports = computed(() => rows.value.flatMap((row) => row.data.reports.map((report) => ({
  ...report, id: row.id + '-' + report.id, enterpriseId: row.id, enterprise: row.name,
  source: report.generatedId ? "前端汇编" : report.fileId ? "企业上传" : "示例占位 · 未关联原件",
}))).filter((report) => (!reportYear.value || report.year === reportYear.value) && (!reportRound.value || report.round === reportRound.value) && (report.name + report.enterprise).includes(reportQuery.value)));
const reportYears = computed(() => [...new Set(rows.value.flatMap((row) => row.data.reports.map((report) => report.year)))].sort((a,b) => b-a).map((value) => ({ label: value + ' 年', value })));
const evidence = ref({ show: false, source: "", page: 1, documents: [] });
function openReport(report) {
  if (!report.fileId) return router.push('/app/enterprise-archives/' + report.enterpriseId + '?round=' + report.round + '&p=summary');
  evidence.value = { show: true, source: report.fileId, page: 1, documents: enterpriseData(report.enterpriseId).documents };
}
async function download(report) {
  const data = enterpriseData(report.enterpriseId);
  if (report.generatedId && data.delivery.report) return downloadAuditReport(data.delivery.report);
  if (!report.fileId) return sampleReport(data.info, report.round);
  try { const file = await getFile(report.fileId); if (!file) return message.warning('关联原文件未找到'); downloadBlob(data.documents.find((item) => item.id === report.fileId)?.name || report.name, file); }
  catch { message.error('报告读取失败，请重试'); }
}
</script>

<template>
  <div class="stack government-archives-page">
    <div class="between"><div><h1 class="page-title">企业审核档案</h1><p class="page-description">{{ session.user.name }} · 历轮审核报告、评价水平与实施成效</p></div><n-button v-if="route.params.id" @click="router.push('/app/enterprise-archives')">返回档案列表</n-button></div>
    <Enterprise v-if="route.params.id" :key="route.params.id" archive-view />
    <template v-else>
      <section class="section-card"><div class="section-body"><IndustryFilters :filters="filters" :options="options" /></div></section>
      <div class="tabs-strip"><button :class="{ active: tab === 'enterprises' }" @click="tab = 'enterprises'">企业档案</button><button :class="{ active: tab === 'reports' }" @click="tab = 'reports'">报告检索</button></div>
      <section class="section-card"><div class="section-heading"><h3>{{ tab === 'enterprises' ? '企业历轮审核档案' : '跨企业报告检索' }}</h3><span class="muted small">历史资料与正式办理记录关联保留</span></div>
        <div class="section-body stack">
          <DataTable v-if="tab === 'enterprises'" :rows="rows" :columns="[
            { field: 'name', title: '企业名称', minWidth: 270 }, { field: 'city', title: '所属地市', width: 110 },
            { field: 'county', title: '所属区县', width: 110 }, { field: 'reportCount', title: '历轮报告记录', width: 140 },
            { field: 'action', title: '操作', width: 140, fixed: 'right' },
          ]"><template #action="{ row }"><button class="link-button" @click="router.push('/app/enterprise-archives/' + row.id + '?p=info')">查看多轮次档案</button></template></DataTable>
          <template v-else>
            <div class="toolbar"><n-input v-model:value="reportQuery" placeholder="搜索报告名称或企业" clearable style="width: 300px" /><n-select v-model:value="reportYear" :options="reportYears" placeholder="全部报告年度" clearable style="width: 180px" /><n-select v-model:value="reportRound" :options="roundOptions.map((option) => ({ value: option.value, label: '第 ' + option.value + ' 轮' }))" placeholder="全部审核轮次" clearable style="width: 180px" /></div>
            <DataTable :rows="reports" :columns="[
              { field: 'enterprise', title: '企业名称', minWidth: 250 }, { field: 'name', title: '报告名称', minWidth: 260 },
              { field: 'year', title: '年度', width: 90 }, { field: 'round', title: '轮次', width: 80 },
              { field: 'status', title: '原记录状态', width: 140 }, { field: 'source', title: '材料来源', minWidth: 180 },
              { field: 'action', title: '操作', width: 180, fixed: 'right' },
            ]"><template #action="{ row }"><button class="link-button" @click="openReport(row)">查看</button><button class="link-button" @click="download(row)">{{ row.fileId || row.generatedId ? '下载报告' : '下载示例' }}</button></template></DataTable>
          </template>
          <p class="section-note">点击企业可切换历轮记录。未关联原件的示例报告、前端汇编与企业上传材料分别标识，不据此自动认定正式评估验收结果。</p>
        </div>
      </section>
    </template>
    <EvidenceDrawer v-model:show="evidence.show" :source="evidence.source" :page="evidence.page" :documents="evidence.documents" />
  </div>
</template>
