<script setup>
import { inject, ref, computed } from "vue";
import { useDialog } from "naive-ui";
import { total, intensity } from "../data/domain";
import { uid } from "../data/store";
import DataTable from "./DataTable.vue";
import RecordEditor from "./RecordEditor.vue";
const { roundData, readOnly, showEvidence } = inject("audit");
const assessment = computed(() => roundData.value.assessment),
  editing = ref(false),
  criterion = ref(false),
  record = ref({}),
  dialog = useDialog();
const levels = [
  "待评价",
  "国际清洁生产领先水平（企业自评）",
  "国内清洁生产先进水平（企业自评）",
  "国内清洁生产一般水平（企业自评）",
  "未达到三级（企业自评）",
];
const fields = [
  { key: "standard", label: "适用清洁生产标准", required: true, wide: true },
  { key: "version", label: "标准版本或文号", required: true },
  { key: "year", label: "数据统计年度", type: "number", min: 2000, max: 2100 },
  { key: "boundary", label: "评价边界与统计口径", wide: true },
  { key: "level", label: "本轮清洁生产水平", options: levels, wide: true },
  { key: "score", label: "企业自评综合得分", type: "number", max: 100 },
  {
    key: "conclusion",
    label: "评价说明与限定性指标核查结论",
    type: "textarea",
    wide: true,
  },
];
const criterionFields = [
  { key: "name", label: "指标名称 / 核查项目", required: true, wide: true },
  {
    key: "actual",
    label: "企业实际值 / 当前工艺情况",
    type: "textarea",
    required: true,
    wide: true,
  },
  { key: "requirement", label: "标准要求与条款", type: "textarea", wide: true },
  {
    key: "result",
    label: "对标结果",
    options: ["待核对", "一级", "二级", "三级", "不满足", "不适用"],
  },
  { key: "source", label: "依据文件名称" },
  { key: "page", label: "依据页码", type: "number", min: 1 },
];
const metrics = computed(() => {
  const r = roundData.value;
  return [
    {
      id: "prod",
      name: "产品产量",
      value: total(r.survey.products).toLocaleString(),
      unit: "t/a",
    },
    {
      id: "energy",
      name: "单位产品综合能耗",
      value: intensity(total(r.survey.energy), total(r.survey.products)),
      unit: "tce/t",
    },
    {
      id: "water",
      name: "单位产品新鲜水耗",
      value: intensity(total(r.survey.water), total(r.survey.products)),
      unit: "m³/t",
    },
  ];
});
function save(form) {
  if (readOnly.value) return;
  if (criterion.value) {
    const i = assessment.value.criteria.findIndex((x) => x.id === form.id);
    if (i < 0) assessment.value.criteria.push(form);
    else assessment.value.criteria[i] = form;
  } else Object.assign(assessment.value, form);
}
function remove(row) {
  dialog.warning({
    title: "删除对标指标",
    content: `确认删除“${row.name}”？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: () => {
      assessment.value.criteria = assessment.value.criteria.filter(
        (x) => x.id !== row.id,
      );
    },
  });
}
</script>
<template>
  <div class="stack assessment-block">
    <div class="between">
      <h4>本轮清洁生产水平评价</h4>
      <n-button
        v-if="!readOnly"
        size="small"
        @click="
          criterion = false;
          record = { ...assessment };
          editing = true;
        "
        >填写评价信息</n-button
      >
    </div>
    <div class="assessment-meta">
      <div>
        <span>适用标准</span
        ><strong>{{ assessment.standard || "待填写适用标准" }}</strong>
      </div>
      <div>
        <span>版本 / 文号</span
        ><strong>{{ assessment.version || "待填写" }}</strong>
      </div>
      <div>
        <span>统计年度与边界</span
        ><strong>{{ assessment.year }} 年 · {{ assessment.boundary }}</strong>
      </div>
      <div>
        <span>企业自评水平</span
        ><strong class="text-primary">{{ assessment.level }}</strong>
      </div>
      <div>
        <span>企业自评综合得分</span
        ><strong>{{ assessment.score ?? "—" }}</strong>
      </div>
    </div>
    <div class="indicator-grid">
      <div v-for="m in metrics" :key="m.id">
        <span>{{ m.name }}</span
        ><strong
          >{{ m.value }} <small>{{ m.unit }}</small></strong
        >
      </div>
    </div>
    <div class="between">
      <span class="muted small">定量、定性及限定性指标逐项核对</span
      ><n-button
        v-if="!readOnly"
        size="small"
        type="primary"
        secondary
        @click="
          criterion = true;
          record = { id: uid(), result: '待核对', page: 1 };
          editing = true;
        "
        >添加对标指标</n-button
      >
    </div>
    <DataTable
      :rows="assessment.criteria"
      :columns="[
        { field: 'name', title: '指标 / 核查项目', minWidth: 170 },
        { field: 'actual', title: '企业实际值 / 工艺情况', minWidth: 240 },
        { field: 'requirement', title: '标准要求与条款', minWidth: 220 },
        { field: 'result', title: '对标结果', width: 105 },
        { field: 'action', title: '操作', width: 120 },
        { field: 'source', title: '依据', minWidth: 220 },
      ]"
    >
      <template #action="{ row }"
        ><template v-if="!readOnly"
          ><button
            class="link-button"
            @click="
              criterion = true;
              record = { ...row };
              editing = true;
            "
          >
            修改</button
          ><button class="link-button danger" @click="remove(row)">
            删除
          </button></template
        ><span v-else class="muted">已提交 / 归档</span></template
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
    </DataTable>
    <p class="section-note">
      {{
        assessment.conclusion || "评价说明待填写。"
      }}
      当前按企业填报展示自评结果；阈值、权重和限定性指标应以实际适用标准为准，尚未配置自动评级规则。
    </p>
    <RecordEditor
      v-model:show="editing"
      :title="criterion ? '指标对标记录' : '清洁生产评价信息'"
      :record="record"
      :fields="criterion ? criterionFields : fields"
      @save="save"
    />
  </div>
</template>
