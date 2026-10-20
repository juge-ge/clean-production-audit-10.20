<script setup>
import { inject, ref, computed } from "vue";
import { useMessage, useDialog } from "naive-ui";
import { uid, session } from "../data/store";
import { sampleReport, getFile, downloadBlob } from "../services/files";
import DataTable from "../components/DataTable.vue";
import RecordEditor from "../components/RecordEditor.vue";
import Icon from "../components/Icon.vue";
import DeliverySteps from "../components/DeliverySteps.vue";
import AcceptancePanel from "../components/AcceptancePanel.vue";
import ContinuousProduction from "../components/ContinuousProduction.vue";
import {
  renderAuditReport,
  downloadAuditReport,
} from "../services/auditReport";
const { data, round, roundData, readOnly, showEvidence, isWorkbench = false, archiveOnly = false } = inject("audit");
const message = useMessage(),
  dialog = useDialog(),
  editing = ref(false),
  reportEditing = ref(false),
  record = ref({}),
  reportFilter = ref(null),
  preview = ref(null);
const reports = computed(() =>
  data.value.reports
    .filter(
      (r) =>
        r.round <= round.value &&
        (!reportFilter.value || r.round === reportFilter.value),
    )
    .sort((a, b) => b.round - a.round),
);
const fields = [
  { key: "name", label: "持续清洁生产事项", required: true, wide: true },
  { key: "target", label: "持续目标", required: true, wide: true },
  { key: "measures", label: "管理与改进措施", type: "textarea", wide: true },
  { key: "department", label: "责任部门" },
  { key: "owner", label: "责任人", required: true },
  { key: "due", label: "计划完成日期" },
  {
    key: "status",
    label: "执行情况",
    options: ["计划中", "持续执行", "已完成", "需改进"],
    required: true,
  },
  { key: "effect", label: "实际执行情况及成效", type: "textarea", wide: true },
  { key: "source", label: "依据文件名称" },
  { key: "page", label: "页码", type: "number", min: 1 },
];
function save(form) {
  if (readOnly.value) return;
  const i = roundData.value.continuity.findIndex((x) => x.id === form.id);
  if (i < 0) roundData.value.continuity.push(form);
  else roundData.value.continuity[i] = form;
  message.success("持续清洁生产记录已保存");
}
function edit(row) {
  record.value = row ? { ...row } : { id: uid(), status: "计划中", page: 1 };
  editing.value = true;
}
function remove(row) {
  dialog.warning({
    title: "删除持续清洁生产记录",
    content: `确认删除“${row.name}”？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: () => {
      roundData.value.continuity = roundData.value.continuity.filter(
        (x) => x.id !== row.id,
      );
    },
  });
}
function saveReport(form) {
  Object.assign(
    data.value.reports.find((r) => r.id === form.id),
    form,
  );
  message.success("报告关联已保存");
}
function viewReport(row) {
  if (row.fileId) showEvidence(row.fileId, 1);
  else preview.value = row;
}
async function download(row) {
  if (row.generatedId && data.value.delivery.report)
    return downloadAuditReport(data.value.delivery.report);
  if (!row.fileId) return sampleReport(data.value.info, row.round);
  try {
    const file = await getFile(row.fileId);
    if (!file) return message.warning("原文件未找到，请重新关联");
    downloadBlob(
      data.value.documents.find((d) => d.id === row.fileId)?.name || row.name,
      file,
    );
  } catch {
    message.error("文件读取失败");
  }
}
</script>
<template>
  <div class="stack">
    <ContinuousProduction
      v-if="round === 3 && data.delivery.status === 'reported'"
      :data="data"
    />
    <template v-if="round === 3"
      ><DeliverySteps :data="data" /><AcceptancePanel
        v-if="
          session.user.role === 'enterprise' ||
          data.delivery.acceptanceVersions.length
        "
        :data="data"
        :draft-only="isWorkbench"
        :read-only="archiveOnly"
    /></template>
    <section class="section-card">
      <div class="section-heading">
        <h3><Icon name="folder" /> 清洁生产审核报告档案</h3>
        <span class="muted small">本轮及历次报告</span>
      </div>
      <div class="section-body">
        <div class="toolbar">
          <span class="field-label">审核轮次</span
          ><n-select
            v-model:value="reportFilter"
            :options="
              [1, 2, 3]
                .filter((n) => n <= round)
                .map((n) => ({ label: '第 ' + n + ' 轮', value: n }))
            "
            clearable
            placeholder="全部轮次"
            style="width: 180px"
          /><span class="muted small"
            >实际报告请先在“企业相关资料报告”上传，再关联原件。</span
          >
        </div>
        <DataTable
          :rows="reports"
          :columns="[
            { field: 'name', title: '报告名称', minWidth: 250 },
            { field: 'round', title: '轮次', width: 90 },
            { field: 'year', title: '审核年度', width: 100 },
            { field: 'status', title: '报告状态', width: 120 },
            { field: 'file', title: '关联原件', minWidth: 220 },
            { field: 'date', title: '报告日期', width: 130 },
            { field: 'action', title: '操作', width: 220 },
          ]"
        >
          <template #file="{ row }">{{
            data.documents.find((d) => d.id === row.fileId)?.name ||
            (row.generatedId
              ? "本轮获批与验收记录汇编"
              : "演示样例 · 未关联原件")
          }}</template>
          <template #action="{ row }"
            ><button class="link-button" @click="viewReport(row)">查看</button
            ><button class="link-button" @click="download(row)">
              {{
                row.fileId || row.generatedId ? "下载报告" : "下载示例"
              }}</button
            ><button
              v-if="!readOnly && !row.generatedId"
              class="link-button"
              @click="
                record = { ...row };
                reportEditing = true;
              "
            >
              关联报告
            </button></template
          ></DataTable
        >
      </div>
    </section>
    <section class="section-card">
      <div class="section-heading">
        <h3><Icon name="refresh" /> 第 {{ round }} 轮 · 持续清洁生产情况</h3>
        <n-button
          v-if="!readOnly"
          type="primary"
          secondary
          size="small"
          @click="edit()"
          ><Icon name="plus" :size="14" />&nbsp; 新增持续改进事项</n-button
        >
      </div>
      <div class="section-body">
        <div class="ledger-summary">
          <span
            >持续改进事项 <b>{{ roundData.continuity.length }}</b> 项</span
          ><span
            >持续执行
            <b>{{
              roundData.continuity.filter((r) => r.status === "持续执行").length
            }}</b>
            项</span
          ><span
            >已完成
            <b>{{
              roundData.continuity.filter((r) => r.status === "已完成").length
            }}</b>
            项</span
          >
        </div>
        <DataTable
          :rows="roundData.continuity"
          :columns="[
            { field: 'name', title: '事项', minWidth: 220 },
            { field: 'target', title: '持续目标', minWidth: 220 },
            { field: 'measures', title: '管理与改进措施', minWidth: 260 },
            { field: 'owner', title: '责任人', width: 100 },
            { field: 'due', title: '计划完成日期', width: 135 },
            { field: 'status', title: '执行情况', width: 125 },
            { field: 'effect', title: '实际执行情况与成效', minWidth: 280 },
            { field: 'action', title: '操作', width: 120 },
            { field: 'source', title: '依据', minWidth: 190 },
          ]"
        >
          <template #status="{ row }"
            ><span
              :class="[
                'status-pill',
                {
                  warning: row.status === '持续执行' || row.status === '需改进',
                  neutral: row.status === '计划中',
                },
              ]"
              >{{ row.status }}</span
            ></template
          >
          <template #source="{ row }"
            ><button
              v-if="row.source"
              class="link-button"
              @click="showEvidence(row.source, row.page)"
            >
              {{ row.source }} · 第 {{ row.page }} 页</button
            ><span v-else class="muted">待补充</span></template
          >
          <template #action="{ row }"
            ><template v-if="!readOnly"
              ><button class="link-button" @click="edit(row)">修改</button
              ><button class="link-button danger" @click="remove(row)">
                删除
              </button></template
            ><span v-else class="muted">归档</span></template
          ></DataTable
        >
      </div>
    </section>
    <RecordEditor
      v-model:show="editing"
      title="持续清洁生产记录"
      :record="record"
      :fields="fields"
      @save="save"
    />
    <RecordEditor
      v-model:show="reportEditing"
      title="关联审核报告"
      :record="record"
      :fields="[
        { key: 'name', label: '报告名称', required: true, wide: true },
        {
          key: 'fileId',
          label: '已上传原件',
          options: data.documents.map((d) => ({ label: d.name, value: d.id })),
          required: true,
          wide: true,
        },
        {
          key: 'status',
          label: '报告状态',
          options: ['编制中', '审核中', '已归档', '历史归档'],
        },
        { key: 'date', label: '报告日期' },
      ]"
      @save="saveReport"
    />
    <n-modal
      :show="!!preview"
      @update:show="
        (v) => {
          if (!v) preview = null;
        }
      "
      preset="card"
      title="审核报告预览"
      style="width: 700px; max-width: 94vw"
      ><iframe
        v-if="preview?.generatedId && data.delivery.report"
        :srcdoc="renderAuditReport(data.delivery.report)"
        sandbox
        title="归档审核报告预览"
        style="width: 100%; height: 70vh; border: 1px solid #e4e7ed"
      />
      <div v-else-if="preview" class="stack">
        <h3>{{ data.info.name }} · {{ preview.name }}</h3>
        <n-alert type="info" :show-icon="false"
          >此处为报告结构示例，尚未关联企业正式原件。</n-alert
        >
        <p>一、企业基本情况与审核范围</p>
        <p>二、筹划与组织</p>
        <p>三、现状调研与对标</p>
        <p>四、问题分析与审核目标</p>
        <p>五、方案研制、实施与效益评估</p>
        <p>六、持续清洁生产计划与执行情况</p>
        <div class="modal-actions">
          <n-button @click="download(preview)">下载示例报告</n-button>
        </div>
      </div></n-modal
    >
  </div>
</template>
