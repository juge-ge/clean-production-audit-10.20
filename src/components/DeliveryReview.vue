<script setup>
import { ref, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { useMessage } from "naive-ui";
import { session } from "../data/store";
import {
  canHandle,
  isOwner,
  decidePlan,
  constraintsCheck,
} from "../data/deliveryWorkflow";
import DataTable from "./DataTable.vue";
import DeliverySteps from "./DeliverySteps.vue";
import SchemeTable from "./SchemeTable.vue";
import AttachmentPicker from "./AttachmentPicker.vue";
import ImplementationPanel from "./ImplementationPanel.vue";
import AcceptancePanel from "./AcceptancePanel.vue";
import ContinuousProduction from "./ContinuousProduction.vue";
const props = defineProps({ data: Object, readOnly: Boolean }),
  message = useMessage();
const route = useRoute();
const f = computed(() => props.data.delivery),
  tab = ref(
    route.query.detail ||
      (f.value.status === "reported"
        ? "continuous"
        : [
              "acceptance_submitted",
              "acceptance_returned",
              "accepted",
              "reported",
            ].includes(f.value.status)
          ? "acceptance"
          : "plan"),
  ),
  version = ref(null);
watch(
  () => route.query.detail,
  (v) => {
    if (
      ["plan", "implementation", "acceptance", "continuous", "events"].includes(
        v,
      )
    )
      tab.value = v;
  },
);
const viewed = computed(
  () =>
    f.value.planVersions.find((x) => x.number === version.value) ||
    f.value.planVersions.at(-1),
);
const actionable = computed(
  () =>
    !props.readOnly && canHandle(props.data, session.user) &&
    f.value.status === "plan_submitted" &&
    viewed.value?.number === f.value.planVersions.at(-1)?.number,
);
const modal = ref(false),
  result = ref("approved"),
  form = ref({});
function open(outcome) {
  result.value = outcome;
  form.value = {
    comment: "",
    approvalNo: "",
    periodStart: "",
    periodEnd: "",
    files: [],
  };
  modal.value = true;
}
function save() {
  try {
    decidePlan(props.data, session.user, result.value, form.value);
    modal.value = false;
    message.success(
      result.value === "approved"
        ? "方案获批，企业已进入实施考察期"
        : "已退回企业修改方案",
    );
  } catch (e) {
    message.warning(e.message);
  }
}
</script>
<template>
  <div class="stack">
    <DeliverySteps :data="data" />
    <div class="tabs-strip">
      <button
        v-for="s in [
          { id: 'plan', name: '方案报备' },
          { id: 'implementation', name: '实施考察' },
          { id: 'acceptance', name: '验收检查' },
          ...(f.status === 'reported'
            ? [{ id: 'continuous', name: '持续清洁生产' }]
            : []),
          { id: 'events', name: '办理记录' },
        ]"
        :key="s.id"
        :class="{ active: tab === s.id }"
        @click="tab = s.id"
      >
        {{ s.name }}
      </button>
    </div>
    <ContinuousProduction v-if="tab === 'continuous'" :data="data" />
    <section v-else-if="tab === 'plan'" class="section-card">
      <div class="section-heading">
        <h3>企业方案报备</h3>
        <n-select
          v-if="viewed"
          v-model:value="version"
          :options="
            f.planVersions
              .slice()
              .reverse()
              .map((v) => ({
                label: '报备 P' + v.number + ' · ' + v.at,
                value: v.number,
              }))
          "
          placeholder="最新报备版本"
          style="width: 285px"
          aria-label="方案报备版本"
        />
      </div>
      <div class="section-body stack">
        <n-empty
          v-if="!viewed"
          description="企业尚未提交方案报备；提交后可在此审核固定版本"
        /><template v-else
          ><div class="baseline-strip">
            <span
              >获批填报 <b>V{{ viewed.baseline.version }}</b></span
            ><span
              >方案报备 <b>P{{ viewed.number }}</b></span
            ><span
              >自评水平 <b>{{ viewed.baseline.level }}</b></span
            ><span>企业说明：{{ viewed.note }}</span>
          </div>
          <SchemeTable :rows="viewed.plan.items" />
          <h4>报备约束与方案校核</h4>
          <DataTable
            :rows="
              constraintsCheck(
                viewed.plan.items,
                viewed.constraints,
                viewed.baseline,
              )
            "
            :columns="[
              { field: 'name', title: '约束项', minWidth: 190 },
              { field: 'target', title: '要求', minWidth: 160 },
              { field: 'actual', title: '方案预计值', minWidth: 150 },
              { field: 'pass', title: '校核', width: 100 },
            ]"
            ><template #target="{ row }"
              >{{ row.operator }} {{ row.target }} {{ row.unit }}</template
            ><template #actual="{ row }"
              >{{ row.actual }} {{ row.unit }}</template
            ><template #pass="{ row }">{{
              row.pass ? "满足" : "不满足"
            }}</template></DataTable
          >
          <div class="visit-record">
            <h4>专家意见与人工修订</h4>
            <p>
              {{ viewed.expertReview.expert.name }} ·
              {{ viewed.expertReview.expert.organization }} ·
              {{ viewed.expertReview.expert.source }}
            </p>
            <p>资质说明：{{ viewed.expertReview.expert.qualification }}</p>
            <AttachmentPicker
              :data="data"
              :model-value="viewed.expertReview.expert.files || []"
              readonly
            />
            <p>{{ viewed.expertReview.content }}</p>
            <p class="muted small">
              企业代录：{{ viewed.expertReview.recorder }}　{{
                viewed.expertReview.at
              }}　修订版 R{{ viewed.expertReview.revision }}
            </p>
            <p
              v-for="s in viewed.plan.items.filter((x) => x.reason)"
              :key="s.id"
            >
              {{ s.name }}：{{ s.reason }}
            </p>
          </div>
          <div v-if="viewed.decision" class="visit-record">
            <h4>
              {{
                viewed.decision.result === "approved"
                  ? "方案报备批准"
                  : "方案报备退回"
              }}
            </h4>
            <p>{{ viewed.decision.comment }}</p>
            <p v-if="viewed.decision.approvalNo">
              批复文号：{{ viewed.decision.approvalNo }}
            </p>
            <p v-if="viewed.decision.periodStart">
              实施考察期：{{ viewed.decision.periodStart }} 至
              {{ viewed.decision.periodEnd }}
            </p>
            <AttachmentPicker
              :data="data"
              :model-value="viewed.decision.files || []"
              readonly
            />
            <p class="muted small">
              {{ viewed.decision.actor }}　{{ viewed.decision.at }}
            </p>
          </div>
          <div v-if="actionable" class="modal-actions">
            <n-button @click="open('returned')">退回方案修改</n-button
            ><n-button type="primary" @click="open('approved')"
              >批准方案并进入实施考察</n-button
            >
          </div>
          <p v-else-if="!canHandle(data, session.user)" class="section-note">
            当前账号可查看辖区办理情况，审批由企业所属县级接收单位办理。
          </p></template
        >
      </div>
    </section>
    <ImplementationPanel v-else-if="tab === 'implementation'" :data="data" />
    <template v-else-if="tab === 'acceptance'"
      ><AcceptancePanel v-if="f.acceptanceVersions.length || (isOwner(data, session.user) && ['implementing', 'acceptance_returned'].includes(f.status))" :data="data" :read-only="readOnly" />
      <section v-else class="section-card">
        <div class="section-body">
          <n-empty description="企业尚未提交验收申请" />
        </div></section
    ></template>
    <section v-else class="section-card">
      <div class="section-heading"><h3>方案、实施与验收办理记录</h3></div>
      <div class="section-body">
        <DataTable
          :rows="f.events"
          :columns="[
            { field: 'at', title: '时间', width: 190 },
            { field: 'actor', title: '办理人 / 单位', minWidth: 220 },
            { field: 'action', title: '操作', minWidth: 220 },
            { field: 'note', title: '说明', minWidth: 300 },
          ]"
        />
      </div>
    </section>
    <n-modal
      v-model:show="modal"
      preset="card"
      :title="result === 'approved' ? '方案批准与实施考察安排' : '退回方案修改'"
      style="width: 760px; max-width: 94vw"
      ><n-form class="form-grid" label-placement="top"
        ><n-form-item label="办理意见" required class="wide"
          ><n-input
            v-model:value="form.comment"
            type="textarea"
            placeholder="填写方案批准意见或需要修改的具体内容" /></n-form-item
        ><template v-if="result === 'approved'"
          ><n-form-item label="方案批复文号" required class="wide"
            ><n-input
              v-model:value="form.approvalNo"
              placeholder="填写方案批复文号" /></n-form-item
          ><n-form-item label="实施考察开始日期" required
            ><n-input
              v-model:value="form.periodStart"
              placeholder="开始日期 YYYY-MM-DD" /></n-form-item
          ><n-form-item label="实施考察结束日期" required
            ><n-input
              v-model:value="form.periodEnd"
              placeholder="结束日期 YYYY-MM-DD" /></n-form-item
          ><n-form-item label="方案批复附件" class="wide"
            ><AttachmentPicker
              :data="data"
              v-model="form.files"
              category="方案报备批复" /></n-form-item></template
      ></n-form>
      <div class="modal-actions">
        <n-button @click="modal = false">取消</n-button
        ><n-button type="primary" @click="save">确认方案处理</n-button>
      </div></n-modal
    >
  </div>
</template>
