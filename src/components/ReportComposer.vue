<script setup>
import { randomId } from "../services/id.js";

import { computed, ref } from "vue";
import { useDialog, useMessage } from "naive-ui";
import { db, session } from "../data/store";
import { copy } from "../data/auditWorkflow";
import { governmentProjects, industrySnapshot, workspaceTime } from "../services/governmentWorkspace";
import { documentHtml } from "../services/industryExport";
import { downloadText } from "../services/files";
import IndustryFilters from "./IndustryFilters.vue";
import DataTable from "./DataTable.vue";
import RecordEditor from "./RecordEditor.vue";

const props = defineProps({ rows: Array, filters: Object, options: Object });
const projects = governmentProjects("governmentReportProjects");
const selected = ref(projects.value[0]?.id), editor = ref(false), form = ref({}), version = ref('draft'), preview = ref(false);
const current = computed(() => projects.value.find((project) => project.id === selected.value));
const historical = computed(() => current.value?.versions.find((item) => item.id === version.value));
const document = computed(() => historical.value || current.value);
const dialog = useDialog(), message = useMessage();
function create() {
  form.value = { title: session.user.name + '行业清洁生产分析报告', year: 2026, purpose: '分析辖区行业清洁生产水平、共性问题及改进方向。' };
  editor.value = true;
}
function saveProject(values) {
  if (!props.rows.length) return message.warning('当前筛选范围没有企业，请调整筛选条件');
  const snapshot = industrySnapshot(props.rows, props.filters);
  const project = {
    ...values, id: randomId(), owner: session.user.username, ownerName: session.user.name, createdAt: workspaceTime(), snapshot, versions: [],
    chapters: [
      { id: 'scope', title: '一、研究范围与数据说明', content: `本报告覆盖当前筛选范围内 ${snapshot.enterprises.length} 家企业。数据所属年度：${[...new Set(snapshot.enterprises.map((row) => row.year))].join('、')}。企业数据、评价口径及材料来源详见引用清单，示例数据应在正式使用前核实。` },
      { id: 'status', title: '二、行业现状与清洁生产水平', content: '' },
      { id: 'problems', title: '三、共性问题与原因分析', content: '' },
      { id: 'solutions', title: '四、改进方案与实施建议', content: '' },
      { id: 'conclusion', title: '五、结论与后续工作', content: '' },
    ],
  };
  db.governmentReportProjects.unshift(project);
  selected.value = project.id;
  version.value = 'draft';
  message.success('报告项目已建立，已固定当前引用数据');
}
function updateReferences() {
  if (!props.rows.length) return message.warning('当前筛选范围没有企业');
  dialog.warning({ title: '更新报告引用数据', content: '按当前筛选范围更新引用快照，保留章节草稿及已保存版本。请重新核对正文中的统计数据和结论。', positiveText: '确认更新引用', negativeText: '取消', onPositiveClick: () => { current.value.snapshot = industrySnapshot(props.rows, props.filters); message.success('引用已更新，请核对正文'); } });
}
function saveVersion() {
  const project = current.value;
  if (!project.title.trim()) return message.warning('请填写报告标题');
  project.versions.push(copy({ id: randomId(), number: project.versions.length + 1, at: workspaceTime(), title: project.title, year: project.year, purpose: project.purpose, chapters: project.chapters, snapshot: project.snapshot }));
  message.success('已保存独立成果版本，仍可继续编辑草稿');
}
const html = computed(() => {
  const project = document.value;
  if (!project) return '';
  return documentHtml(project.title, `${project.year} 年度报告草稿；${project.purpose}；引用快照：${project.snapshot.at}，纳入 ${project.snapshot.enterprises.length} 家企业。`, [
    ...project.chapters.map((chapter) => ({ title: chapter.title, columns: [{ field: 'content', title: '正文' }], rows: [{ content: chapter.content || '待编写' }] })),
    { title: '附件：引用数据', columns: [{ field: 'name', title: '企业' }, { field: 'year', title: '数据年度' }, { field: 'production', title: '产量（t/a）' }, { field: 'energyIntensity', title: '单位产品能耗（tce/t）' }, { field: 'level', title: '已有评价水平' }, { field: 'standard', title: '评价依据' }], rows: project.snapshot.enterprises },
    { title: '附件：报告来源清单', columns: [{ field: 'enterprise', title: '企业' }, { field: 'name', title: '报告' }, { field: 'year', title: '年度' }, { field: 'source', title: '材料来源' }], rows: project.snapshot.references },
  ]);
});
</script>

<template>
  <div class="stack report-composer">
    <section class="section-card"><div class="section-heading"><h3>报告引用范围</h3><n-button type="primary" @click="create">新建行业报告</n-button></div><div class="section-body"><IndustryFilters :filters="filters" :options="options" /><p class="section-note">当前可引用 {{ rows.length }} 家企业。新建或更新引用时固定数据快照；企业后续上传资料不会自动覆盖报告。</p></div></section>
    <section class="section-card"><div class="section-heading"><h3>本账号报告项目</h3><span class="muted small">草稿自动保存至本机</span></div><div class="section-body"><DataTable :rows="projects" :columns="[{ field: 'title', title: '报告名称', minWidth: 300 }, { field: 'year', title: '报告年度', width: 110 }, { field: 'createdAt', title: '创建时间', minWidth: 190 }, { field: 'action', title: '操作', width: 130 }]" ><template #action="{ row }"><button class="link-button" @click="selected = row.id; version = 'draft'">进入编制</button></template></DataTable></div></section>
    <section v-if="current" class="section-card report-project">
      <div class="section-heading"><h3>{{ document.title }}</h3><div class="row wrap"><n-select v-model:value="version" :options="[{ label: '当前草稿', value: 'draft' }, ...current.versions.slice().reverse().map((item) => ({ label: '成果 V' + item.number + ' · ' + item.at, value: item.id }))]" style="width: 290px" aria-label="行业报告版本" /><n-button @click="preview = true">预览报告</n-button></div></div>
      <div class="section-body stack">
        <div class="row wrap"><span class="status-pill">{{ historical ? '已保存版本 · 只读' : '编制草稿' }}</span><span class="muted small">引用 {{ document.snapshot.enterprises.length }} 家企业 · 数据快照 {{ document.snapshot.at }}</span></div>
        <template v-if="!historical"><n-input v-model:value="current.title" placeholder="填写行业报告标题" /><div class="row wrap"><n-button @click="updateReferences">按当前范围更新引用</n-button><n-button type="primary" secondary @click="saveVersion">保存成果版本</n-button></div></template>
        <div v-for="chapter in document.chapters" :key="chapter.id" class="report-chapter"><h4>{{ chapter.title }}</h4><n-input v-model:value="chapter.content" :disabled="!!historical" type="textarea" :autosize="{ minRows: 3, maxRows: 12 }" :placeholder="'编写' + chapter.title" /></div>
        <details class="report-references"><summary>引用企业及数据口径 · {{ document.snapshot.enterprises.length }} 家</summary><DataTable :rows="document.snapshot.enterprises" :columns="[{ field: 'name', title: '企业', minWidth: 270 }, { field: 'year', title: '数据年度', width: 110 }, { field: 'level', title: '已有评价水平', width: 170 }, { field: 'standard', title: '评价依据 / 数据口径', minWidth: 340 }]" /></details>
        <details class="report-references"><summary>历史报告引用清单 · {{ document.snapshot.references.length }} 份</summary><DataTable :rows="document.snapshot.references.map((item, index) => ({ ...item, id: index }))" :columns="[{ field: 'enterprise', title: '企业', minWidth: 250 }, { field: 'name', title: '报告', minWidth: 260 }, { field: 'year', title: '年度', width: 90 }, { field: 'source', title: '材料来源', minWidth: 200 }]" /></details>
      </div>
    </section>
    <RecordEditor v-model:show="editor" title="新建行业报告项目" :record="form" :fields="[{ key: 'title', label: '报告名称', required: true, wide: true }, { key: 'year', label: '报告年度', type: 'number', required: true, min: 2000, max: 2100 }, { key: 'purpose', label: '编制目的', type: 'textarea', wide: true, required: true }]" @save="saveProject" />
    <n-modal v-model:show="preview" preset="card" title="行业报告预览" style="width: 1150px; max-width: 95vw"><iframe :srcdoc="html" sandbox title="行业报告草稿预览" style="width: 100%; height: 70vh; border: 1px solid #e4e7ed" /><div class="modal-actions"><n-button type="primary" @click="downloadText(document.title + '.html', html, 'text/html;charset=utf-8')">下载报告草稿</n-button></div></n-modal>
  </div>
</template>

<style scoped>
.report-chapter h4 { margin-bottom: 12px; font-weight: 500; }
.report-references { border: 1px solid #ebeef5; border-radius: 4px; padding: 14px 16px; }
.report-references summary { cursor: pointer; color: #606266; font-size: 13px; }
.report-references[open] summary { margin-bottom: 16px; }
</style>
