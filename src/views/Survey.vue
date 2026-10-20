<script setup>
import { inject, ref, computed } from "vue";
import { useMessage, useDialog } from "naive-ui";
import { surveyTemplates, total, intensity } from "../data/domain";
import { uid } from "../data/store";
import { downloadText } from "../services/files";
import DataTable from "../components/DataTable.vue";
import Icon from "../components/Icon.vue";
import RecordEditor from "../components/RecordEditor.vue";
import ProcessEditor from "../components/ProcessEditor.vue";
const { data, roundData, readOnly, showEvidence } = inject("audit"),
  message = useMessage(),
  dialog = useDialog();
const tab = ref("products"),
  editing = ref(false),
  record = ref({});
const template = computed(
  () => surveyTemplates[tab.value] || surveyTemplates.products,
);
const rows = computed(() => roundData.value.survey[tab.value] || []);
const columns = computed(() => [
  {
    field: "name",
    title:
      tab.value === "products"
        ? "产品名称"
        : tab.value === "materials"
          ? "原辅材料名称"
          : "项目名称",
    minWidth: 180,
    edit: true,
  },
  { field: "spec", title: "规格 / 统计口径", minWidth: 180, edit: true },
  ...(tab.value === "products"
    ? [
        {
          field: "capacity",
          title: "设计产能（t/a）",
          width: 155,
          edit: true,
          type: "number",
        },
      ]
    : []),
  {
    field: "amount",
    title: template.value.quantity + "（" + template.value.unit + "）",
    width: 180,
    edit: true,
    type: "number",
  },
  { field: "action", title: "操作", width: 115 },
  { field: "source", title: "依据 · 来源文档及页码", minWidth: 230 },
]);
const footer = computed(() => [
  template.value.total,
  "",
  ...(tab.value === "products" ? ["—"] : []),
  tab.value === "emissions"
    ? "分别统计"
    : total(rows.value).toLocaleString("zh-CN", { maximumFractionDigits: 3 }),
  "固定计算项",
  "按上方明细汇总",
]);
const formFields = computed(() => [
  { key: "name", label: "项目名称", required: true },
  { key: "spec", label: "规格 / 统计口径" },
  ...(tab.value === "products"
    ? [{ key: "capacity", label: "设计产能（t/a）", type: "number" }]
    : []),
  {
    key: "amount",
    label: template.value.quantity + "（" + template.value.unit + "）",
    type: "number",
    required: true,
  },
  { key: "source", label: "来源文档名称", wide: true },
  { key: "page", label: "来源页码", type: "number" },
]);
function edit(row) {
  record.value = row
    ? { ...row }
    : { id: uid(), amount: 0, capacity: 0, page: 1 };
  editing.value = true;
}
function save(form) {
  const index = rows.value.findIndex((r) => r.id === form.id);
  if (index < 0) rows.value.push(form);
  else rows.value[index] = form;
  message.success("明细已保存，底部指标已重新计算");
}
function remove(row) {
  dialog.warning({
    title: "删除明细",
    content: `确认删除“${row.name}”？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: () => {
      roundData.value.survey[tab.value] = rows.value.filter(
        (r) => r.id !== row.id,
      );
    },
  });
}
function exportData() {
  const fields = [
    "name",
    "spec",
    ...(tab.value === "products" ? ["capacity"] : []),
    "amount",
    "source",
    "page",
  ];
  const escape = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  downloadText(
    template.value.name + ".csv",
    "\ufeff" +
      [
        [
          "名称",
          "规格口径",
          ...(tab.value === "products" ? ["设计产能"] : []),
          template.value.quantity + "(" + template.value.unit + ")",
          "来源文档",
          "页码",
        ],
        ...rows.value.map((r) => fields.map((f) => r[f])),
      ]
        .map((r) => r.map(escape).join(","))
        .join("\r\n"),
    "text/csv;charset=utf-8",
  );
}
function validate() {
  for (const r of rows.value) {
    if (!Number.isFinite(Number(r.amount)) || r.amount < 0) {
      r.amount = 0;
      message.warning("数值需为非负数，已归零，请重新核实");
    }
    if (r.capacity < 0) r.capacity = 0;
  }
}
</script>
<template>
  <section class="section-card">
    <div class="section-heading">
      <h3><Icon name="chart" /> 现状调研与对标</h3>
      <span class="muted small">{{
        readOnly ? "归档数据" : "双击单元格修改 · 底部加粗指标自动计算"
      }}</span>
    </div>
    <div class="section-body">
      <div class="section-note">
        当前为行业表格结构样例。适用标准与评价阈值待确认；计算结果用于展示填报过程，不构成正式清洁生产评级。
      </div>
      <div class="tabs-strip">
        <button
          v-for="(t, key) in surveyTemplates"
          :key="key"
          :class="{ active: tab === key }"
          @click="tab = key"
        >
          {{ t.name }}</button
        ><button
          :class="{ active: tab === 'process' }"
          @click="tab = 'process'"
        >
          <Icon name="network" :size="15" /> 生产工艺
        </button>
      </div>
      <ProcessEditor v-if="tab === 'process'" /><template v-else
        ><div class="toolbar">
          <strong>{{ template.name }}</strong
          ><n-tag size="small" :bordered="false"
            >{{ rows.length }} 条明细</n-tag
          >
          <div class="spacer"></div>
          <n-button size="small" @click="exportData"
            ><Icon name="download" :size="14" />&nbsp; 导出表格</n-button
          ><n-button
            v-if="!readOnly"
            size="small"
            type="primary"
            secondary
            @click="edit()"
            ><Icon name="plus" :size="14" />&nbsp; 添加明细</n-button
          >
        </div>
        <DataTable
          :key="tab"
          :rows="rows"
          :columns="columns"
          :editable="!readOnly"
          :footer="footer"
          @change="validate"
          ><template #action="{ row }"
            ><template v-if="!readOnly"
              ><button class="link-button" @click="edit(row)">修改</button
              ><button class="link-button danger" @click="remove(row)">
                删除
              </button></template
            ><span v-else class="muted">归档</span></template
          ><template #source="{ row }"
            ><button
              class="link-button cell-source"
              @click="showEvidence(row.source, row.page)"
            >
              {{ row.source || "待补充依据" }}<br />第 {{ row.page || "—" }} 页
              <Icon name="external" :size="11" /></button></template
        ></DataTable>
        <div class="calculated-indicators">
          <h4>审核指标计算</h4>
          <div class="indicator-grid">
            <div>
              <span>产品产量</span
              ><strong
                >{{ total(roundData.survey.products).toLocaleString() }}
                <small>t/a</small></strong
              >
              <p>产品产量明细合计</p>
            </div>
            <div>
              <span>单位产品综合能耗</span
              ><strong
                >{{
                  intensity(
                    total(roundData.survey.energy),
                    total(roundData.survey.products),
                  )
                }}
                <small>tce/t</small></strong
              >
              <p>综合能耗 ÷ 产品产量</p>
            </div>
            <div>
              <span>单位产品新鲜水耗</span
              ><strong
                >{{
                  intensity(
                    total(roundData.survey.water),
                    total(roundData.survey.products),
                  )
                }}
                <small>m³/t</small></strong
              >
              <p>新鲜水量 ÷ 产品产量</p>
            </div>
          </div>
          <p class="muted small" style="margin-top: 14px">
            以上计算项固定保留。产量为零时显示“—”；能源表填报折标后的数值，具体折标系数与生产边界待标准确认。
          </p>
        </div>
        <RecordEditor
          v-model:show="editing"
          :title="template.name + ' · 明细与依据'"
          :fields="formFields"
          :record="record"
          @save="save"
      /></template>
    </div>
  </section>
</template>
<style scoped>
.calculated-indicators {
  margin-top: 24px;
  border-top: 1px solid #ebeef5;
  padding-top: 20px;
}
.calculated-indicators h4 {
  font-size: 14px;
  margin-bottom: 16px;
}
.indicator-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.indicator-grid > div {
  background: #f7f9fc;
  border: 1px solid #e8edf4;
  padding: 17px 20px;
}
.indicator-grid span {
  font-size: 12px;
  color: #606266;
}
.indicator-grid strong {
  display: block;
  font-size: 23px;
  margin-top: 8px;
  font-variant-numeric: tabular-nums;
}
.indicator-grid strong small {
  font-size: 12px;
  font-weight: 400;
  color: #909399;
}
.indicator-grid p {
  font-size: 11px;
  color: #909399;
  margin-top: 8px;
}
@media (max-width: 700px) {
  .indicator-grid {
    grid-template-columns: 1fr;
  }
}
</style>
