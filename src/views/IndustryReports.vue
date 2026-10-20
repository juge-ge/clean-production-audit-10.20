<script setup>
import { computed, ref } from "vue";
import { session } from "../data/store";
import { useIndustry } from "../data/useIndustry";
import { levelRows, problemRows, planRows } from "../data/industry";
import { schemeLibrary } from "../data/deliveryWorkflow";
import { documentHtml, csv } from "../services/industryExport";
import { downloadText } from "../services/files";
import DataTable from "../components/DataTable.vue";
import IndustryFilters from "../components/IndustryFilters.vue";
const { filters, rows, summary, options } = useIndustry(),
  tab = ref("levels"),
  search = ref(""),
  detail = ref(null),
  preview = ref(false);
const levels = computed(() => levelRows(rows.value)),
  problems = computed(() =>
    problemRows(rows.value).filter((r) =>
      (r.name + r.target).includes(search.value),
    ),
  ),
  plans = computed(() =>
    planRows(rows.value).filter((r) =>
      (r.name + r.description).includes(search.value),
    ),
  );
const problemCols = [
  { field: "name", title: "行业共性问题", minWidth: 270 },
  { field: "category", title: "类别", width: 140 },
  { field: "count", title: "涉及企业", width: 110 },
  { field: "target", title: "改进目标", minWidth: 300 },
  { field: "action", title: "详情", width: 110, fixed: "right" },
];
const planCols = [
  { field: "name", title: "行业清洁生产方案", minWidth: 260 },
  { field: "type", title: "类别", width: 125 },
  { field: "count", title: "应用企业", width: 110 },
  { field: "investmentAvg", title: "平均投资（万元）", width: 170 },
  { field: "savingAvg", title: "预计平均年效益（万元）", width: 210 },
  { field: "description", title: "方案内容", minWidth: 330 },
  { field: "action", title: "详情", width: 110, fixed: "right" },
];
const levelCols = [
  { field: "level", title: "评价水平", width: 170 },
  { field: "count", title: "企业数量", width: 130 },
  { field: "ratio", title: "占当前范围（%）", width: 190 },
  { field: "names", title: "涉及企业", minWidth: 500 },
];
const html = computed(() =>
  documentHtml(
    session.user.name + "行业清洁生产审核汇总报告",
    `2026 年度审核；当前筛选范围 ${rows.value.length} 家企业。使用获批年报及演示评价口径，等级表示企业已有评价记录，不自动推导法定达标结论。未填正式标准的内容仅作为示例。`,
    [
      {
        title: "行业达到标准的水平（示例评价）",
        columns: levelCols,
        rows: levels.value,
      },
      {
        title: "企业评价依据",
        columns: [
          { field: "name", title: "企业" },
          { field: "level", title: "当前水平" },
          { field: "standard", title: "评价标准 / 口径" },
        ],
        rows: rows.value,
      },
      {
        title: "行业问题库",
        columns: problemCols.filter((c) => c.field !== "action"),
        rows: problemRows(rows.value),
      },
      {
        title: "行业方案库",
        columns: planCols.filter((c) => c.field !== "action"),
        rows: planRows(rows.value),
      },
    ],
  ),
);
function exportCurrent() {
  const columns =
    tab.value === "levels"
      ? levelCols
      : tab.value === "problems"
        ? problemCols
        : planCols;
  csv(
    "行业" +
      (tab.value === "levels"
        ? "评价水平"
        : tab.value === "problems"
          ? "问题库"
          : "方案库"),
    columns.filter((c) => c.field !== "action"),
    tab.value === "levels"
      ? levels.value
      : tab.value === "problems"
        ? problems.value
        : plans.value,
  );
}
</script>
<template>
  <div class="stack industry-page">
    <div class="between">
      <div>
        <h1 class="page-title">行业清洁生产审核报告</h1>
        <p class="page-description">
          达标水平、共性问题与行业方案 · {{ session.user.name }}
        </p>
      </div>
      <n-button type="primary" @click="preview = true"
        >生成行业汇总报告</n-button
      >
    </div>
    <section class="section-card">
      <div class="section-body">
        <IndustryFilters :filters="filters" :options="options" />
        <p class="section-note">
          按当前辖区和筛选范围汇总。问题来源于企业本轮问题清单，应用方案来源于已批准方案；预算与效益为报备预计值。
        </p>
      </div>
    </section>
    <div class="tabs-strip">
      <button
        v-for="t in [
          { id: 'levels', name: '行业达到标准的水平' },
          { id: 'problems', name: '行业问题库' },
          { id: 'plans', name: '行业方案库' },
        ]"
        :key="t.id"
        :class="{ active: tab === t.id }"
        @click="
          tab = t.id;
          search = '';
        "
      >
        {{ t.name }}
      </button>
    </div>
    <section class="section-card">
      <div class="section-heading">
        <h3>
          {{
            tab === "levels"
              ? "行业水平分布"
              : tab === "problems"
                ? "行业共性问题汇总"
                : "已批准方案与应用情况"
          }}
        </h3>
        <n-button size="small" @click="exportCurrent">导出当前清单</n-button>
      </div>
      <div class="section-body stack">
        <template v-if="tab === 'levels'"
          ><div class="level-distribution">
            <div v-for="l in levels" :key="l.id">
              <span>{{ l.level }}</span>
              <div><i :style="{ width: l.ratio + '%' }" /></div>
              <b>{{ l.count }} 家 / {{ l.ratio }}%</b>
            </div>
          </div>
          <DataTable :rows="levels" :columns="levelCols" /><DataTable
            :rows="rows"
            :columns="[
              { field: 'name', title: '企业名称', minWidth: 260 },
              { field: 'industry', title: '行业', width: 130 },
              { field: 'level', title: '当前评价水平', width: 155 },
              {
                field: 'standard',
                title: '采用标准 / 评价口径',
                minWidth: 420,
              },
            ]"
          />
          <p class="muted small">
            等级来自已有企业评价记录。示例补充等级单独标记，未提供正式适用标准的企业不作正式达标判断。
          </p></template
        ><template v-else
          ><n-input
            v-model:value="search"
            :placeholder="
              tab === 'problems'
                ? '搜索行业问题或改进目标'
                : '搜索方案名称或实施内容'
            "
            clearable
            style="max-width: 380px" /><DataTable
            :key="tab"
            :rows="tab === 'problems' ? problems : plans"
            :columns="tab === 'problems' ? problemCols : planCols"
            ><template #action="{ row }"
              ><button
                class="link-button"
                @click="detail = { ...row, kind: tab }"
              >
                查看明细
              </button></template
            ></DataTable
          ><template v-if="tab === 'plans'"
            ><h4>调研方案库 · 可供推荐的行业示例</h4>
            <DataTable
              :rows="schemeLibrary"
              :columns="[
                { field: 'name', title: '备选措施', minWidth: 250 },
                { field: 'area', title: '适用环节', width: 140 },
                { field: 'prerequisite', title: '现场适用条件', minWidth: 320 },
                { field: 'source', title: '来源', minWidth: 230 },
              ]" /></template
        ></template>
      </div>
    </section>
    <n-modal
      :show="!!detail"
      @update:show="
        (v) => {
          if (!v) detail = null;
        }
      "
      preset="card"
      :title="detail?.name"
      style="width: 1000px; max-width: 94vw"
      ><div v-if="detail" class="stack">
        <p>当前辖区涉及 {{ detail.count }} 家企业</p>
        <DataTable
          :rows="detail.items.map((x, i) => ({ ...x, id: 'detail' + i }))"
          :columns="
            detail.kind === 'problems'
              ? [
                  { field: 'enterprise', title: '企业', minWidth: 250 },
                  { field: 'current', title: '当前情况', minWidth: 260 },
                  { field: 'target', title: '整改目标', minWidth: 240 },
                  { field: 'status', title: '执行情况', width: 120 },
                ]
              : [
                  { field: 'enterprise', title: '企业', minWidth: 250 },
                  { field: 'investment', title: '投资（万元）', width: 140 },
                  { field: 'saving', title: '预计年效益（万元）', width: 185 },
                  { field: 'description', title: '具体措施', minWidth: 320 },
                ]
          "
        /></div
    ></n-modal>
    <n-modal
      v-model:show="preview"
      preset="card"
      title="行业清洁生产审核汇总报告"
      style="width: 1150px; max-width: 95vw"
      ><iframe
        :srcdoc="html"
        sandbox
        title="行业汇总报告预览"
        style="width: 100%; height: 70vh; border: 1px solid #e4e7ed"
      />
      <div class="modal-actions">
        <n-button
          type="primary"
          @click="
            downloadText(
              session.user.name + '行业审核汇总报告.html',
              html,
              'text/html;charset=utf-8',
            )
          "
          >下载行业报告</n-button
        >
      </div></n-modal
    >
  </div>
</template>
