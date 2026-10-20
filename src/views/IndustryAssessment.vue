<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { session } from "../data/store";
import { dimensions, assessmentColumns } from "../data/industry";
import { useIndustry } from "../data/useIndustry";
import { csv } from "../services/industryExport";
import DataTable from "../components/DataTable.vue";
import IndustryFilters from "../components/IndustryFilters.vue";
import Icon from "../components/Icon.vue";
const { filters, rows, summary, options } = useIndustry(),
  router = useRouter(),
  tab = ref("pollution");
const columns = computed(() => [
  { field: "name", title: "企业名称", minWidth: 250 },
  { field: "county", title: "所属区县", width: 110 },
  ...assessmentColumns[tab.value].map(([field, title, width]) => ({
    field,
    title,
    width,
  })),
  { field: "action", title: "操作", width: 115, fixed: "right" },
]);
const distribution = computed(() => [...new Set(rows.value.map((row) => row.level))].map((level) => ({
  id: level, level, count: rows.value.filter((row) => row.level === level).length,
})));
const dataYears = computed(() => [...new Set(rows.value.map((row) => row.year))].join('、') || '—');
const metrics = computed(
  () =>
    ({
      pollution: [
        ["COD 排放量", summary.value.cod, "t/a"],
        ["NOx 排放量", summary.value.nox, "t/a"],
        ["纳入企业", summary.value.count, "家"],
      ],
      carbon: [
        ["年度碳排放合计", summary.value.carbon, "tCO₂e/a"],
        ["行业单位产品碳排放", summary.value.carbonIntensity ?? "—", "tCO₂e/t"],
        ["纳入企业", summary.value.count, "家"],
      ],
      scale: [
        ["实际产量合计", summary.value.production, "t/a"],
        ["纳入企业", summary.value.count, "家"],
        ["获批方案", summary.value.schemeCount, "项"],
      ],
      technology: [
        ["获批改进方案", summary.value.schemeCount, "项"],
        ["参与评价企业", summary.value.count, "家"],
        ["持续改进企业", summary.value.continuous, "家"],
      ],
      energy: [
        ["综合能源消耗", summary.value.energy, "tce/a"],
        ["行业单位产品能耗", summary.value.energyIntensity ?? "—", "tce/t"],
        ["新鲜水消耗", summary.value.water, "m³/a"],
      ],
      audit: [
        ["已归档审核报告", summary.value.reported, "份"],
        ["持续清洁生产企业", summary.value.continuous, "家"],
        ["获批实施方案", summary.value.schemeCount, "项"],
      ],
    })[tab.value],
);
</script>
<template>
  <div class="stack industry-page">
    <div class="between">
      <div>
        <h1 class="page-title">行业水平评估</h1>
        <p class="page-description">
          {{ session.user.name }} · 辖区企业当前水平汇总
        </p>
      </div>
      <span class="status-pill">2026 年度审核</span>
    </div>
    <section class="section-card">
      <div class="section-body">
        <IndustryFilters :filters="filters" :options="options" />
        <p class="section-note">
          年度产量、能源和排放使用企业最新获批年报口径（示例为 2025
          年）；碳排放、规模及部分技术评价为演示补充数据。不同污染物分别汇总，单位产品指标按总量
          / 总产量计算。
        </p>
      </div>
    </section>
    <section class="section-card">
      <div class="section-heading"><h3>已有评价水平分布</h3><span class="muted small">纳入 {{ rows.length }} 家 · 数据年度 {{ dataYears }}</span></div>
      <div class="section-body row wrap">
        <n-tag v-for="item in distribution" :key="item.id" type="info" :bordered="false">{{ item.level }} · {{ item.count }} 家</n-tag>
        <span v-if="!distribution.length" class="muted small">当前范围暂无数据</span>
      </div>
    </section>
    <div class="industry-dimensions">
      <button
        v-for="d in dimensions"
        :key="d.id"
        :class="{ active: tab === d.id }"
        @click="tab = d.id"
      >
        <Icon
          :name="
            {
              pollution: 'leaf',
              carbon: 'chart',
              scale: 'building',
              technology: 'settings',
              energy: 'refresh',
              audit: 'clipboard',
            }[d.id]
          "
        /><span>{{ d.name }}</span>
      </button>
    </div>
    <div class="industry-metrics">
      <div v-for="m in metrics" :key="m[0]">
        <span>{{ m[0] }}</span
        ><strong
          >{{ typeof m[1] === "number" ? m[1].toLocaleString() : m[1] }}
          <small>{{ m[2] }}</small></strong
        >
      </div>
    </div>
    <section class="section-card">
      <div class="section-heading">
        <h3>{{ dimensions.find((d) => d.id === tab).name }} · 企业明细</h3>
        <n-button
          size="small"
          @click="
            csv(
              dimensions.find((d) => d.id === tab).name,
              columns.filter((c) => c.field !== 'action'),
              rows,
            )
          "
          >导出当前汇总</n-button
        >
      </div>
      <div class="section-body">
        <DataTable :key="tab" :rows="rows" :columns="columns"
          ><template #report="{ row }"
            ><span class="status-pill">{{
              row.report ? "已归档" : "待生成"
            }}</span></template
          ><template #version="{ row }">V{{ row.version }}</template
          ><template #action="{ row }"
            ><button
              class="link-button"
              @click="
                router.push(
                  '/app/enterprise-archives/' +
                    row.id +
                    '?p=' +
                    (tab === 'audit'
                      ? 'summary'
                      : tab === 'technology'
                        ? 'survey'
                        : 'analysis'),
                )
              "
            >
              查看企业
            </button></template
          ></DataTable
        >
        <p class="muted small" style="margin-top: 16px">
          当前范围 {{ rows.length }} 家企业 · 数据来源及指标含义随栏目列示 ·
          所有评价为前端示例，不作正式达标认定。
        </p>
      </div>
    </section>
  </div>
</template>
