<script setup>
import { ref, computed } from "vue";
import { useMessage } from "naive-ui";
import { session } from "../data/store";
import { clone, timestamp, isOwner } from "../data/deliveryWorkflow";
import { downloadText } from "../services/files";
import DataTable from "./DataTable.vue";
import AttachmentPicker from "./AttachmentPicker.vue";
import Icon from "./Icon.vue";
const props = defineProps({ data: Object }),
  message = useMessage(),
  modal = ref(false),
  form = ref({}),
  detail = ref(null);
const rows = computed(() => props.data.continuousRecords || []),
  editable = computed(() => isOwner(props.data, session.user));
function open() {
  form.value = {
    period: new Date()
      .toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" })
      .slice(0, 7),
    production: null,
    energy: null,
    water: null,
    nox: null,
    content: "",
    next: "",
    files: [],
  };
  modal.value = true;
}
function save() {
  const x = form.value;
  if (
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(x.period) ||
    !x.content.trim() ||
    ["production", "energy", "water", "nox"].some(
      (k) => x[k] === null || !Number.isFinite(x[k]) || x[k] < 0,
    )
  )
    return message.warning("请填写有效月份、非负统计数据与持续改进情况");
  props.data.continuousRecords ??= [];
  props.data.continuousRecords.unshift({
    ...clone(x),
    id: crypto.randomUUID(),
    at: timestamp(),
    author: session.user.name,
  });
  modal.value = false;
  message.success("持续清洁生产记录已保存");
}
const intensity = (r, k) =>
  r.production > 0 ? (r[k] / r.production).toFixed(3) : "—";
</script>
<template>
  <section class="section-card continuous-panel">
    <div class="section-heading">
      <h3><Icon name="refresh" /> 持续清洁生产跟踪</h3>
      <n-button v-if="editable" type="primary" @click="open"
        >新增持续跟踪记录</n-button
      >
    </div>
    <div class="section-body stack">
      <div class="continuous-banner">
        <Icon name="check" />
        <div>
          <strong>本轮审批已完成，进入持续清洁生产</strong>
          <p>
            继续记录生产、能耗、水耗、排放和维护情况，原审核报告与批准记录可随时查看。
          </p>
        </div>
        <span class="status-pill">{{
          data.demoPreset ? "已批准演示" : "持续跟踪中"
        }}</span>
      </div>
      <p class="muted small">
        以下为月度数据，同一月份可追加复核记录；不同记录不自动相加，行业年度汇总仍采用获批年报口径。
      </p>
      <DataTable
        :rows="rows"
        :columns="[
          { field: 'period', title: '统计月份', width: 115 },
          { field: 'production', title: '产品产量（t）', width: 135 },
          { field: 'energy', title: '能耗（tce）', width: 135 },
          { field: 'water', title: '用水（m³）', width: 130 },
          { field: 'nox', title: 'NOx（t）', width: 115 },
          { field: 'intensity', title: '单位产品能耗（tce/t）', width: 190 },
          { field: 'content', title: '持续改进情况', minWidth: 300 },
          { field: 'action', title: '详情与凭证', width: 120, fixed: 'right' },
        ]"
        ><template #intensity="{ row }">{{ intensity(row, "energy") }}</template
        ><template #action="{ row }"
          ><button class="link-button" @click="detail = row">
            查看记录
          </button></template
        ></DataTable
      >
      <div class="row wrap">
        <n-button
          size="small"
          @click="
            downloadText(
              data.info.name + '持续清洁生产记录.json',
              JSON.stringify(rows, null, 2),
              'application/json;charset=utf-8',
            )
          "
          >导出持续记录</n-button
        ><n-button
          v-if="data.beforeApprovedDemo && editable"
          size="small"
          @click="
            downloadText(
              data.info.name + '切换前流程备份.json',
              JSON.stringify(data.beforeApprovedDemo, null, 2),
              'application/json;charset=utf-8',
            )
          "
          >下载切换前流程备份</n-button
        >
      </div>
    </div>
    <n-modal
      v-model:show="modal"
      preset="card"
      title="新增持续清洁生产记录"
      style="width: 760px; max-width: 94vw"
      ><n-form class="form-grid" label-placement="top"
        ><n-form-item label="统计月份" required
          ><n-input
            v-model:value="form.period"
            placeholder="YYYY-MM" /></n-form-item
        ><n-form-item
          v-for="x in [
            { k: 'production', n: '产品产量（t）' },
            { k: 'energy', n: '综合能耗（tce）' },
            { k: 'water', n: '新鲜水量（m³）' },
            { k: 'nox', n: 'NOx排放（t）' },
          ]"
          :key="x.k"
          :label="x.n"
          required
          ><n-input-number
            v-model:value="form[x.k]"
            :min="0"
            :input-props="{ 'aria-label': x.n }" /></n-form-item
        ><n-form-item label="持续改进与运行情况" required class="wide"
          ><n-input
            v-model:value="form.content"
            type="textarea"
            placeholder="记录持续整改、运行维护和指标复核情况" /></n-form-item
        ><n-form-item label="下一步措施" class="wide"
          ><n-input
            v-model:value="form.next"
            type="textarea"
            placeholder="填写下一步改进措施" /></n-form-item
        ><n-form-item label="相关凭证" class="wide"
          ><AttachmentPicker
            :data="data"
            v-model="form.files"
            category="整改过程凭证" /></n-form-item
      ></n-form>
      <div class="modal-actions">
        <n-button @click="modal = false">取消</n-button
        ><n-button type="primary" @click="save">保存持续跟踪记录</n-button>
      </div></n-modal
    >
    <n-modal
      :show="!!detail"
      @update:show="
        (v) => {
          if (!v) detail = null;
        }
      "
      preset="card"
      title="持续清洁生产记录"
      style="width: 720px; max-width: 94vw"
      ><div v-if="detail" class="stack">
        <h4>{{ detail.period }} · {{ detail.author }}</h4>
        <p>{{ detail.content }}</p>
        <p>下一步：{{ detail.next || "—" }}</p>
        <AttachmentPicker
          :data="data"
          :model-value="detail.files"
          readonly
        /></div
    ></n-modal>
  </section>
</template>
