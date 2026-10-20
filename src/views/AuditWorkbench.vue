<script setup>
import { computed, provide, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDialog, useMessage } from "naive-ui";
import { session, enterpriseData } from "../data/store";
import { phases } from "../data/domain";
import { workspaceData, syncWorkspaceDocuments, prepareWorkspaceSubmission } from "../services/enterpriseWorkspace";
import EnterpriseInfo from "./EnterpriseInfo.vue";
import Documents from "./Documents.vue";
import Organization from "./Organization.vue";
import Survey from "./Survey.vue";
import Analysis from "./Analysis.vue";
import Schemes from "./SchemeWorkspace.vue";
import Summary from "./Summary.vue";
import EvidenceDrawer from "../components/EvidenceDrawer.vue";
import Icon from "../components/Icon.vue";

const route = useRoute(), router = useRouter(), dialog = useDialog(), message = useMessage();
const entity = computed(() => enterpriseData(session.user.enterpriseId));
const data = computed(() => workspaceData(entity.value));
const round = ref(3);
const roundData = computed(() => data.value.rounds[3]);
const readOnly = computed(() => false);
const phase = computed({
  get: () => phases.some((item) => item.id === route.query.p) ? route.query.p : "info",
  set: (value) => router.replace({ query: { ...route.query, p: value } }),
});
const phaseIndex = computed(() => phases.findIndex((item) => item.id === phase.value));
const components = { info: EnterpriseInfo, documents: Documents, organization: Organization, survey: Survey, analysis: Analysis, solution: Schemes, summary: Summary };
const evidence = ref({ show: false, source: "", page: 1 });
function showEvidence(source, page) { evidence.value = { show: true, source, page }; }
const sourceDocuments = computed(() => entity.value.documents);
provide("audit", { data, round, roundData, readOnly, phase, showEvidence, sourceDocuments, isWorkbench: true });
const newDocuments = computed(() => entity.value.documents.filter((file) => !data.value.documents.some((item) => item.id === file.id)).length);
const canPrepare = computed(() => ["draft", "revising"].includes(entity.value.oaWorkflow.status));
function synchronize() {
  dialog.info({
    title: "引用企业数据中心资料",
    content: "更新本轮草稿中的资料清单，保留工作台内上传的文件。已填写的分析数据、历史轮次和正式提交版本均会保留。",
    positiveText: "更新资料引用", negativeText: "取消",
    onPositiveClick: () => { syncWorkspaceDocuments(entity.value); message.success("资料引用已更新，请核对数据及统计口径"); },
  });
}
function prepare() {
  dialog.info({
    title: "准备 OA 提交材料",
    content: "将当前草稿中的企业情况、筹划与组织、现状调研与对标、问题分析与目标设置带入 OA 待提交材料。请继续核对并确认正式提交。",
    positiveText: "带入并前往 OA", negativeText: "继续编制",
    onPositiveClick: () => {
      try { prepareWorkspaceSubmission(entity.value); router.push("/app/oa?stage=submit"); }
      catch (error) { message.warning(error.message); }
    },
  });
}
</script>

<template>
  <div class="stack audit-workbench">
    <section class="section-card workbench-heading">
      <div>
        <div class="row wrap"><h2>审核工作台</h2><n-tag size="small" type="info" :bordered="false">本轮草稿</n-tag></div>
        <p>{{ entity.info.name }} · 第 3 轮 · 2026 年清洁生产审核</p>
      </div>
      <div class="row wrap">
        <n-button @click="router.push('/app/data-center')">企业数据中心</n-button>
        <n-button @click="synchronize">更新资料引用<span v-if="newDocuments">（{{ newDocuments }}）</span></n-button>
        <n-button v-if="canPrepare" type="primary" @click="prepare">准备 OA 提交</n-button>
        <n-button v-else type="primary" @click="router.push('/app/oa?stage=submit')">查看 OA 办理</n-button>
      </div>
    </section>
    <n-alert type="info" :show-icon="false">本轮资料、分析和报告草稿自动保存至本机。正式提交请在清洁生产审核 OA 中确认；已提交版本独立保留。</n-alert>
    <div class="workbench-phases">
      <button v-for="(item, index) in phases" :key="item.id" :class="{ active: phase === item.id }" @click="phase = item.id">
        <span class="phase-number">{{ index + 1 }}</span><strong>{{ item.name }}</strong><small>{{ item.desc }}</small>
      </button>
    </div>
    <component :is="components[phase]" :key="phase" :phase="phase" />
    <div class="workbench-footer">
      <span class="muted small">本轮草稿 · 第 {{ phaseIndex + 1 }} / {{ phases.length }} 阶段</span>
      <div class="row">
        <n-button v-if="phaseIndex > 0" @click="phase = phases[phaseIndex - 1].id">上一阶段</n-button>
        <n-button v-if="phaseIndex < phases.length - 1" type="primary" @click="phase = phases[phaseIndex + 1].id">下一阶段：{{ phases[phaseIndex + 1].name }}</n-button>
      </div>
    </div>
    <EvidenceDrawer v-model:show="evidence.show" :source="evidence.source" :page="evidence.page" :documents="data.documents" />
  </div>
</template>

<style scoped>
.workbench-heading, .workbench-footer { display: flex; justify-content: space-between; gap: 20px; align-items: center; padding: 22px; }
h2 { font-size: 19px; }
.workbench-heading p { margin-top: 10px; color: #909399; font-size: 13px; }
.workbench-phases { display: flex; gap: 4px; padding: 12px; border: 1px solid #e8ebf0; border-radius: 5px; background: white; overflow: auto; }
.workbench-phases button { flex: 1; min-width: 140px; border: 0; background: transparent; padding: 14px 10px; border-radius: 4px; text-align: left; color: #606266; }
.workbench-phases button:hover { background: #f7f9fc; }
.workbench-phases button.active { background: #ecf5ff; color: #409eff; }
.phase-number { display: inline-flex; justify-content: center; align-items: center; background: #f0f2f5; width: 25px; height: 25px; border-radius: 50%; margin-right: 8px; }
.active .phase-number { background: #409eff; color: white; }
.workbench-phases strong { font-size: 12px; font-weight: 500; }
.workbench-phases small { display: block; margin-top: 9px; padding-left: 33px; color: #909399; font-size: 11px; }
.workbench-footer { padding: 6px 0; }
@media (max-width: 1000px) { .workbench-heading { align-items: flex-start; flex-direction: column; } }
</style>
