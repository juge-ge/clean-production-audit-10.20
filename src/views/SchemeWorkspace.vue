<script setup>
import { randomId } from "../services/id.js";

import { computed, inject, ref, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useMessage, useDialog } from "naive-ui";
import { session } from "../data/store";
import { experts } from "../data/experts";
import {
  baseline,
  dataApproved,
  isOwner,
  planEditable,
  schemeLibrary,
  constraintFields,
  clone,
  generateCandidates,
  selectCandidate,
  measures,
  constraintsCheck,
  saveConstraints,
  parseDemand,
  updatePlanItem,
  setExpert,
  recordExpertReview,
  submitPlan,
  timestamp,
} from "../data/deliveryWorkflow";
import Icon from "../components/Icon.vue";
import DataTable from "../components/DataTable.vue";
import RecordEditor from "../components/RecordEditor.vue";
import AttachmentPicker from "../components/AttachmentPicker.vue";
import DeliverySteps from "../components/DeliverySteps.vue";
import SchemeTable from "../components/SchemeTable.vue";
import ImplementationPanel from "../components/ImplementationPanel.vue";
import ReadOnlySchemes from "../components/ReadOnlySchemes.vue";
import DeliveryReview from "../components/DeliveryReview.vue";
const { data, round, isWorkbench = false, archiveOnly = false } = inject("audit"),
  router = useRouter(),
  message = useMessage(),
  dialog = useDialog();
const f = computed(() => data.value.delivery),
  b = computed(() => baseline(data.value)),
  owner = computed(() => isOwner(data.value, session.user));
const editable = computed(() => owner.value && planEditable(data.value));
const tab = ref(
  router.currentRoute.value.query.section ||
    ([
      "implementing",
      "acceptance_returned",
      "acceptance_submitted",
      "accepted",
      "reported",
    ].includes(f.value.status)
      ? "implementation"
      : "optimize"),
);
watch(
  () => router.currentRoute.value.query.section,
  (v) => {
    if (["optimize", "expert", "implementation", "ledger"].includes(v))
      tab.value = v;
  },
);
const constraintModal = ref(false),
  constraints = ref({}),
  input = ref(""),
  expertModal = ref(false),
  expertMode = ref("library"),
  expertSearch = ref(""),
  external = ref({
    name: "",
    organization: "",
    qualification: "",
    specialty: "",
    files: [],
  }),
  opinion = ref(""),
  confirmReview = ref(false),
  note = ref(""),
  itemModal = ref(false),
  item = ref({});
const chatElement = ref(null);
watch(
  () => f.value.chat.length,
  async () => {
    await nextTick();
    if (chatElement.value)
      chatElement.value.scrollTop = chatElement.value.scrollHeight;
  },
);
const expertRows = computed(() =>
  experts.filter((e) => (e.name + e.specialty).includes(expertSearch.value)),
);
const checkRows = computed(() =>
  f.value.selected && b.value
    ? constraintsCheck(f.value.selected.items, f.value.constraints, b.value)
    : [],
);
const currentReview = computed(() => f.value.expertReviews.at(-1));
const reviewed = computed(
  () => currentReview.value?.revision === f.value.revision,
);
function run(fn, text) {
  try {
    const result = fn();
    if (text) message.success(text);
    return result ?? true;
  } catch (e) {
    message.warning(e.message);
    return false;
  }
}
function generate() {
  if (f.value.selected) {
    dialog.warning({
      title: "重新生成候选组合",
      content:
        "会按当前约束生成候选方案，已选择方案仍保留，只有重新选择时才会替换。",
      positiveText: "生成候选",
      negativeText: "取消",
      onPositiveClick: () =>
        run(
          () => generateCandidates(data.value, session.user),
          "候选组合已更新",
        ),
    });
  } else
    run(() => generateCandidates(data.value, session.user), "候选组合已更新");
}
function choose(c) {
  if (f.value.selected)
    dialog.warning({
      title: "替换当前方案",
      content:
        "新的组合将替换当前人工修订稿，并需要重新完成专家复核。报备历史保留。",
      positiveText: "选择此组合",
      negativeText: "取消",
      onPositiveClick: () =>
        run(
          () => selectCandidate(data.value, session.user, c.id),
          "已选择方案组合",
        ),
    });
  else
    run(
      () => selectCandidate(data.value, session.user, c.id),
      "已选择方案组合",
    );
}
function saveConstraintForm() {
  if (
    run(
      () => saveConstraints(data.value, session.user, constraints.value),
      "约束已保存",
    )
  )
    constraintModal.value = false;
}
function send() {
  if (!input.value.trim() || !editable.value) return;
  const text = input.value.trim();
  f.value.chat.push({
    id: randomId(),
    role: "user",
    text,
    at: timestamp(),
  });
  const parsed = parseDemand(text, f.value.constraints);
  f.value.suggestion = parsed.changes.length ? parsed : null;
  f.value.chat.push({
    id: randomId(),
    role: "assistant",
    text: parsed.changes.length
      ? `已整理 ${parsed.changes.length} 项约束调整建议。请核对下方变更，确认后重新生成方案；会按获批 V${b.value.version} 的基准数据比较效果。`
      : "当前为本地演示，尚未连接 DeepSeek 模型。可以输入“预算不超过 100 万、停产不超过 3 天、节水至少 10%、优先节水”等明确条件，或直接编辑约束；未识别的需求不会自动改动方案。",
    at: timestamp(),
  });
  input.value = "";
}
function applySuggestion() {
  if (
    run(
      () => saveConstraints(data.value, session.user, f.value.suggestion.next),
      "已应用约束建议，请重新生成方案",
    )
  ) {
    f.value.chat.push({
      id: randomId(),
      role: "assistant",
      text: "企业已确认并应用这次约束变更。",
      at: timestamp(),
    });
    f.value.suggestion = null;
  }
}
function chooseExpert(e) {
  if (
    run(
      () =>
        setExpert(data.value, session.user, {
          ...e,
          source: "专家库",
          qualification: e.title + " · " + e.specialty + "（示例资质，待核实）",
          files: [],
        }),
      "评审专家已选择",
    )
  )
    expertModal.value = false;
}
function saveExternal() {
  if (
    run(
      () =>
        setExpert(data.value, session.user, {
          ...external.value,
          source: "自选专家",
        }),
      "自选专家信息已保存",
    )
  )
    expertModal.value = false;
}
function confirmExpert() {
  if (!confirmReview.value)
    return message.warning("请先确认已依据专家意见完成修订。");
  if (
    run(
      () => recordExpertReview(data.value, session.user, opinion.value),
      "专家复核记录已保存",
    )
  ) {
    opinion.value = "";
    confirmReview.value = false;
  }
}
function reportPlan() {
  dialog.info({
    title: "提交本轮方案报备",
    content:
      "将提交当前方案、优化约束和专家复核意见，形成固定版本。仅在本机演示，不向外部发送。",
    positiveText: "确认报备",
    negativeText: "取消",
    onPositiveClick: () =>
      run(
        () => submitPlan(data.value, session.user, note.value),
        "方案已提交，等待上级批准",
      ),
  });
}
const itemFields = [
  { key: "name", label: "方案名称", required: true, wide: true },
  { key: "investment", label: "投资（万元）", type: "number", required: true },
  {
    key: "saving",
    label: "年经济效益（万元）",
    type: "number",
    required: true,
  },
  { key: "energy", label: "预计节能（tce/a）", type: "number", required: true },
  { key: "water", label: "预计节水（m³/a）", type: "number", required: true },
  { key: "nox", label: "预计 NOx 减排（t/a）", type: "number", required: true },
  { key: "days", label: "工期（天）", type: "number", required: true },
  { key: "downtime", label: "停产（天）", type: "number", required: true },
  {
    key: "description",
    label: "具体方案与实施措施",
    type: "textarea",
    wide: true,
  },
  {
    key: "reason",
    label: "人工调整依据 / 专家建议",
    type: "textarea",
    wide: true,
    required: true,
  },
];
</script>
<template>
  <ReadOnlySchemes v-if="round !== 3" />
  <DeliveryReview v-else-if="!owner" :data="data" :read-only="archiveOnly" />
  <div v-else class="stack">
    <section class="section-card">
      <div class="section-heading">
        <h3><Icon name="clipboard" /> 方案研制与保障实施</h3>
        <span class="muted small"
          >获批数据 → 方案优化 → 专家修订 → 报备实施</span
        >
      </div>
      <div class="section-body"><DeliverySteps :data="data" /></div>
    </section>
    <section v-if="!dataApproved(data)" class="section-card">
      <div class="section-body locked-stage">
        <Icon name="shield" :size="32" />
        <h3>填报数据获批后开启方案优化</h3>
        <p>
          企业先在清洁生产审核 OA
          中确定本轮填报数据并提交。上级批准后，以该固定版本作为方案优化的基准。
        </p>
        <n-button
          type="primary"
          @click="router.push(owner ? '/app/oa' : '/app/oa/' + data.info.id)"
          >进入填报数据审核</n-button
        >
      </div>
    </section>
    <template v-else>
      <div class="delivery-tabs tabs-strip">
        <button
          v-for="t in [
            { id: 'optimize', label: '方案推荐与优化' },
            { id: 'expert', label: '专家修订与报备' },
            { id: 'implementation', label: '实施考察' },
            { id: 'ledger', label: '已有方案台账' },
          ]"
          :key="t.id"
          :class="{ active: tab === t.id }"
          @click="tab = t.id"
        >
          {{ t.label }}
        </button>
      </div>
      <div v-if="tab === 'optimize'" class="scheme-studio">
        <div class="stack scheme-left">
          <section class="section-card">
            <div class="section-heading">
              <h3>企业当前水平与优化约束</h3>
              <n-button
                v-if="editable"
                size="small"
                @click="
                  constraints = clone(f.constraints);
                  constraintModal = true;
                "
                >编辑约束条件</n-button
              >
            </div>
            <div class="section-body">
              <div class="baseline-strip">
                <span>获批填报 V{{ b.version }}</span
                ><span>自评：{{ b.level }}</span
                ><span>年产量 {{ b.production.toLocaleString() }} t</span
                ><span>能耗 {{ b.energy.toLocaleString() }} tce/a</span
                ><span>新鲜水 {{ b.water.toLocaleString() }} m³/a</span>
              </div>
              <div class="constraint-grid">
                <div v-for="c in constraintFields" :key="c.key">
                  <span>{{ c.label }}</span
                  ><strong
                    >{{ f.constraints[c.key] }}
                    <small>{{ c.unit }}</small></strong
                  >
                </div>
              </div>
              <p class="muted small">
                目标权重：投资 {{ f.constraints.weights.cost }} / 节能
                {{ f.constraints.weights.energy }} / 节水
                {{ f.constraints.weights.water }} / NOx 减排
                {{ f.constraints.weights.nox }}
              </p>
            </div>
          </section>
          <section class="section-card">
            <div class="section-heading">
              <h3>调研方案库</h3>
              <span class="muted small">6 项行业示例 · 可选择参与优化</span>
            </div>
            <div class="section-body">
              <DataTable
                :rows="schemeLibrary"
                :sequence="false"
                :columns="[
                  { field: 'enabled', title: '纳入', width: 60 },
                  { field: 'name', title: '推荐措施与适用条件', minWidth: 300 },
                  { field: 'investment', title: '投资（万元）', width: 120 },
                  { field: 'source', title: '推荐来源', minWidth: 200 },
                ]"
                ><template #enabled="{ row }"
                  ><n-checkbox
                    :checked="f.enabled.includes(row.id)"
                    :disabled="!editable"
                    :aria-label="'纳入' + row.name"
                    @update:checked="
                      (v) => {
                        f.enabled = v
                          ? [...f.enabled, row.id]
                          : f.enabled.filter((x) => x !== row.id);
                      }
                    " /></template
                ><template #name="{ row }"
                  ><strong>{{ row.name }}</strong>
                  <p class="muted small">{{ row.prerequisite }}</p></template
                ></DataTable
              >
              <p class="muted small" style="margin-top: 12px">
                费用和效果为演示参数，正式使用时需依据调研和专家意见核实。工期按并行实施取最长值，停产天数按保守累计计算。
              </p>
            </div>
          </section>
          <section class="section-card">
            <div class="section-heading">
              <h3>多目标方案组合</h3>
              <n-button v-if="editable" type="primary" @click="generate"
                >生成推荐方案</n-button
              >
            </div>
            <div class="section-body stack">
              <p class="section-note">
                根据所选示例措施枚举可行组合，剔除被其他组合全面优于的结果，再按权重排序。此为前端可计算演示，尚未接入正式多目标模型。
              </p>
              <div v-if="f.candidates.length" class="candidate-grid">
                <article
                  v-for="c in f.candidates"
                  :key="c.id"
                  :class="{ selected: f.selected?.id === c.id }"
                >
                  <div class="between">
                    <h4>{{ c.name }}</h4>
                    <span class="muted small">评分 {{ c.score }}</span>
                  </div>
                  <p>
                    {{ c.items.length }} 项措施 · 投资
                    {{ c.metrics.investment }} 万元
                  </p>
                  <p>
                    节能 {{ c.metrics.energy }} tce/a · 节水
                    {{ c.metrics.water }} m³/a
                  </p>
                  <p>
                    NOx 减排 {{ c.metrics.nox }} t/a · 回收期
                    {{ c.metrics.payback }} 年
                  </p>
                  <n-button
                    size="small"
                    :disabled="!editable"
                    :type="f.selected?.id === c.id ? 'primary' : 'default'"
                    @click="choose(c)"
                    >{{
                      f.selected?.id === c.id ? "已选组合" : "选择此组合"
                    }}</n-button
                  >
                </article>
              </div>
              <n-empty
                v-else
                :description="
                  f.runs.length
                    ? '当前约束下没有可行组合，请调整预算、目标或参与措施'
                    : '设置约束后生成候选组合'
                "
              />
              <template v-if="f.selected"
                ><div class="between">
                  <h4>当前方案 · 修订 R{{ f.revision }}</h4>
                  <n-button @click="tab = 'expert'"
                    >进入专家修订与报备</n-button
                  >
                </div>
                <SchemeTable
                  :rows="f.selected.items"
                  :editable="editable"
                  @edit="
                    (row) => {
                      item = { ...row };
                      itemModal = true;
                    }
                  "
                /><DataTable
                  :rows="checkRows"
                  :columns="[
                    { field: 'name', title: '约束校核', minWidth: 180 },
                    { field: 'actual', title: '当前方案值', minWidth: 125 },
                    { field: 'target', title: '约束条件', minWidth: 160 },
                    { field: 'pass', title: '校核结果', width: 105 },
                  ]"
                  ><template #target="{ row }"
                    >{{ row.operator }} {{ row.target }}
                    {{ row.unit }}</template
                  ><template #pass="{ row }"
                    ><span :class="['status-pill', { warning: !row.pass }]">{{
                      row.pass ? "满足" : "不满足"
                    }}</span></template
                  ></DataTable
                ></template
              >
            </div>
          </section>
        </div>
        <aside class="scheme-assistant">
          <div class="assistant-heading">
            <Icon name="chat" />
            <div>
              <strong>方案优化助手</strong
              ><small>DeepSeek Harness · 前端演示</small>
            </div>
          </div>
          <div class="assistant-context">
            基于获批 V{{ b.version }} 的企业水平，协助整理优化目标与约束。
          </div>
          <div class="scheme-chat" ref="chatElement">
            <div class="assistant-bubble">
              <small>助手</small>
              <p>
                可说明预算、工期、停产限制及节能节水需求。约束调整经你确认后生效。
              </p>
            </div>
            <div
              v-for="m in f.chat"
              :key="m.id"
              :class="['assistant-bubble', { user: m.role === 'user' }]"
            >
              <small>{{ m.role === "user" ? "企业" : "助手" }}</small>
              <p>{{ m.text }}</p>
            </div>
          </div>
          <div v-if="f.suggestion" class="constraint-suggestion">
            <h4>待确认的约束调整</h4>
            <div v-for="c in f.suggestion.changes" :key="c.key">
              <span>{{ c.label }}</span
              ><strong>{{ c.before }} → {{ c.after }} {{ c.unit }}</strong>
            </div>
            <div class="row">
              <n-button
                size="small"
                type="primary"
                :disabled="!editable"
                @click="applySuggestion"
                >确认应用约束</n-button
              ><n-button size="small" @click="f.suggestion = null"
                >忽略</n-button
              >
            </div>
          </div>
          <div class="scheme-composer">
            <div class="quick-prompts">
              <button
                :disabled="!editable"
                @click="input = '预算不超过 100 万，停产不超过 3 天，优先节水'"
              >
                控制预算，优先节水</button
              ><button
                :disabled="!editable"
                @click="input = '节能至少 8%，工期不超过 90 天，优先节能'"
              >
                提高节能目标
              </button>
            </div>
            <n-input
              v-model:value="input"
              type="textarea"
              :disabled="!editable"
              placeholder="例如：预算 100 万、停产 3 天、节水至少 10%"
              :autosize="{ minRows: 3, maxRows: 6 }"
              aria-label="方案优化需求"
            />
            <div class="between">
              <span class="muted small">本地规则演示，未连接模型</span
              ><n-button
                type="primary"
                size="small"
                :disabled="!editable || !input.trim()"
                @click="send"
                >发送需求</n-button
              >
            </div>
          </div>
        </aside>
      </div>
      <div v-else-if="tab === 'expert'" class="stack">
        <section class="section-card">
          <div class="section-heading">
            <h3>当前方案与人工修订</h3>
            <span class="muted small">{{
              f.selected ? "修订 R" + f.revision : "尚未选择方案"
            }}</span>
          </div>
          <div class="section-body">
            <SchemeTable
              v-if="f.selected"
              :rows="f.selected.items"
              :editable="editable"
              @edit="
                (row) => {
                  item = { ...row };
                  itemModal = true;
                }
              "
            /><n-empty v-else description="请先在方案推荐与优化中选择组合" />
          </div>
        </section>
        <section class="section-card">
          <div class="section-heading">
            <h3>专家选择与意见录入</h3>
            <n-button v-if="editable" @click="expertModal = true"
              >选择或自选专家</n-button
            >
          </div>
          <div class="section-body stack">
            <div v-if="f.expert" class="expert-summary">
              <h4>
                {{ f.expert.name }}
                <span class="muted small">{{ f.expert.source }}</span>
              </h4>
              <p>{{ f.expert.organization }} · {{ f.expert.qualification }}</p>
              <AttachmentPicker
                :data="data"
                :model-value="f.expert.files"
                readonly
              />
            </div>
            <n-empty
              v-else
              description="从专家库选择，或填写自选资质专家及证明材料"
            />
            <template v-if="editable"
              ><n-input
                v-model:value="opinion"
                type="textarea"
                placeholder="录入专家对方案的修改建议、已落实调整和复核结论"
                :autosize="{ minRows: 4, maxRows: 8 }"
              /><n-checkbox v-model:checked="confirmReview"
                >已依据专家意见完成当前方案修订，确认录入本次复核意见。</n-checkbox
              >
              <div class="between">
                <span class="muted small"
                  >企业代录意见；本演示未向专家发送邀请或完成电子签名。</span
                ><n-button type="primary" @click="confirmExpert"
                  >保存专家复核意见</n-button
                >
              </div></template
            >
            <DataTable
              :rows="f.expertReviews.slice().reverse()"
              :columns="[
                { field: 'revision', title: '修订版本', width: 100 },
                { field: 'expert', title: '专家', width: 120 },
                {
                  field: 'content',
                  title: '专家意见与修订记录',
                  minWidth: 350,
                },
                { field: 'at', title: '录入时间', width: 185 },
              ]"
              ><template #expert="{ row }">{{ row.expert.name }}</template
              ><template #revision="{ row }"
                >R{{ row.revision }}</template
              ></DataTable
            >
          </div>
        </section>
        <section class="section-card">
          <div class="section-heading">
            <h3>方案报备上级</h3>
            <span :class="['status-pill', { warning: !reviewed }]">{{
              reviewed ? "当前版本已复核" : "当前版本待专家复核"
            }}</span>
          </div>
          <div class="section-body stack">
            <n-alert
              v-if="f.status === 'plan_returned'"
              type="warning"
              :show-icon="false"
              >上级退回意见：{{
                f.planVersions.at(-1).decision.comment
              }}</n-alert
            ><div v-if="editable && isWorkbench" class="between">
              <p class="muted small">方案及专家复核意见已保存在工作台，正式报备请前往 OA 核对提交。</p>
              <n-button type="primary" :disabled="!reviewed" @click="router.push('/app/oa?stage=delivery&detail=plan')">前往 OA 报备</n-button>
            </div><template v-else-if="editable"
              ><n-input
                v-model:value="note"
                type="textarea"
                placeholder="填写方案报备说明；如被退回，请逐项说明修改情况"
              />
              <div class="modal-actions">
                <n-button
                  type="primary"
                  :disabled="!reviewed"
                  @click="reportPlan"
                  >提交方案报备</n-button
                >
              </div></template
            >
            <p v-else class="section-note">
              当前方案已提交或已获批。获批后在“实施考察”中持续录入整改情况。
            </p>
            <DataTable
              :rows="f.planVersions.slice().reverse()"
              :columns="[
                { field: 'number', title: '报备版本', width: 100 },
                { field: 'at', title: '提交时间', width: 185 },
                { field: 'note', title: '报备说明', minWidth: 280 },
                { field: 'decision', title: '上级处理意见', minWidth: 320 },
              ]"
              ><template #number="{ row }">P{{ row.number }}</template
              ><template #decision="{ row }">{{
                row.decision
                  ? (row.decision.result === "approved" ? "批准：" : "退回：") +
                    row.decision.comment
                  : "待上级处理"
              }}</template></DataTable
            >
          </div>
        </section>
      </div>
      <ImplementationPanel v-else-if="tab === 'implementation'" :data="data" />
      <ReadOnlySchemes v-else />
      <div
        v-if="
          tab === 'implementation' &&
          [
            'implementing',
            'acceptance_returned',
            'acceptance_submitted',
            'accepted',
            'reported',
          ].includes(f.status)
        "
        class="oa-bottom"
      >
        <span class="muted small">完成整改后，进入成果总结填写验收材料。</span
        ><n-button
          type="primary"
          @click="
            router.replace({
              query: { ...router.currentRoute.value.query, p: 'summary' },
            })
          "
          >进入验收与报告</n-button
        >
      </div>
    </template>
    <RecordEditor
      v-model:show="itemModal"
      title="人工修订当前方案"
      :record="item"
      :fields="itemFields"
      @save="
        (form) =>
          run(
            () => updatePlanItem(data, session.user, form),
            '方案已更新，请重新录入专家复核意见',
          )
      "
    />
    <n-modal
      v-model:show="constraintModal"
      preset="card"
      title="多目标优化约束"
      style="width: 750px; max-width: 94vw"
      ><n-form class="form-grid" label-placement="top"
        ><n-form-item
          v-for="c in constraintFields"
          :key="c.key"
          :label="c.label + '（' + c.unit + '）'"
          ><n-input-number
            v-model:value="constraints[c.key]"
            :min="c.min"
            :max="c.max"
            :aria-label="c.label"
        /></n-form-item>
        <div v-if="constraints.weights" class="wide form-grid">
          <n-form-item
            v-for="w in [
              { key: 'cost', label: '投资' },
              { key: 'energy', label: '节能' },
              { key: 'water', label: '节水' },
              { key: 'nox', label: 'NOx 减排' },
            ]"
            :key="w.key"
            :label="w.label + '权重'"
            ><n-input-number
              v-model:value="constraints.weights[w.key]"
              :min="0"
              :max="100"
          /></n-form-item></div
      ></n-form>
      <div class="modal-actions">
        <n-button @click="constraintModal = false">取消</n-button
        ><n-button type="primary" @click="saveConstraintForm"
          >保存优化约束</n-button
        >
      </div></n-modal
    >
    <n-modal
      v-model:show="expertModal"
      preset="card"
      title="选择评审专家"
      style="width: 920px; max-width: 94vw"
      ><div class="tabs-strip">
        <button
          :class="{ active: expertMode === 'library' }"
          @click="expertMode = 'library'"
        >
          专家库</button
        ><button
          :class="{ active: expertMode === 'external' }"
          @click="expertMode = 'external'"
        >
          自选资质专家
        </button>
      </div>
      <template v-if="expertMode === 'library'"
        ><n-input
          v-model:value="expertSearch"
          placeholder="搜索专家姓名或专业方向"
          style="margin-bottom: 15px"
        /><DataTable
          :rows="expertRows"
          :columns="[
            { field: 'name', title: '姓名', width: 100 },
            { field: 'title', title: '职称', width: 150 },
            { field: 'specialty', title: '专业方向', width: 155 },
            { field: 'organization', title: '单位', minWidth: 200 },
            { field: 'action', title: '操作', width: 100 },
          ]"
          ><template #action="{ row }"
            ><button class="link-button" @click="chooseExpert(row)">
              选择专家
            </button></template
          ></DataTable
        ></template
      ><template v-else
        ><n-form class="form-grid" label-placement="top"
          ><n-form-item label="专家姓名" required
            ><n-input
              v-model:value="external.name"
              placeholder="填写自选专家姓名" /></n-form-item
          ><n-form-item label="所属单位" required
            ><n-input
              v-model:value="external.organization"
              placeholder="填写专家所属单位" /></n-form-item
          ><n-form-item label="资质与专业说明" required class="wide"
            ><n-input
              v-model:value="external.qualification"
              placeholder="填写职称、资质或相关审核经历" /></n-form-item
          ><n-form-item label="资质证明材料" required class="wide"
            ><AttachmentPicker
              :data="data"
              v-model="external.files"
              category="专家资质证明" /></n-form-item
        ></n-form>
        <p class="muted small">资质由企业核实，本演示仅保存填报信息。</p>
        <div class="modal-actions">
          <n-button type="primary" @click="saveExternal">保存自选专家</n-button>
        </div></template
      ></n-modal
    >
  </div>
</template>
