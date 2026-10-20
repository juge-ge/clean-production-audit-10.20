<script setup>
import { computed, ref } from "vue";
import { useMessage, useDialog } from "naive-ui";
import { db, session } from "../data/store";
import { useIndustry } from "../data/useIndustry";
import { visibleSurveys } from "../data/questionnaires";
import { copy } from "../data/auditWorkflow";
import { governmentProjects, industrySnapshot, workspaceTime, trialLevel } from "../services/governmentWorkspace";
import { downloadText } from "../services/files";
import DataTable from "./DataTable.vue";
import RecordEditor from "./RecordEditor.vue";
import IndustryFilters from "./IndustryFilters.vue";

const { filters, rows, options } = useIndustry();
const projects = governmentProjects('localIndicatorProjects');
const selected = ref(projects.value[0]?.id), editor = ref(false), form = ref({}), indicatorEditor = ref(false), indicator = ref({}), step = ref('basis'), version = ref('draft');
const current = computed(() => projects.value.find((project) => project.id === selected.value));
const historical = computed(() => current.value?.versions.find((item) => item.id === version.value));
const working = computed(() => historical.value || current.value);
const message = useMessage(), dialog = useDialog();
const fieldOptions = [
  { value: 'energyIntensity', label: '单位产品综合能耗', unit: 'tce/t', direction: 'lower', formula: '综合能源消耗量 / 产品产量' },
  { value: 'waterIntensity', label: '单位产品新鲜水耗', unit: 'm³/t', direction: 'lower', formula: '新鲜水消耗量 / 产品产量' },
  { value: 'carbonIntensity', label: '单位产品碳排放', unit: 'tCO₂e/t', direction: 'lower', formula: '碳排放合计 / 产品产量' },
  { value: 'materialReuse', label: '资源回用率', unit: '%', direction: 'higher', formula: '按企业资料中的资源回用统计口径核实' },
];
const surveyOptions = computed(() => visibleSurveys(db, session.user).map((survey) => ({ label: survey.title, value: survey.id })));
function newProject() {
  form.value = { title: '白酒行业清洁生产地方指标研究', industry: filters.industry || '白酒制造', boundary: '辖区相关行业企业，具体产品与统计边界待研究确认', basis: '' };
  editor.value = true;
}
function saveProject(values) {
  if (!rows.value.length) return message.warning('当前筛选范围没有企业');
  if (rows.value.some((row) => row.industry !== values.industry)) return message.warning('请先将样本筛选到项目所属行业，再创建项目');
  const project = { ...values, id: crypto.randomUUID(), owner: session.user.username, ownerName: session.user.name, at: workspaceTime(), snapshot: industrySnapshot(rows.value, filters), indicators: [], versions: [], reviewNote: '', surveyId: null, publication: { title: '', number: '', effectiveDate: '', source: '' } };
  db.localIndicatorProjects.unshift(project);
  selected.value = project.id; version.value = 'draft'; step.value = 'basis';
  message.success('指标建设项目已建立，已固定当前样本');
}
function editIndicator(row) {
  indicator.value = row ? copy(row) : { id: crypto.randomUUID(), field: 'energyIntensity', name: fieldOptions[0].label, unit: fieldOptions[0].unit, formula: fieldOptions[0].formula, direction: 'lower', first: null, second: null, third: null, source: '' };
  indicatorEditor.value = true;
}
function saveIndicator(values) {
  if (!fieldOptions.some((field) => field.value === values.field)) return message.warning('请选择试评价数据字段');
  const result = trialLevel(0, values);
  if (result === '基准值顺序待校准') return message.warning('请检查一级、二级和三级基准值的方向与顺序');
  const index = current.value.indicators.findIndex((item) => item.id === values.id);
  if (index < 0) current.value.indicators.push(values); else current.value.indicators[index] = values;
  message.success('候选指标已保存');
}
function removeIndicator(row) {
  dialog.warning({ title: '移除候选指标', content: `从当前研究草稿移除“${row.name}”？已保存版本保留。`, positiveText: '移除', negativeText: '取消', onPositiveClick: () => { current.value.indicators = current.value.indicators.filter((item) => item.id !== row.id); } });
}
function updateSample() {
  if (!rows.value.length) return message.warning('当前筛选范围没有企业');
  if (rows.value.some((row) => row.industry !== current.value.industry)) return message.warning('样本行业与项目行业不一致，请调整筛选条件');
  dialog.warning({ title: '更新研究样本', content: '使用当前筛选范围重新固定样本数据，保留指标草稿与已保存版本。更新后请复核基准值和试评价结果。', positiveText: '更新样本', negativeText: '取消', onPositiveClick: () => { current.value.snapshot = industrySnapshot(rows.value, filters); } });
}
const measurements = computed(() => (working.value?.indicators || []).map((item) => {
  const values = working.value.snapshot.enterprises.map((row) => row[item.field]).filter((value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))).map(Number).sort((a,b) => a-b);
  return { ...item, count: values.length, min: values.length ? values[0] : '—', max: values.length ? values.at(-1) : '—', mean: values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3)) : '—' };
}));
const trialRows = computed(() => (working.value?.snapshot.enterprises || []).flatMap((enterprise) => working.value.indicators.map((item) => ({
  id: enterprise.id + '-' + item.id, enterprise: enterprise.name, name: item.name, unit: item.unit, actual: enterprise[item.field] ?? '—', result: trialLevel(enterprise[item.field], item),
}))));
function saveVersion() {
  if (!current.value.indicators.length) return message.warning('请至少添加一项候选指标');
  const { versions, ...content } = current.value;
  versions.push(copy({ ...content, id: crypto.randomUUID(), number: versions.length + 1, at: workspaceTime() }));
  message.success('已保存独立论证版本，当前草稿可继续完善');
}
</script>

<template>
  <div class="stack indicator-projects">
    <section class="section-card"><div class="section-heading"><h3>研究样本范围</h3><n-button type="primary" @click="newProject">新建指标建设项目</n-button></div><div class="section-body"><IndustryFilters :filters="filters" :options="options" /><p class="section-note">当前范围 {{ rows.length }} 家企业。样本中的示例数据沿用原标识；数据年度和统计口径随项目快照保存。</p></div></section>
    <section class="section-card"><div class="section-heading"><h3>本账号建设项目</h3><span class="muted small">研究草稿自动保存至本机</span></div><div class="section-body"><DataTable :rows="projects" :columns="[{ field: 'title', title: '建设项目', minWidth: 300 }, { field: 'industry', title: '所属行业', width: 150 }, { field: 'at', title: '建立时间', minWidth: 190 }, { field: 'action', title: '操作', width: 130 }]" ><template #action="{ row }"><button class="link-button" @click="selected = row.id; version = 'draft'; step = 'basis'">进入建设</button></template></DataTable></div></section>
    <section v-if="current" class="section-card indicator-project-detail">
      <div class="section-heading"><h3>{{ working.title }}</h3><n-select v-model:value="version" :options="[{ label: '研究草稿', value: 'draft' }, ...current.versions.slice().reverse().map((item) => ({ label: '论证 V' + item.number + ' · ' + item.at, value: item.id }))]" style="width: 300px" aria-label="指标建设版本" /></div>
      <div class="section-body stack">
        <div class="tabs-strip"><button v-for="item in [{ id: 'basis', name: '建设信息与依据' }, { id: 'indicators', name: '指标设计与测算' }, { id: 'trial', name: '企业试评价' }, { id: 'review', name: '论证与成果版本' }]" :key="item.id" :class="{ active: step === item.id }" @click="step = item.id">{{ item.name }}</button></div>
        <p class="section-note">{{ historical ? '已保存论证版本，只读。' : '当前为指标研究草稿。' }} 样本 {{ working.snapshot.enterprises.length }} 家 · 数据快照 {{ working.snapshot.at }}</p>
        <template v-if="step === 'basis'">
          <n-form label-placement="top" class="form-grid"><n-form-item label="建设项目名称" class="wide"><n-input v-model:value="working.title" :disabled="!!historical" /></n-form-item><n-form-item label="适用行业"><n-input :value="working.industry" disabled /></n-form-item><n-form-item label="适用范围与统计边界" class="wide"><n-input v-model:value="working.boundary" :disabled="!!historical" type="textarea" placeholder="填写适用产品、生产过程和统计边界" /></n-form-item><n-form-item label="法规标准与研究依据" class="wide"><n-input v-model:value="working.basis" :disabled="!!historical" type="textarea" placeholder="记录文件名称、版本、条款和来源" /></n-form-item></n-form>
          <n-button v-if="!historical" @click="updateSample">按当前范围更新研究样本</n-button>
        </template>
        <template v-else-if="step === 'indicators'">
          <div v-if="!historical" class="row"><n-button type="primary" @click="editIndicator()">添加候选指标</n-button></div>
          <DataTable :rows="working.indicators" :columns="[{ field: 'name', title: '候选指标', minWidth: 230 }, { field: 'unit', title: '单位', width: 110 }, { field: 'formula', title: '计算与统计口径', minWidth: 270 }, { field: 'first', title: '一级拟定基准', width: 140 }, { field: 'second', title: '二级拟定基准', width: 140 }, { field: 'third', title: '三级拟定基准', width: 140 }, { field: 'action', title: '操作', width: 140, fixed: 'right' }]" ><template #action="{ row }"><template v-if="!historical"><button class="link-button" @click="editIndicator(row)">编辑</button><button class="link-button danger" @click="removeIndicator(row)">移除</button></template><span v-else class="muted">只读</span></template></DataTable>
          <h4>样本测算参考</h4><DataTable :rows="measurements" :columns="[{ field: 'name', title: '指标', minWidth: 240 }, { field: 'count', title: '有效样本数', width: 130 }, { field: 'min', title: '样本最小值', width: 150 }, { field: 'mean', title: '样本平均值', width: 150 }, { field: 'max', title: '样本最大值', width: 150 }, { field: 'unit', title: '单位', width: 120 }]" />
          <p class="muted small">样本统计用于研究参考。拟定基准值需结合行业技术、数据质量和专家论证确定。</p>
        </template>
        <template v-else-if="step === 'trial'">
          <DataTable :rows="trialRows" :columns="[{ field: 'enterprise', title: '样本企业', minWidth: 270 }, { field: 'name', title: '候选指标', minWidth: 210 }, { field: 'actual', title: '样本值', width: 130 }, { field: 'unit', title: '单位', width: 120 }, { field: 'result', title: '单项研究试评价', minWidth: 190 }]" />
          <p class="section-note">按项目快照与拟定基准进行单项测算；未设置完整基准或缺少数据时明确提示。研究试评价不作为企业正式清洁生产等级。</p>
        </template>
        <template v-else>
          <n-form label-placement="top" class="form-grid"><n-form-item label="关联专家问卷" class="wide"><n-select v-model:value="working.surveyId" :options="surveyOptions" :disabled="!!historical" placeholder="选择辖区已有专家问卷；问卷在上方专家问卷页签管理" clearable /></n-form-item><n-form-item label="专家论证意见及处理说明" class="wide"><n-input v-model:value="working.reviewNote" :disabled="!!historical" type="textarea" :autosize="{ minRows: 4 }" placeholder="记录意见来源、内容、采纳情况及未采纳理由" /></n-form-item></n-form>
          <div v-if="!historical" class="row wrap"><n-button type="primary" @click="saveVersion">保存论证版本</n-button><n-button @click="downloadText(current.title + '_研究草稿.json', JSON.stringify(current, null, 2), 'application/json;charset=utf-8')">导出研究草稿</n-button></div>
          <h4>发布文件登记</h4><p class="muted small">完成有权程序后关联正式文件。保存论证版本仅留存研究成果，不自动发布地方标准。</p>
          <n-form label-placement="top" class="form-grid"><n-form-item label="正式文件名称"><n-input v-model:value="working.publication.title" :disabled="!!historical" /></n-form-item><n-form-item label="文件编号"><n-input v-model:value="working.publication.number" :disabled="!!historical" /></n-form-item><n-form-item label="实施日期"><n-input v-model:value="working.publication.effectiveDate" :disabled="!!historical" placeholder="YYYY-MM-DD" /></n-form-item><n-form-item label="文件来源"><n-input v-model:value="working.publication.source" :disabled="!!historical" placeholder="填写发布机关、文件来源或官方链接" /></n-form-item></n-form>
        </template>
      </div>
    </section>
    <RecordEditor v-model:show="editor" title="新建地方指标建设项目" :record="form" :fields="[{ key: 'title', label: '建设项目名称', required: true, wide: true }, { key: 'industry', label: '所属行业', required: true }, { key: 'boundary', label: '适用范围与统计边界', type: 'textarea', required: true, wide: true }, { key: 'basis', label: '法规标准与研究依据', type: 'textarea', wide: true }]" @save="saveProject" />
    <RecordEditor v-model:show="indicatorEditor" title="候选指标与拟定基准" :record="indicator" :fields="[{ key: 'name', label: '指标名称', required: true, wide: true }, { key: 'field', label: '试评价数据字段', options: fieldOptions, required: true }, { key: 'unit', label: '单位', required: true }, { key: 'formula', label: '计算与统计口径', required: true, wide: true }, { key: 'direction', label: '指标方向', options: [{ label: '数值越低越好', value: 'lower' }, { label: '数值越高越好', value: 'higher' }], required: true }, { key: 'first', label: '一级拟定基准', type: 'number' }, { key: 'second', label: '二级拟定基准', type: 'number' }, { key: 'third', label: '三级拟定基准', type: 'number' }, { key: 'source', label: '基准值依据', type: 'textarea', wide: true }]" @save="saveIndicator" />
  </div>
</template>
