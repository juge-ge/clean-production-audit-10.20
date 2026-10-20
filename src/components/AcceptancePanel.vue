<script setup>
import { randomId } from "../services/id.js";

import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useMessage, useDialog } from "naive-ui";
import { session } from "../data/store";
import {
  isOwner,
  canHandle,
  approvedPlan,
  acceptanceChecks,
  submitAcceptance,
  decideAcceptance,
  createReport,
  clone,
} from "../data/deliveryWorkflow";
import {
  renderAuditReport,
  downloadAuditReport,
} from "../services/auditReport";
import { downloadText } from "../services/files";
import DataTable from "./DataTable.vue";
import AttachmentPicker from "./AttachmentPicker.vue";
import Icon from "./Icon.vue";
const props = defineProps({ data: Object, draftOnly: Boolean, readOnly: Boolean });
const router = useRouter();
const message = useMessage(),
  dialog = useDialog(),
  checkModal = ref(false),
  check = ref({}),
  version = ref(null),
  decisionModal = ref(false),
  decision = ref({}),
  outcome = ref("approved"),
  reportVisible = ref(false);
const f = computed(() => props.data.delivery),
  owner = computed(() => isOwner(props.data, session.user)),
  editable = computed(
    () =>
      !props.readOnly && owner.value &&
      ["implementing", "acceptance_returned"].includes(f.value.status),
  ),
  reviewer = computed(() => !props.readOnly && canHandle(props.data, session.user));
const viewed = computed(
  () =>
    f.value.acceptanceVersions.find((v) => v.number === version.value) ||
    f.value.acceptanceVersions.at(-1),
);
const draft = computed(() =>
  editable.value && !version.value
    ? f.value.acceptanceDraft
    : viewed.value?.draft || f.value.acceptanceDraft,
);
const editing = computed(() => editable.value && !version.value);
const checks = computed(() => acceptanceChecks(props.data, draft.value));
const passed = (row) =>
  row.actual != null &&
  row.actual !== "" &&
  row.target != null &&
  row.target !== "" &&
  (row.operator === "≤"
    ? Number(row.actual) <= Number(row.target)
    : Number(row.actual) >= Number(row.target));
function saveCheck() {
  if (!editing.value) return;
  const x = check.value;
  if (
    !x.name?.trim() ||
    !x.basis?.trim() ||
    x.actual == null ||
    x.target == null ||
    !x.files?.length
  )
    return message.warning("请填写指标、依据、目标和实测值，并上传证明材料");
  const i = draft.value.checks.findIndex((r) => r.id === x.id);
  if (i < 0) draft.value.checks.push(clone(x));
  else draft.value.checks[i] = clone(x);
  checkModal.value = false;
}
function openCheck(row) {
  check.value = row
    ? clone(row)
    : {
        id: randomId(),
        name: "",
        basis: "",
        operator: "≤",
        target: null,
        actual: null,
        unit: "",
        files: [],
      };
  checkModal.value = true;
}
function removeCheck(row) {
  dialog.warning({
    title: "删除验收指标",
    content: `确认从当前草稿移除“${row.name}”？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: () => {
      draft.value.checks = draft.value.checks.filter((x) => x.id !== row.id);
    },
  });
}
function submit() {
  if (props.draftOnly) {
    router.push('/app/oa?stage=delivery&detail=acceptance');
    return;
  }
  dialog.info({
    title: "提交本轮清洁生产验收",
    content:
      "将冻结本次验收指标、批准材料和全部整改记录，提交所属接收单位检查指导。",
    positiveText: "确认提交验收",
    negativeText: "继续核对",
    onPositiveClick: () => {
      try {
        submitAcceptance(props.data, session.user);
        version.value = null;
        message.success("验收申请已提交至本机办理流程");
      } catch (e) {
        message.warning(e.message);
      }
    },
  });
}
function openDecision(result) {
  outcome.value = result;
  decision.value = {
    date: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" }),
    inspection: "",
    guidance: "",
    comment: "",
    approvalNo: "",
    files: [],
  };
  decisionModal.value = true;
}
function saveDecision() {
  try {
    decideAcceptance(props.data, session.user, outcome.value, decision.value);
    decisionModal.value = false;
    version.value = null;
    message.success(
      outcome.value === "approved"
        ? "本轮验收通过，企业可生成报告"
        : "已退回企业继续整改",
    );
  } catch (e) {
    message.warning(e.message);
  }
}
function generate() {
  try {
    createReport(props.data, session.user);
    reportVisible.value = true;
    message.success("已按获批与验收记录生成报告");
  } catch (e) {
    message.warning(e.message);
  }
}
</script>
<template>
  <section class="section-card">
    <div class="section-heading">
      <h3><Icon name="check" /> 本轮验收与报告生成</h3>
      <n-select
        v-if="f.acceptanceVersions.length"
        v-model:value="version"
        :options="[
          ...(editable ? [{ label: '当前验收草稿', value: null }] : []),
          ...f.acceptanceVersions
            .slice()
            .reverse()
            .map((v) => ({
              label: '验收 A' + v.number + ' · ' + v.at,
              value: v.number,
            })),
        ]"
        :placeholder="editable ? '当前验收草稿' : '最新验收版本'"
        style="width: 285px"
        aria-label="验收版本"
      />
    </div>
    <div class="section-body stack">
      <n-empty
        v-if="!approvedPlan(data)"
        description="方案报备获批并完成实施后，在此填写验收资料"
      />
      <template v-else>
        <n-alert
          v-if="f.status === 'acceptance_returned' && !version"
          type="warning"
          :show-icon="false"
          >上级退回：{{
            f.acceptanceVersions.at(-1).decision.comment
          }}。请补充整改记录、更新验收数据后再次提交。</n-alert
        >
        <div class="form-grid">
          <n-form-item label="相关批准文件 / 文号" required class="wide"
            ><n-input
              v-if="editing"
              v-model:value="draft.approvalNo"
              placeholder="填写本轮相关批准文件名称与文号"
            />
            <p v-else>{{ draft.approvalNo || "待填写" }}</p></n-form-item
          ><n-form-item label="批准与验收材料" required class="wide"
            ><AttachmentPicker
              :data="data"
              v-model="draft.files"
              :readonly="!editing"
              category="验收申请材料" /></n-form-item
          ><n-form-item label="本轮验收说明" required class="wide"
            ><n-input
              v-if="editing"
              v-model:value="draft.conclusion"
              type="textarea"
              :autosize="{ minRows: 3, maxRows: 6 }"
              placeholder="说明方案实施效果、批准落实及本轮验收申请事项"
            />
            <p v-else>{{ draft.conclusion || "待填写" }}</p></n-form-item
          >
        </div>
        <div class="between">
          <h4>验收指标与达标自查</h4>
          <n-button
            v-if="editing"
            type="primary"
            secondary
            size="small"
            @click="openCheck()"
            >添加验收指标</n-button
          >
        </div>
        <DataTable
          :rows="draft.checks"
          :columns="[
            { field: 'name', title: '验收指标', minWidth: 170 },
            { field: 'basis', title: '批准要求 / 标准依据', minWidth: 220 },
            { field: 'target', title: '目标要求', width: 135 },
            { field: 'actual', title: '实测值', width: 110 },
            { field: 'pass', title: '企业自查', width: 105 },
            { field: 'files', title: '证明材料', minWidth: 230 },
            { field: 'action', title: '操作', width: 115, fixed: 'right' },
          ]"
          ><template #target="{ row }"
            >{{ row.operator }} {{ row.target }} {{ row.unit }}</template
          ><template #actual="{ row }">{{ row.actual }} {{ row.unit }}</template
          ><template #pass="{ row }"
            ><span :class="['status-pill', { warning: !passed(row) }]">{{
              passed(row) ? "自查达标" : "未达标"
            }}</span></template
          ><template #files="{ row }"
            ><AttachmentPicker
              :data="data"
              :model-value="row.files"
              readonly /></template
          ><template #action="{ row }"
            ><template v-if="editing"
              ><button class="link-button" @click="openCheck(row)">修改</button
              ><button class="link-button danger" @click="removeCheck(row)">
                删除
              </button></template
            ><span v-else class="muted">已提交</span></template
          ></DataTable
        >
        <p class="muted small">
          目标和依据由企业据适用标准及批准文件填写；自查按所填数值比较，最终以接收单位检查结论为准。
        </p>
        <template v-if="editing"
          ><DataTable
            :rows="checks"
            :columns="[
              { field: 'name', title: '提交检查', minWidth: 200 },
              { field: 'detail', title: '核对要求', minWidth: 360 },
              { field: 'pass', title: '状态', width: 110 },
            ]"
            ><template #pass="{ row }"
              ><span :class="['status-pill', { warning: !row.pass }]">{{
                row.pass ? "已完成" : "待完善"
              }}</span></template
            ></DataTable
          >
          <div class="modal-actions">
            <n-button
              type="primary"
              :disabled="checks.some((c) => !c.pass)"
              @click="submit"
              >{{ draftOnly ? '前往 OA 提交验收' : '提交上级验收' }}</n-button
            >
          </div></template
        >
        <div v-if="viewed?.decision" class="visit-record">
          <h4>验收 A{{ viewed.number }} · 上级检查指导</h4>
          <p>
            检查日期：{{ viewed.decision.date }}　单位：{{
              viewed.decision.actor
            }}
          </p>
          <p>检查情况：{{ viewed.decision.inspection }}</p>
          <p>指导意见：{{ viewed.decision.guidance }}</p>
          <p>办理结论：{{ viewed.decision.comment }}</p>
          <p v-if="viewed.decision.approvalNo">
            验收批复：{{ viewed.decision.approvalNo }}
          </p>
          <AttachmentPicker
            :data="data"
            :model-value="viewed.decision.files"
            readonly
          />
        </div>
        <div
          v-if="
            reviewer &&
            f.status === 'acceptance_submitted' &&
            (!version || version === f.acceptanceVersions.at(-1).number)
          "
          class="modal-actions"
        >
          <n-button @click="openDecision('returned')"
            >检查指导并退回整改</n-button
          ><n-button type="primary" @click="openDecision('approved')"
            >检查指导并通过验收</n-button
          >
        </div>
        <p v-else-if="f.status === 'acceptance_submitted'" class="section-note">
          当前验收申请已提交，等待上级检查指导。提交版本只读。
        </p>
        <div
          v-if="['accepted', 'reported'].includes(f.status)"
          class="report-ready"
        >
          <div>
            <h4>本轮验收已通过</h4>
            <p class="muted small">
              报告汇编获批填报、优化方案、专家意见、整改凭证和验收结论。
            </p>
          </div>
          <div class="row wrap">
            <n-button v-if="owner && !f.report" type="primary" @click="generate"
              >生成本轮审核报告</n-button
            ><template v-if="f.report"
              ><n-button @click="reportVisible = true">预览生成报告</n-button
              ><n-button type="primary" @click="downloadAuditReport(f.report)"
                >下载审核报告</n-button
              ><n-button
                @click="
                  downloadText(
                    f.report.name + '.json',
                    JSON.stringify(f.report, null, 2),
                    'application/json;charset=utf-8',
                  )
                "
                >导出归档数据</n-button
              ></template
            >
          </div>
        </div>
      </template>
    </div>
    <n-modal
      v-model:show="checkModal"
      preset="card"
      title="验收指标与依据"
      style="width: 760px; max-width: 94vw"
      ><n-form class="form-grid" label-placement="top"
        ><n-form-item label="验收指标" required
          ><n-input
            v-model:value="check.name"
            placeholder="填写验收指标名称" /></n-form-item
        ><n-form-item label="单位"
          ><n-input
            v-model:value="check.unit"
            placeholder="例如：tce/t、m³/t、mg/m³" /></n-form-item
        ><n-form-item label="批准要求 / 标准依据" required class="wide"
          ><n-input
            v-model:value="check.basis"
            placeholder="填写批准文件或标准名称、条款及统计口径" /></n-form-item
        ><n-form-item label="目标要求" required
          ><div class="row">
            <n-select
              v-model:value="check.operator"
              :options="['≤', '≥'].map((v) => ({ label: v, value: v }))"
              style="width: 80px"
            /><n-input-number
              v-model:value="check.target"
              :min="0"
              :input-props="{ 'aria-label': '验收目标值' }"
            /></div></n-form-item
        ><n-form-item label="实测值" required
          ><n-input-number
            v-model:value="check.actual"
            :min="0"
            :input-props="{ 'aria-label': '验收实测值' }" /></n-form-item
        ><n-form-item label="监测 / 验证材料" required class="wide"
          ><AttachmentPicker
            :data="data"
            v-model="check.files"
            category="验收指标证明" /></n-form-item
      ></n-form>
      <div class="modal-actions">
        <n-button @click="checkModal = false">取消</n-button
        ><n-button type="primary" @click="saveCheck">保存验收指标</n-button>
      </div></n-modal
    >
    <n-modal
      v-model:show="decisionModal"
      preset="card"
      :title="
        outcome === 'approved' ? '检查指导与验收通过' : '检查指导与退回整改'
      "
      style="width: 780px; max-width: 94vw"
      ><n-form class="form-grid" label-placement="top"
        ><n-form-item label="检查日期" required
          ><n-input
            v-model:value="decision.date"
            placeholder="填写检查日期" /></n-form-item
        ><n-form-item label="验收批复文号" :required="outcome === 'approved'"
          ><n-input
            v-model:value="decision.approvalNo"
            placeholder="填写验收批复文号" /></n-form-item
        ><n-form-item label="现场检查情况" required class="wide"
          ><n-input
            v-model:value="decision.inspection"
            type="textarea"
            placeholder="记录整改核验、凭证核对及现场检查结果" /></n-form-item
        ><n-form-item label="指导意见" required class="wide"
          ><n-input
            v-model:value="decision.guidance"
            type="textarea"
            placeholder="填写持续改进或进一步整改要求" /></n-form-item
        ><n-form-item label="办理结论" required class="wide"
          ><n-input
            v-model:value="decision.comment"
            type="textarea"
            placeholder="填写通过验收或退回整改的具体结论" /></n-form-item
        ><n-form-item
          label="检查记录 / 批复附件"
          :required="outcome === 'approved'"
          class="wide"
          ><AttachmentPicker
            :data="data"
            v-model="decision.files"
            category="验收批复" /></n-form-item
      ></n-form>
      <div class="modal-actions">
        <n-button @click="decisionModal = false">取消</n-button
        ><n-button type="primary" @click="saveDecision">确认验收处理</n-button>
      </div></n-modal
    >
    <n-modal
      v-model:show="reportVisible"
      preset="card"
      title="本轮清洁生产审核报告"
      style="width: 1100px; max-width: 95vw"
      ><iframe
        v-if="f.report"
        :srcdoc="renderAuditReport(f.report)"
        title="生成审核报告预览"
        sandbox
        style="width: 100%; height: 72vh; border: 1px solid #e4e7ed"
      />
      <div class="modal-actions">
        <n-button
          v-if="f.report"
          type="primary"
          @click="downloadAuditReport(f.report)"
          >下载报告（HTML）</n-button
        >
      </div></n-modal
    >
  </section>
</template>
