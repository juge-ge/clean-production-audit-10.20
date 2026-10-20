<script setup>
import { inject, computed, ref } from "vue";
import { useMessage } from "naive-ui";
import { infoFields, roundOptions } from "../data/domain";
import { sampleReport, getFile, downloadBlob } from "../services/files";
import Icon from "../components/Icon.vue";
import DataTable from "../components/DataTable.vue";
import RecordEditor from "../components/RecordEditor.vue";
const { data, round, roundData, readOnly, isOa = false, isWorkbench = false } = inject("audit");
const message = useMessage(),
  edit = ref(false),
  historyRound = ref(round.value === 3 ? 2 : round.value),
  status = ref(null),
  search = ref("");
const info = computed(() =>
  round.value === 3 ? data.value.info : roundData.value.info,
);
const historyReport = computed(() => data.value.reports?.find(r => r.round === historyRound.value));
async function downloadHistory() {
  const report = historyReport.value;
  if (!report?.fileId) return sampleReport(info.value, historyRound.value);
  try {
    const file = await getFile(report.fileId);
    if (!file) return message.warning('原文件未找到，请重新关联报告');
    downloadBlob(data.value.documents.find(d => d.id === report.fileId)?.name || report.name, file);
  } catch { message.error('报告读取失败'); }
}
const infoRows = computed(() => [
  { id: "name", label: "企业名称", value: info.value.name },
  {
    id: "creditCode",
    label: "统一社会信用代码",
    value: info.value.creditCode,
    label2: "法人代表",
    value2: info.value.legalPerson,
  },
  {
    id: "city",
    label: "所属地市",
    value: info.value.city,
    label2: "所属区县",
    value2: info.value.county,
  },
  {
    id: "nature",
    label: "企业性质",
    value: info.value.nature,
    label2: "所属行业",
    value2: info.value.industry,
  },
  { id: "products", label: "主要产品", value: info.value.products },
  { id: "address", label: "通讯地址", value: info.value.address },
  {
    id: "contact",
    label: "企业联系人",
    value: info.value.contact,
    label2: "联系方式",
    value2: info.value.phone,
  },
]);
const merges = [0, 4, 5].map((row) => ({
  row,
  col: 1,
  rowspan: 1,
  colspan: 3,
}));
const rows = computed(() =>
  data.value.rectifications.filter(
    (r) =>
      r.round === historyRound.value &&
      (!status.value || r.status === status.value) &&
      r.name.includes(search.value),
  ),
);
function save(form) {
  Object.assign(data.value.info, form);
  Object.assign(data.value.rounds[3].info, form);
  message.success("企业信息已保存至本机");
}
</script>
<template>
  <div class="stack">
    <section class="section-card">
      <div class="section-heading">
        <h3><Icon name="file" /> 企业信息</h3>
        <n-button v-if="!readOnly" size="small" @click="edit = true"
          >编辑企业信息</n-button
        ><span v-else class="muted">第 {{ round }} 轮审核信息快照</span>
      </div>
      <div class="section-body">
        <vxe-table
          :data="infoRows"
          border
          show-overflow
          auto-resize
          :show-header="false"
          :row-config="{ height: 46 }"
          :merge-cells="merges"
          class="enterprise-info-table"
          ><vxe-column
            field="label"
            width="180"
            class-name="info-label" /><vxe-column field="value" min-width="250"
            ><template #default="{ row }"
              ><span :class="{ name: row.id === 'name' }">{{
                row.value
              }}</span></template
            ></vxe-column
          ><vxe-column
            field="label2"
            width="150"
            class-name="info-label" /><vxe-column
            field="value2"
            min-width="170"
        /></vxe-table>
      </div>
    </section>
    <section v-if="!isOa && !isWorkbench" class="section-card">
      <div class="section-heading">
        <h3><Icon name="clock" /> 历次清洁生产审核与持续改进</h3>
        <n-button size="small" @click="downloadHistory"
          ><Icon name="download" :size="14" />&nbsp; {{ historyReport?.fileId ? '下载报告' : '下载报告（示例）' }}</n-button
        >
      </div>
      <div class="section-body">
        <div class="toolbar">
          <span class="field-label">审核轮次</span
          ><n-select
            v-model:value="historyRound"
            :options="roundOptions.filter((r) => r.value < 3)"
            style="width: 200px"
          /><span class="field-label">整改状态</span
          ><n-select
            v-model:value="status"
            clearable
            :options="
              ['已完成', '进行中', '未开始'].map((s) => ({
                label: s,
                value: s,
              }))
            "
            placeholder="全部状态"
            style="width: 140px"
          /><n-input
            v-model:value="search"
            clearable
            placeholder="搜索整改方案"
            style="width: 200px"
            ><template #prefix
              ><Icon name="search" :size="15" /></template></n-input
          ><n-button
            @click="
              status = null;
              search = '';
            "
            >重置</n-button
          >
        </div>
        <div class="history-summary">
          <div>
            <span class="muted">第 {{ historyRound }} 轮审核</span
            ><strong>{{ historyRound === 2 ? "2023" : "2020" }} 年度</strong>
          </div>
          <div>
            <span class="muted">历史清洁生产水平</span
            ><strong
              >{{
                historyRound === 2
                  ? "国内清洁生产先进水平"
                  : "国内清洁生产一般水平"
              }}
              <span class="example-label">（演示）</span></strong
            >
          </div>
          <div>
            <span class="muted">本次查询整改方案</span
            ><strong
              >{{ rows.length }} 项
              <span class="muted">
                / 已完成
                {{ rows.filter((r) => r.status === "已完成").length }} 项</span
              ></strong
            >
          </div>
        </div>
        <DataTable
          :rows="rows"
          :editable="!readOnly"
          :columns="[
            { field: 'name', title: '审核方案', minWidth: 250 },
            { field: 'owner', title: '责任部门', width: 120 },
            { field: 'due', title: '计划完成时间', width: 140 },
            { field: 'progress', title: '整改进度', minWidth: 160 },
            {
              field: 'status',
              title: '当前状态',
              width: 125,
              edit: true,
              options: ['未开始', '进行中', '已完成'],
            },
          ]"
          ><template #progress="{ row }"
            ><div class="row">
              <n-progress
                type="line"
                :percentage="row.progress"
                :show-indicator="false"
                style="width: 100px"
              /><span class="small">{{ row.progress }}%</span>
            </div></template
          ><template #status="{ row }"
            ><select
              v-if="!readOnly"
              v-model="row.status"
              class="status-select"
              @change="
                row.progress =
                  row.status === '已完成'
                    ? 100
                    : row.status === '未开始'
                      ? 0
                      : 65
              "
            >
              <option>未开始</option>
              <option>进行中</option>
              <option>已完成</option></select
            ><span
              v-else
              :class="['status-pill', { warning: row.status !== '已完成' }]"
              >{{ row.status }}</span
            ></template
          ></DataTable
        >
        <p class="muted small" style="margin-top: 14px">
          归档报告为示例下载文件。原始审核报告可在“企业相关资料报告”上传和查阅。
        </p>
      </div>
    </section>
    <RecordEditor
      v-model:show="edit"
      title="编辑企业信息"
      :record="info"
      :fields="
        infoFields.map((f) => ({
          ...f,
          required: ['name', 'creditCode', 'contact', 'phone'].includes(f.key),
          disabled: ['city', 'county'].includes(f.key),
          wide: ['name', 'address'].includes(f.key),
        }))
      "
      @save="save"
    />
  </div>
</template>
<style scoped>
:deep(.info-label) {
  background: #f5f7fa;
  font-weight: 600;
  color: #606266;
}
.name {
  color: #409eff;
  font-weight: 600;
}
.history-summary {
  display: flex;
  gap: 48px;
  padding: 18px 22px;
  background: #f8fafc;
  margin-bottom: 20px;
  border: 1px solid #edf0f5;
}
.history-summary > div > span {
  display: block;
  font-size: 12px;
  margin-bottom: 6px;
}
.history-summary strong {
  font-size: 14px;
  font-weight: 500;
}
.status-select {
  padding: 4px 7px;
  border: 1px solid #d9ecff;
  background: #ecf5ff;
  color: #409eff;
  border-radius: 3px;
  font-size: 12px;
}
@media (max-width: 750px) {
  .history-summary {
    flex-wrap: wrap;
    gap: 20px;
  }
}
</style>
