<script setup>
import { inject, ref, computed } from "vue";
import { useMessage, useDialog } from "naive-ui";
import { uid } from "../data/store";
import DataTable from "../components/DataTable.vue";
import RecordEditor from "../components/RecordEditor.vue";
import Icon from "../components/Icon.vue";
const { round, roundData, readOnly } = inject("audit");
const message = useMessage(),
  dialog = useDialog();
const type = ref("无低费方案"),
  query = ref(""),
  status = ref(null),
  editing = ref(false),
  mode = ref("scheme"),
  record = ref({}),
  detail = ref(null);
const rows = computed(() =>
  roundData.value.schemes.filter(
    (s) =>
      s.type === type.value &&
      s.name.includes(query.value) &&
      (!status.value || s.status === status.value),
  ),
);
const sum = (key) =>
  rows.value.reduce((n, r) => n + Number(r[key] || 0), 0).toFixed(2);
const states = ["未开始", "实施中", "已完成", "暂缓"];
const schemeFields = [
  { key: "name", label: "方案名称", required: true, wide: true },
  {
    key: "type",
    label: "方案类别",
    options: ["无低费方案", "中高费方案"],
    required: true,
  },
  { key: "category", label: "改善方向" },
  { key: "department", label: "责任部门", required: true },
  { key: "owner", label: "责任人", required: true },
  { key: "investment", label: "预计投资（万元）", type: "number" },
  { key: "saving", label: "预计年经济效益（万元）", type: "number" },
  { key: "start", label: "计划开始日期" },
  { key: "due", label: "计划完成日期" },
  {
    key: "description",
    label: "方案内容与保障措施",
    type: "textarea",
    wide: true,
  },
  { key: "evidence", label: "评估与经济核算依据", wide: true },
];
const progressFields = [
  { key: "status", label: "实施状态", options: states, required: true },
  {
    key: "progress",
    label: "完成进度（%）",
    type: "number",
    max: 100,
    required: true,
  },
  {
    key: "result",
    label: "实施情况、效果及下一步安排",
    type: "textarea",
    wide: true,
    required: true,
  },
];
function edit(row, kind = "scheme") {
  mode.value = kind;
  record.value = row
    ? { ...row }
    : {
        id: uid(),
        type: type.value,
        investment: 0,
        saving: 0,
        progress: 0,
        status: "未开始",
        logs: [],
      };
  editing.value = true;
}
function save(form) {
  if (readOnly.value) return;
  if (mode.value === "progress") {
    if (form.status === "已完成") form.progress = 100;
    if (form.status === "未开始") form.progress = 0;
    if (form.status !== "已完成" && form.progress === 100)
      form.status = "已完成";
    form.logs = [
      ...(form.logs || []),
      {
        id: uid(),
        at: new Date().toLocaleString("zh-CN"),
        status: form.status,
        progress: form.progress,
        result: form.result,
      },
    ];
  }
  const i = roundData.value.schemes.findIndex((r) => r.id === form.id);
  if (i < 0) roundData.value.schemes.push(form);
  else roundData.value.schemes[i] = form;
  message.success("方案记录已保存");
}
function remove(row) {
  dialog.warning({
    title: "删除方案",
    content: `确认删除“${row.name}”及其实施记录？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: () => {
      roundData.value.schemes = roundData.value.schemes.filter(
        (s) => s.id !== row.id,
      );
    },
  });
}
</script>
<template>
  <section class="section-card">
    <div class="section-heading">
      <h3><Icon name="clipboard" /> 第 {{ round }} 轮 · 方案研制与保障实施</h3>
      <span class="muted small">切换上方审核轮次可查询历次方案</span>
    </div>
    <div class="section-body">
      <div class="tabs-strip">
        <button
          v-for="t in ['无低费方案', '中高费方案']"
          :key="t"
          :class="{ active: type === t }"
          @click="type = t"
        >
          {{ t }}
          <span class="muted">{{
            roundData.schemes.filter((s) => s.type === t).length
          }}</span>
        </button>
      </div>
      <div class="toolbar">
        <n-input
          v-model:value="query"
          placeholder="搜索方案名称"
          clearable
          style="width: 240px"
        /><n-select
          v-model:value="status"
          :options="states.map((s) => ({ label: s, value: s }))"
          clearable
          placeholder="全部实施状态"
          style="width: 160px"
        /><n-button
          @click="
            query = '';
            status = null;
          "
          >重置</n-button
        >
        <div class="spacer" />
        <n-button v-if="!readOnly" type="primary" @click="edit()"
          ><Icon name="plus" :size="15" />&nbsp; 新增方案</n-button
        >
      </div>
      <div class="ledger-summary">
        <span>当前 {{ rows.length }} 项</span
        ><span
          >已完成
          <b>{{ rows.filter((s) => s.status === "已完成").length }}</b> 项</span
        ><span
          >预计投资 <b>{{ sum("investment") }}</b> 万元</span
        ><span
          >预计年经济效益 <b>{{ sum("saving") }}</b> 万元</span
        >
      </div>
      <DataTable
        :rows="rows"
        :columns="[
          { field: 'name', title: '方案名称', minWidth: 220 },
          { field: 'department', title: '责任部门', width: 115 },
          { field: 'owner', title: '责任人', width: 95 },
          { field: 'investment', title: '投资（万元）', width: 120 },
          { field: 'saving', title: '年效益（万元）', width: 130 },
          { field: 'due', title: '计划完成日期', width: 135 },
          { field: 'progress', title: '实施进度', width: 155 },
          { field: 'status', title: '状态', width: 110 },
          { field: 'result', title: '当前实施情况', minWidth: 270 },
          {
            field: 'action',
            title: '操作',
            width: readOnly ? 100 : 225,
            fixed: 'right',
          },
        ]"
      >
        <template #name="{ row }"
          ><button class="link-button" @click="detail = row">
            {{ row.name }}
          </button></template
        >
        <template #progress="{ row }"
          ><n-progress
            type="line"
            :percentage="row.progress"
            :status="row.status === '已完成' ? 'success' : 'default'"
        /></template>
        <template #status="{ row }"
          ><span
            :class="[
              'status-pill',
              {
                warning: row.status === '实施中',
                neutral: row.status === '未开始' || row.status === '暂缓',
              },
            ]"
            >{{ row.status }}</span
          ></template
        >
        <template #action="{ row }"
          ><button class="link-button" @click="detail = row">记录</button
          ><template v-if="!readOnly"
            ><button class="link-button" @click="edit(row)">修改</button
            ><button class="link-button" @click="edit(row, 'progress')">
              更新进度</button
            ><button class="link-button danger" @click="remove(row)">
              删除
            </button></template
          ></template
        >
      </DataTable>
      <p class="muted small" style="margin-top: 14px">
        经济核算数值由企业填写，示例金额用于展示台账。评估报告与核算资料可在“企业相关资料报告”归集。
      </p>
    </div>
    <RecordEditor
      v-model:show="editing"
      :title="mode === 'progress' ? '更新方案实施情况' : '清洁生产方案'"
      :record="record"
      :fields="mode === 'progress' ? progressFields : schemeFields"
      @save="save"
    />
    <n-modal
      :show="!!detail"
      @update:show="
        (v) => {
          if (!v) detail = null;
        }
      "
      preset="card"
      title="方案内容与实施记录"
      style="width: 950px; max-width: 94vw"
    >
      <div v-if="detail" class="stack">
        <h3>{{ detail.name }}</h3>
        <div class="section-note">
          {{ detail.description || "暂无方案说明" }}<br />核算依据：{{
            detail.evidence || "待补充"
          }}
        </div>
        <p>当前实施情况：{{ detail.result || "尚未开始" }}</p>
        <DataTable
          :rows="detail.logs || []"
          :columns="[
            { field: 'at', title: '记录时间', width: 185 },
            { field: 'status', title: '状态', width: 100 },
            { field: 'progress', title: '进度（%）', width: 110 },
            { field: 'result', title: '实施记录', minWidth: 320 },
          ]"
        />
        <p v-if="!detail.logs?.length" class="muted small">
          暂无进度变更记录，更新实施情况后自动留存。
        </p>
      </div>
    </n-modal>
  </section>
</template>
