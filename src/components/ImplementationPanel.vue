<script setup>
import { ref, computed } from "vue";
import { useMessage } from "naive-ui";
import { session } from "../data/store";
import {
  approvedPlan,
  isOwner,
  latestProgress,
  addProgress,
} from "../data/deliveryWorkflow";
import DataTable from "./DataTable.vue";
import AttachmentPicker from "./AttachmentPicker.vue";
import Icon from "./Icon.vue";
const props = defineProps({ data: Object });
const message = useMessage(),
  modal = ref(false),
  form = ref({}),
  detail = ref(null);
const plan = computed(() => approvedPlan(props.data));
const editable = computed(
  () =>
    isOwner(props.data, session.user) &&
    ["implementing", "acceptance_returned"].includes(
      props.data.delivery.status,
    ),
);
const rows = computed(
  () =>
    plan.value?.plan.items.map((s) => ({
      ...s,
      progress: latestProgress(props.data, s.id)?.progress || 0,
      current:
        latestProgress(props.data, s.id)?.content || "等待企业录入实施情况",
    })) || [],
);
const records = computed(() =>
  props.data.delivery.records
    .slice()
    .reverse()
    .map((r) => ({
      ...r,
      name:
        plan.value?.plan.items.find((s) => s.id === r.schemeId)?.name ||
        r.schemeId,
    })),
);
function open(row) {
  form.value = {
    schemeId: row?.id || rows.value[0]?.id,
    date: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" }),
    progress: row?.progress || 0,
    content: "",
    reason: "",
    files: [],
  };
  modal.value = true;
}
function save() {
  try {
    addProgress(props.data, session.user, form.value);
    modal.value = false;
    message.success("实施考察记录与凭证已保存");
  } catch (e) {
    message.warning(e.message);
  }
}
</script>
<template>
  <section class="section-card">
    <div class="section-heading">
      <h3><Icon name="calendar" /> 本轮方案实施考察</h3>
      <n-button v-if="editable" type="primary" @click="open()"
        >新增整改记录</n-button
      >
    </div>
    <div class="section-body stack">
      <n-empty v-if="!plan" description="方案报备获批后，进入实施考察期" />
      <template v-else
        ><div class="ledger-summary">
          <span>获批方案 P{{ plan.number }}</span
          ><span>批复：{{ plan.decision.approvalNo }}</span
          ><span
            >考察期：{{ plan.decision.periodStart }} 至
            {{ plan.decision.periodEnd }}</span
          >
        </div>
        <p class="section-note">{{ plan.decision.comment }}</p>
        <DataTable
          :rows="rows"
          :columns="[
            { field: 'name', title: '获批方案', minWidth: 220 },
            { field: 'type', title: '类别', width: 115 },
            { field: 'progress', title: '最新整改进度', width: 170 },
            { field: 'current', title: '当前整改情况', minWidth: 320 },
            { field: 'action', title: '操作', width: 125, fixed: 'right' },
          ]"
          ><template #progress="{ row }"
            ><n-progress type="line" :percentage="row.progress" /></template
          ><template #action="{ row }"
            ><button v-if="editable" class="link-button" @click="open(row)">
              录入整改</button
            ><span v-else class="muted">已留档</span></template
          ></DataTable
        >
        <h4>持续整改记录与凭证</h4>
        <DataTable
          :rows="records"
          :columns="[
            { field: 'date', title: '记录日期', width: 125 },
            { field: 'name', title: '对应方案', minWidth: 210 },
            { field: 'progress', title: '进度（%）', width: 105 },
            { field: 'content', title: '整改情况', minWidth: 300 },
            { field: 'author', title: '填报单位', minWidth: 220 },
            {
              field: 'action',
              title: '凭证 / 详情',
              width: 130,
              fixed: 'right',
            },
          ]"
          ><template #action="{ row }"
            ><button class="link-button" @click="detail = row">
              查看 {{ row.files.length }} 份凭证
            </button></template
          ></DataTable
        >
        <p class="muted small">
          可多次追加整改过程与凭证。每次记录独立保存，提交验收后该次材料形成固定版本。
        </p></template
      >
    </div>
    <n-modal
      v-model:show="modal"
      preset="card"
      title="录入整改情况与凭证"
      style="width: 760px; max-width: 94vw"
      ><n-form class="form-grid" label-placement="top"
        ><n-form-item label="对应获批方案" required class="wide"
          ><n-select
            v-model:value="form.schemeId"
            :options="
              rows.map((s) => ({ label: s.name, value: s.id }))
            " /></n-form-item
        ><n-form-item label="记录日期" required
          ><n-input
            v-model:value="form.date"
            placeholder="YYYY-MM-DD" /></n-form-item
        ><n-form-item label="当前整改进度（%）" required
          ><n-input-number
            v-model:value="form.progress"
            :min="0"
            :max="100"
            :input-props="{ 'aria-label': '当前整改进度' }" /></n-form-item
        ><n-form-item label="整改情况与阶段成效" required class="wide"
          ><n-input
            v-model:value="form.content"
            type="textarea"
            placeholder="填写已完成的整改内容、实施效果与下一步工作" /></n-form-item
        ><n-form-item label="偏差或进度回调原因" class="wide"
          ><n-input
            v-model:value="form.reason"
            placeholder="如有进度回调，请填写原因" /></n-form-item
        ><n-form-item label="整改凭证" required class="wide"
          ><AttachmentPicker
            :data="data"
            v-model="form.files"
            category="整改过程凭证" /></n-form-item
      ></n-form>
      <div class="modal-actions">
        <n-button @click="modal = false">取消</n-button
        ><n-button type="primary" @click="save">保存整改记录</n-button>
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
      title="实施考察记录"
      style="width: 700px; max-width: 94vw"
      ><div v-if="detail" class="stack">
        <h4>{{ detail.name }} · {{ detail.progress }}%</h4>
        <p>{{ detail.date }} · {{ detail.author }}</p>
        <p>{{ detail.content }}</p>
        <p v-if="detail.reason">偏差说明：{{ detail.reason }}</p>
        <AttachmentPicker
          :data="data"
          :model-value="detail.files"
          readonly
        /></div
    ></n-modal>
  </section>
</template>
