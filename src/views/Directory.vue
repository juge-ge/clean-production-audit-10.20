<script setup>
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { experts } from "../data/experts";
import { session } from "../data/store";
import Icon from "../components/Icon.vue";
import DataTable from "../components/DataTable.vue";
const route = useRoute(),
  query = ref(""),
  specialty = ref(null),
  modal = ref(false),
  selected = ref({});
const section = computed(() => route.params.section);
const titles = computed(() => ({
  experts: "专家库",
  consultants: session.user?.role === "enterprise" ? "第三方咨询库" : "第三方资讯库",
}));
const consultants = [
  {
    id: "co1",
    name: "贵州清源环境技术有限公司",
    title: "清洁生产技术服务",
    organization: "贵阳市观山湖区（示例）",
    specialty: "资源能源",
    experience: "清洁生产审核、节能诊断、企业资料整理",
    city: "贵阳市",
  },
  {
    id: "co2",
    name: "遵义绿行环境咨询有限公司",
    title: "环境咨询服务",
    organization: "遵义市汇川区（示例）",
    specialty: "水污染防治",
    experience: "排污许可、清洁生产审核及环境管理咨询",
    city: "遵义市",
  },
  {
    id: "co3",
    name: "贵州黔科绿色发展研究中心",
    title: "技术评估服务",
    organization: "贵阳市南明区（示例）",
    specialty: "工艺与装备",
    experience: "工艺优化、装备节能与资源综合利用评估",
    city: "贵阳市",
  },
];
const records = computed(() =>
  section.value === "experts" ? experts : consultants,
);
const rows = computed(() =>
  records.value.filter(
    (r) =>
      (r.name + (r.enterprise || "")).includes(query.value) &&
      (!specialty.value ||
        r.specialty === specialty.value ||
        r.status === specialty.value),
  ),
);
const columns = computed(() => [
  {
    field: "name",
    title: section.value === "experts" ? "专家姓名" : "机构名称",
    minWidth: section.value === "experts" ? 130 : 280,
  },
  {
    field: "title",
    title: section.value === "experts" ? "职称" : "服务类型",
    minWidth: 180,
  },
  { field: "specialty", title: "专业方向", minWidth: 150 },
  { field: "city", title: "所在地市", width: 120 },
  { field: "action", title: "操作", width: 110 },
]);
function open(row) {
  selected.value = { ...row };
  modal.value = true;
}
</script>
<template>
  <div class="stack">
    <div>
      <h1 class="page-title">{{ titles[section] }}</h1>
      <p class="page-description">
        按专业方向查询，为企业审核提供专业支持。当前名录为展示样例。
      </p>
    </div>
    <section class="section-card">
      <div class="section-body">
        <div class="toolbar">
          <n-input
            v-model:value="query"
            clearable
            placeholder="搜索姓名或机构名称"
            style="width: 280px"
            ><template #prefix
              ><Icon name="search" :size="16" /></template></n-input
          ><n-select
            v-model:value="specialty"
            :options="
              ['资源能源', '水污染防治', '工艺与装备', '固废与循环利用'].map(
                (s) => ({ label: s, value: s }),
              )
            "
            clearable
            placeholder="全部专业方向"
            style="width: 200px"
          /><n-button
            @click="
              query = '';
              specialty = null;
            "
            >重置</n-button
          >
          <div class="spacer"></div>
          <span class="muted small">共 {{ rows.length }} 条</span>
        </div>
        <DataTable :rows="rows" :columns="columns"
          ><template #status="{ row }"
            ><span
              :class="['status-pill', { warning: row.status !== '已完成' }]"
              >{{ row.status }}</span
            ></template
          ><template #action="{ row }"
            ><button class="link-button" @click="open(row)">
              查看详情
            </button></template
          ></DataTable
        >
        <div class="table-end">全部 {{ rows.length }} 条记录</div>
      </div>
    </section>
    <n-modal
      v-model:show="modal"
      preset="card"
      :title="selected.name"
      style="width: 620px; max-width: 94vw"
      ><div class="stack">
        <n-tag
          type="info"
          size="small"
          :bordered="false"
          style="align-self: flex-start"
          >示例名录</n-tag
        >
        <p>{{ selected.title }} · {{ selected.specialty }}</p>
        <p>
          <span class="muted">所属单位 / 地址：</span
          >{{ selected.organization }}
        </p>
        <p>
          <span class="muted">专业经历 / 服务范围：</span
          >{{ selected.experience }}
        </p>
        <p class="muted">
          联系方式尚未录入。此页面用于前端名录查询与详情展示。
        </p>
      </div></n-modal
    >
  </div>
</template>
