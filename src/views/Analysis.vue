<script setup>
import { inject, ref, computed } from "vue";
import { useDialog } from "naive-ui";
import { total, intensity } from "../data/domain";
import { uid } from "../data/store";
import Icon from "../components/Icon.vue";
import DataTable from "../components/DataTable.vue";
import RecordEditor from "../components/RecordEditor.vue";
import ProcessEditor from "../components/ProcessEditor.vue";
import Assessment from "../components/Assessment.vue";
const { data, round, roundData, readOnly, isOa = false } = inject("audit");
const tab = ref("analysis"),
  editing = ref(false),
  record = ref({}),
  dialog = useDialog();
const fields = [
  { key: "name", label: "问题描述", required: true, wide: true },
  { key: "basis", label: "问题依据 / 标准条款", wide: true },
  { key: "current", label: "当前情况" },
  { key: "target", label: "本轮目标", required: true },
  { key: "owner", label: "责任人" },
  { key: "date", label: "计划完成日期" },
  { key: "status", label: "状态", options: ["待整改", "进行中", "已完成"] },
];
const comparisons = computed(() =>
  [1, 2, 3]
    .filter((n) => data.value.rounds[n])
    .map((n) => {
      const d = data.value.rounds[n];
      return {
        id: n,
        round: "第 " + n + " 轮",
        year: n === 3 ? 2026 : n === 2 ? 2023 : 2020,
        production: total(d.survey.products).toLocaleString(),
        energy: intensity(total(d.survey.energy), total(d.survey.products)),
        water: intensity(total(d.survey.water), total(d.survey.products)),
        level:
          n === 3
            ? d.assessment.level
            : n === 2
              ? "Ⅱ 级（演示）"
              : "Ⅲ 级（演示）",
        status:
          n === 3 ? d.assessment.standard || "适用标准待确认" : "历史归档样例",
      };
    }),
);
function save(form) {
  const i = roundData.value.problems.findIndex((r) => r.id === form.id);
  if (i < 0) roundData.value.problems.push(form);
  else roundData.value.problems[i] = form;
}
function remove(row) {
  dialog.warning({
    title: "删除问题",
    content: `确认删除“${row.name}”？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: () =>
      (roundData.value.problems = roundData.value.problems.filter(
        (p) => p.id !== row.id,
      )),
  });
}
</script>
<template>
  <section class="section-card">
    <div class="section-heading">
      <h3><Icon name="clipboard" /> 第 {{ round }} 轮 · 问题分析与目标设置</h3>
      <span class="muted small">{{
        isOa ? "本轮填报与评价依据" : "本轮与历次审核对照"
      }}</span>
    </div>
    <div class="section-body">
      <div class="tabs-strip">
        <button
          :class="{ active: tab === 'analysis' }"
          @click="tab = 'analysis'"
        >
          清洁生产水平与问题清单</button
        ><button
          :class="{ active: tab === 'process' }"
          @click="tab = 'process'"
        >
          <Icon name="network" :size="15" /> 生产工艺与定性核查
        </button>
      </div>
      <ProcessEditor v-if="tab === 'process'" />
      <div v-else class="stack">
        <div v-if="!isOa">
          <h4 style="margin-bottom: 15px">各轮清洁生产水平</h4>
          <DataTable
            :rows="comparisons"
            :columns="[
              { field: 'round', title: '审核轮次', width: 110 },
              { field: 'year', title: '年度', width: 85 },
              { field: 'production', title: '产品产量（t/a）', width: 155 },
              { field: 'energy', title: '综合能耗（tce/t）', width: 165 },
              { field: 'water', title: '新鲜水耗（m³/t）', width: 165 },
              { field: 'level', title: '清洁生产水平', width: 150 },
              { field: 'status', title: '评价状态', minWidth: 160 },
            ]"
            ><template #level="{ row }"
              ><span
                :class="[
                  'status-pill',
                  { warning: row.id === 3, neutral: row.id === 1 },
                ]"
                >{{ row.level }}</span
              ></template
            ></DataTable
          >
        </div>
        <div v-if="!isOa" class="section-note">
          历史级别仅为界面演示标签；本轮不预设等级。正式评价需匹配行业标准、限定性指标、权重以及定性工艺要求。
        </div>
        <Assessment />
        <div>
          <div class="between" style="margin: 8px 0 16px">
            <h4>本轮问题清单与审核目标</h4>
            <n-button
              v-if="!readOnly"
              size="small"
              type="primary"
              secondary
              @click="
                record = { id: uid(), status: '待整改' };
                editing = true;
              "
              ><Icon name="plus" :size="14" />&nbsp; 新增问题</n-button
            >
          </div>
          <DataTable
            :rows="roundData.problems"
            :columns="[
              { field: 'name', title: '问题描述', minWidth: 210 },
              { field: 'current', title: '当前情况', minWidth: 160 },
              { field: 'target', title: '本轮目标', minWidth: 160 },
              { field: 'owner', title: '责任人', width: 100 },
              { field: 'date', title: '计划完成日期', width: 140 },
              { field: 'status', title: '状态', width: 110 },
              { field: 'action', title: '操作', width: 120 },
              { field: 'basis', title: '依据', minWidth: 220 },
            ]"
            ><template #status="{ row }"
              ><span
                :class="['status-pill', { warning: row.status !== '已完成' }]"
                >{{ row.status }}</span
              ></template
            ><template #action="{ row }"
              ><template v-if="!readOnly"
                ><button
                  class="link-button"
                  @click="
                    record = { ...row };
                    editing = true;
                  "
                >
                  修改</button
                ><button class="link-button danger" @click="remove(row)">
                  删除
                </button></template
              ><span v-else class="muted">归档</span></template
            ></DataTable
          >
        </div>
      </div>
      <RecordEditor
        v-model:show="editing"
        title="审核问题与目标"
        :record="record"
        :fields="fields"
        @save="save"
      />
    </div>
  </section>
</template>
