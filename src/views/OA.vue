<script setup>
import { computed, provide, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useMessage, useDialog } from "naive-ui";
import { session, enterpriseData } from "../data/store";
import {
  copy,
  oaSections,
  statusLabels,
  ensureDraft,
  latestVersion,
  recipientFor,
  canReview,
  checkSnapshot,
  levelMetrics,
  submit,
  startReview,
  addComment,
  scheduleVisit,
  returnForRevision,
  beginRevision,
  approve,
  visibleSubmissions,
} from "../data/auditWorkflow";
import { downloadText } from "../services/files";
import DataTable from "../components/DataTable.vue";
import RecordEditor from "../components/RecordEditor.vue";
import EvidenceDrawer from "../components/EvidenceDrawer.vue";
import Icon from "../components/Icon.vue";
import EnterpriseInfo from "./EnterpriseInfo.vue";
import Organization from "./Organization.vue";
import Survey from "./Survey.vue";
import Analysis from "./Analysis.vue";
import DeliveryReview from "../components/DeliveryReview.vue";
import PlanSubmission from "../components/PlanSubmission.vue";
import { dataApproved, deliveryLabels } from "../data/deliveryWorkflow";
import { prepareWorkspaceSubmission } from "../services/enterpriseWorkspace";
const route = useRoute(),
  router = useRouter(),
  message = useMessage(),
  dialog = useDialog();
watch(
  () => route.query.stage,
  (v) => {
    if (["fill", "submit", "delivery"].includes(v)) tab.value = v;
  },
);
const owner = computed(() => session.user.role === "enterprise");
const entityId = computed(() =>
  owner.value ? session.user.enterpriseId : route.params.id,
);
const entity = computed(() =>
  entityId.value ? enterpriseData(entityId.value) : null,
);
const flow = computed(() => entity.value?.oaWorkflow);
const last = computed(() => (flow.value ? latestVersion(flow.value) : null));
const canEdit = computed(
  () => owner.value && ["draft", "revising"].includes(flow.value?.status),
);
const tab = ref(
    ["fill", "submit", "delivery"].includes(route.query.stage)
      ? route.query.stage
    : owner.value
      ? "submit"
      : entity.value && dataApproved(entity.value)
        ? "delivery"
        : "fill",
  ),
  section = ref("info"),
  selected = ref(null),
  accepted = ref(false),
  search = ref(""),
  filter = ref(null);
const versionOptions = computed(() => [
  ...(canEdit.value ? [{ label: "待提交材料", value: 0 }] : []),
  ...(flow.value?.versions || [])
    .slice()
    .reverse()
    .map((v) => ({
      label: `提交版本 V${v.number} · ${v.at}`,
      value: v.number,
    })),
]);
const versionNumber = computed({
  get: () => selected.value ?? (canEdit.value ? 0 : last.value?.number),
  set: (v) => {
    selected.value = v;
  },
});
const viewedVersion = computed(() =>
  flow.value?.versions.find((v) => v.number === versionNumber.value),
);
const data = computed(() => {
  if (!entity.value) return null;
  if (viewedVersion.value) return viewedVersion.value.snapshot;
  if (canEdit.value) return ensureDraft(entity.value);
  return last.value?.snapshot;
});
const round = computed(() => 3),
  roundData = computed(() => data.value?.rounds[3]);
const readOnly = computed(() => owner.value || !canEdit.value || !!versionNumber.value);
const current = computed(
  () => !selected.value || selected.value === last.value?.number,
);
const reviewer = computed(
  () => entity.value && canReview(entity.value, session.user),
);
const checks = computed(() => (data.value ? checkSnapshot(data.value) : []));
const metrics = computed(() => (data.value ? levelMetrics(data.value) : {}));
const evidence = ref({ show: false, source: "", page: 1 });
const showEvidence = (source, page) => {
  evidence.value = { show: true, source, page };
};
provide("audit", {
  data,
  round,
  roundData,
  readOnly,
  showEvidence,
  isOa: true,
});
const components = {
  info: EnterpriseInfo,
  organization: Organization,
  survey: Survey,
  analysis: Analysis,
};
const submissions = computed(() =>
  visibleSubmissions(session.user, enterpriseData).filter(
    (r) =>
      r.name.includes(search.value) &&
      (!filter.value || r.status === filter.value),
  ),
);
const reviewVersion = computed(() => viewedVersion.value || last.value);
const responseRows = computed(() =>
  Object.entries(reviewVersion.value?.responses || {}).map(
    ([key, response]) => {
      const c = flow.value.versions
        .flatMap((v) => v.comments)
        .find((c) => c.id === key);
      return {
        id: key,
        section: c?.section,
        field: c?.field,
        content: c?.content,
        response,
      };
    },
  ),
);
const modal = ref(false),
  action = ref("comment"),
  record = ref({});
const fields = computed(() =>
  action.value === "comment"
    ? [
        {
          key: "section",
          label: "所属模块",
          options: oaSections.map((s) => s.name),
          required: true,
        },
        { key: "field", label: "数据项 / 表格 / 工序", required: true },
        {
          key: "content",
          label: "具体审核意见与修改建议",
          required: true,
          type: "textarea",
          wide: true,
        },
        {
          key: "severity",
          label: "意见类别",
          options: ["需修订", "建议完善", "现场核实"],
          required: true,
        },
      ]
    : action.value === "visit"
      ? [
          { key: "date", label: "考察日期（YYYY-MM-DD）", required: true },
          { key: "location", label: "考察地点", required: true },
          {
            key: "people",
            label: "考察人员及单位",
            required: true,
            wide: true,
          },
          {
            key: "scope",
            label: "现场核查范围与重点",
            type: "textarea",
            wide: true,
          },
        ]
      : [
          {
            key: "content",
            label:
              action.value === "return" ? "现场考察情况与整改要求" : "审核结论",
            required: true,
            type: "textarea",
            wide: true,
          },
        ],
);
const titles = {
  comment: "填写数据审核意见",
  visit: "安排现场考察",
  return: "现场考察反馈与退回修订",
  approve: "填写审核结论",
};
function run(fn, success) {
  try {
    fn();
    message.success(success);
    return true;
  } catch (e) {
    message.warning(e.message);
    return false;
  }
}
function openAction(kind) {
  action.value = kind;
  record.value =
    kind === "comment"
      ? {
          section:
            oaSections.find((s) => s.id === section.value)?.name || "企业情况",
          severity: "需修订",
        }
      : kind === "visit"
        ? {
            location: entity.value.info.address,
            date: "",
            people: "",
            scope: "核查企业生产情况、原始台账、计量设施和污染治理设施。",
          }
        : {};
  modal.value = true;
}
function saveAction(form) {
  const ops = {
    comment: () => addComment(entity.value, session.user, form),
    visit: () => scheduleVisit(entity.value, session.user, form),
    return: () => returnForRevision(entity.value, session.user, form.content),
    approve: () => approve(entity.value, session.user, form.content),
  };
  run(ops[action.value], "办理记录已保存至本机");
}
function synchronize() {
  dialog.warning({
    title: "从审核工作台更新",
    content:
      "将用审核工作台的当前草稿更新待提交材料。已提交的版本和审核意见会保留。",
    positiveText: "更新待提交材料",
    negativeText: "取消",
    onPositiveClick: () =>
      run(() => prepareWorkspaceSubmission(entity.value), "待提交材料已更新"),
  });
}
function send() {
  if (!accepted.value) return message.warning("请先确认已核对本次填报内容。");
  dialog.info({
    title:
      flow.value.status === "revising" ? "确认修订后再次提交" : "确认提交上级",
    content: `接收单位：${recipientFor(entity.value).name}。将保存 V${flow.value.versions.length + 1} 的固定数据版本。当前仅在本机演示提交。`,
    positiveText: "确认提交",
    negativeText: "继续核对",
    onPositiveClick: () => {
      if (
        run(() => submit(entity.value, session.user), "已在本机生成提交版本")
      ) {
        selected.value = null;
        accepted.value = false;
      }
    },
  });
}
function revise() {
  if (run(() => beginRevision(entity.value, session.user), "已建立修订草稿")) {
    selected.value = null;
    router.push("/app/audit-workbench");
  }
}
function exportVersion() {
  downloadText(
    `${entity.value.info.name}_OA_${versionNumber.value ? "V" + versionNumber.value : "草稿"}.json`,
    JSON.stringify(
      {
        version: versionNumber.value || "draft",
        data: copy(data.value),
        checks: checks.value,
      },
      null,
      2,
    ),
    "application/json;charset=utf-8",
  );
}
</script>
<template>
  <div v-if="!entityId" class="stack">
    <section class="section-card">
      <div class="section-heading">
        <h3><Icon name="clipboard" /> 清洁生产审核 OA · 收件办理</h3>
        <span class="muted small">{{ session.user.name }}</span>
      </div>
      <div class="section-body">
        <div class="toolbar">
          <n-input
            v-model:value="search"
            placeholder="搜索已提交企业"
            clearable
            style="width: 260px"
          /><n-select
            v-model:value="filter"
            :options="
              Object.values(statusLabels).map((s) => ({ label: s, value: s }))
            "
            clearable
            placeholder="全部办理状态"
            style="width: 200px"
          /><n-button
            @click="
              search = '';
              filter = null;
            "
            >重置</n-button
          >
        </div>
        <DataTable
          :rows="submissions"
          :columns="[
            { field: 'name', title: '企业名称', minWidth: 250 },
            { field: 'county', title: '所属区县', width: 110 },
            { field: 'level', title: '企业自评水平', minWidth: 230 },
            { field: 'status', title: '办理状态', width: 170 },
            { field: 'delivery', title: '后续阶段', width: 200 },
            { field: 'version', title: '版本', width: 80 },
            { field: 'at', title: '提交时间', width: 185 },
            { field: 'action', title: '操作', width: 120, fixed: 'right' },
          ]"
          ><template #version="{ row }">V{{ row.version }}</template
          ><template #delivery="{ row }">{{
            dataApproved(enterpriseData(row.id))
              ? deliveryLabels[enterpriseData(row.id).delivery.status]
              : "待填报数据获批"
          }}</template
          ><template #status="{ row }"
            ><span class="status-pill warning">{{ row.status }}</span></template
          ><template #action="{ row }"
            ><button
              class="link-button"
              @click="
                router.push(
                  '/app/oa/' +
                    row.id +
                    (dataApproved(enterpriseData(row.id))
                      ? '?stage=delivery'
                      : ''),
                )
              "
            >
              查看办理
            </button></template
          ></DataTable
        >
        <p class="section-note" style="margin-top: 18px">
          展示辖区内企业已提交的版本。县级接收单位填写审核意见、安排现场考察并反馈；省、市级账号可查看辖区办理情况。当前为本机前端演示。
        </p>
      </div>
    </section>
  </div>
  <div v-else-if="data" class="stack oa-page">
    <section class="section-card">
      <div class="section-heading">
        <h3><Icon name="clipboard" /> 清洁生产审核 OA</h3>
        <div class="row">
          <span
            :class="['status-pill', { warning: flow.status !== 'approved' }]"
            >{{ statusLabels[flow.status] }}</span
          ><n-button v-if="!owner" size="small" @click="router.push('/app/oa')"
            >返回收件列表</n-button
          >
        </div>
      </div>
      <div class="section-body oa-heading">
        <div>
          <h2>{{ entity.info.name }}</h2>
          <p class="muted">
            第 3 轮 · 2026 年审核　接收单位：{{ recipientFor(entity).name }}
          </p>
        </div>
        <div class="row wrap">
          <n-select
            v-model:value="versionNumber"
            :options="versionOptions"
            style="width: 290px"
            aria-label="OA数据版本"
          /><n-button @click="exportVersion">导出当前填报</n-button>
        </div>
      </div>
      <div class="oa-flow">
        <button
          v-for="(label, i) in [
            '填报数据',
            '提交上级',
            '资料审核与现场考察',
            '修订与再次提交',
            '填报数据获批',
          ]"
          :key="label"
          :class="{
            complete: dataApproved(entity),
            current: !dataApproved(entity) && i === 0,
          }"
          @click="tab = i === 0 ? 'fill' : 'submit'"
        >
          <span>{{ dataApproved(entity) ? "✓" : i + 1 }}</span
          >{{ label }}<Icon v-if="i < 4" name="right" :size="12" />
        </button>
      </div>
      <div class="oa-primary-tabs">
        <button :class="{ active: tab === 'fill' }" @click="tab = 'fill'">
          {{ owner ? '材料查阅' : '填报数据' }}</button
        ><button :class="{ active: tab === 'submit' }" @click="tab = 'submit'">
          提交与办理
          <span v-if="last?.comments.length" class="oa-count">{{
            last.comments.length
          }}</span></button
        ><button
          v-if="dataApproved(entity)"
          :class="{ active: tab === 'delivery' }"
          @click="tab = 'delivery'"
        >
          方案与验收办理</button
        ><span class="muted small">前端演示 · 数据保存在本机</span>
      </div>
    </section>
    <div v-if="dataApproved(entity) && owner" class="oa-bottom">
      <span>{{
        entity.delivery.status === "reported"
          ? "本轮全部审批已完成，可直接查看持续清洁生产及历史办理记录。"
          : "填报数据已获批，可以开展方案优化、专家修订和报备。"
      }}</span
      ><n-button
        type="primary"
        @click="router.push('/app/audit-workbench?p=solution')"
        >查看方案与实施</n-button
      >
    </div>
    <div
      v-if="owner && entity.delivery.status === 'reported'"
      class="demo-approved-note"
    >
      <span>已批准演示 · 原填报内容与切换前流程均已保留。</span
      ><n-button
        type="primary"
        @click="router.push('/app/audit-workbench?p=summary')"
        >进入持续清洁生产</n-button
      >
    </div>
    <template v-if="tab === 'fill'">
      <div class="oa-fill-toolbar">
        <div class="tabs-strip">
          <button
            v-for="s in oaSections"
            :key="s.id"
            :class="{ active: section === s.id }"
            @click="section = s.id"
          >
            {{ s.name }}
          </button>
        </div>
        <n-button v-if="owner && canEdit && !versionNumber" size="small" @click="synchronize"
          >从审核工作台更新</n-button
        ><span v-else class="muted small">提交版本只读</span>
      </div>
      <n-alert v-if="owner" type="info" :show-icon="false"
        >此处查阅待提交材料或正式提交版本。资料编制与修改在审核工作台完成；正式提交后形成独立版本。</n-alert
      >
      <component
        :is="components[section]"
        :key="section + '-' + versionNumber + '-' + flow.status"
      />
      <div class="oa-bottom">
        <span class="muted small">{{
          versionNumber ? "当前查看提交时的固定数据" : "待提交材料 · 请核对后正式提交"
        }}</span
        ><n-button type="primary" @click="tab = 'submit'"
          >核对数据并进入提交</n-button
        >
      </div>
    </template>
    <template v-else-if="tab === 'submit'">
      <section class="section-card">
        <div class="section-heading">
          <h3><Icon name="chart" /> 本次填报概况</h3>
          <span class="muted small">{{
            versionNumber ? "V" + versionNumber + " 提交快照" : "当前草稿"
          }}</span>
        </div>
        <div class="section-body">
          <div class="oa-overview">
            <div>
              <span>产品产量</span
              ><strong
                >{{ Number(metrics.production).toLocaleString() }}
                <small>t/a</small></strong
              >
            </div>
            <div>
              <span>单位产品综合能耗</span
              ><strong>{{ metrics.energy }} <small>tce/t</small></strong>
            </div>
            <div>
              <span>单位产品新鲜水耗</span
              ><strong>{{ metrics.water }} <small>m³/t</small></strong>
            </div>
            <div>
              <span>本轮企业自评水平</span
            ><strong class="oa-level">{{ metrics.level }}</strong>
            </div>
          </div>
          <h4 style="margin: 20px 0 12px">填报完整性检查与核对建议</h4>
          <DataTable
            :rows="checks"
            :columns="[
              { field: 'section', title: '模块', width: 185 },
              { field: 'field', title: '核对内容', minWidth: 205 },
              { field: 'result', title: '填写情况', width: 120 },
              { field: 'advice', title: '核对建议', minWidth: 360 },
            ]"
            ><template #result="{ row }"
              ><span :class="['status-pill', { warning: !row.ok }]">{{
                row.result
              }}</span></template
            ></DataTable
          >
          <p class="muted small" style="margin-top: 12px">
            此检查核对填写完整性，不替代标准评价。企业自评水平与原始数据由接收单位结合现场情况审核。
          </p>
        </div>
      </section>
      <section v-if="reviewVersion" class="section-card">
        <div class="section-heading">
          <h3>
            <Icon name="file" /> V{{ reviewVersion.number }} ·
            审核意见与现场考察
          </h3>
          <n-button
            v-if="
              reviewer &&
              current &&
              ['reviewing', 'site_visit'].includes(flow.status)
            "
            size="small"
            type="primary"
            secondary
            @click="openAction('comment')"
            >新增审核意见</n-button
          >
        </div>
        <div class="section-body stack">
          <DataTable
            :rows="reviewVersion.comments"
            :columns="[
              { field: 'section', title: '所属模块', width: 175 },
              { field: 'field', title: '数据项', minWidth: 170 },
              { field: 'severity', title: '意见类别', width: 105 },
              { field: 'content', title: '审核意见与建议', minWidth: 330 },
              { field: 'author', title: '提出单位', minWidth: 230 },
            ]"
            ><template #severity="{ row }"
              ><span class="status-pill warning">{{
                row.severity
              }}</span></template
            ></DataTable
          >
          <p v-if="!reviewVersion.comments.length" class="muted small">
            尚未填写审核意见。
          </p>
          <div v-if="reviewVersion.visit" class="visit-record">
            <h4><Icon name="calendar" :size="16" /> 现场考察记录</h4>
            <div class="assessment-meta">
              <div>
                <span>考察日期</span
                ><strong>{{ reviewVersion.visit.date }}</strong>
              </div>
              <div>
                <span>考察地点</span
                ><strong>{{ reviewVersion.visit.location }}</strong>
              </div>
              <div>
                <span>考察人员及单位</span
                ><strong>{{ reviewVersion.visit.people }}</strong>
              </div>
            </div>
            <p>核查重点：{{ reviewVersion.visit.scope || "—" }}</p>
            <p>
              现场情况及整改要求：{{
                reviewVersion.visit.findings || "待现场考察后填写"
              }}
            </p>
            <p v-if="reviewVersion.visit.completedAt" class="muted small">
              记录时间：{{ reviewVersion.visit.completedAt }}
            </p>
          </div>
          <div v-else class="section-note">
            本版本尚未安排现场考察。历次考察记录可通过右上方版本选择查看。
          </div>
          <div v-if="reviewVersion.decision" class="section-note">
            办理结论：{{ reviewVersion.decision }}
          </div>
          <template v-if="responseRows.length"
            ><h4>本版本对上次意见的修订回复</h4>
            <DataTable
              :rows="responseRows"
              :columns="[
                { field: 'section', title: '模块', width: 170 },
                { field: 'field', title: '数据项', minWidth: 170 },
                { field: 'content', title: '原审核意见', minWidth: 270 },
                { field: 'response', title: '企业修订回复', minWidth: 300 },
              ]"
            />
            <p class="section-note">
              修订说明：{{ reviewVersion.revisionNote }}
            </p></template
          >
        </div>
      </section>
      <section
        v-if="owner && flow.status === 'revising' && !versionNumber"
        class="section-card"
      >
        <div class="section-heading">
          <h3>企业修订回复</h3>
          <span class="muted small"
            >请先修改填报数据，再逐项说明修改位置与内容</span
          >
        </div>
        <div class="section-body stack">
          <div v-for="c in last.comments" :key="c.id" class="oa-response">
            <label>{{ c.section }} / {{ c.field }}</label>
            <p>{{ c.content }}</p>
            <n-input
              v-model:value="flow.responses[c.id]"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 5 }"
              :placeholder="'回复：' + c.field"
            />
          </div>
          <n-form-item label="本次修订说明" required
            ><n-input
              v-model:value="flow.revisionNote"
              type="textarea"
              placeholder="说明本次修改内容、依据文件以及现场问题落实情况"
              :autosize="{ minRows: 3, maxRows: 7 }"
          /></n-form-item>
        </div>
      </section>
      <section v-if="current" class="section-card">
        <div class="section-heading">
          <h3>办理操作</h3>
          <span class="muted small">{{
            owner ? "企业端" : reviewer ? "接收单位" : "辖区查看"
          }}</span>
        </div>
        <div class="section-body">
          <template v-if="owner && canEdit && !versionNumber"
            ><n-checkbox v-model:checked="accepted"
              >已核对本次填报内容、统计口径及引用资料，确认提交当前草稿。</n-checkbox
            >
            <div class="modal-actions">
              <n-button @click="router.push('/app/audit-workbench')">返回审核工作台</n-button>
              <n-button @click="synchronize">更新待提交材料</n-button
              ><n-button
                type="primary"
                :disabled="checks.some((c) => c.blocking && !c.ok)"
                @click="send"
                >{{
                  flow.status === "revising" ? "修订后再次提交" : "提交上级审核"
                }}</n-button
              >
            </div></template
          >
          <div v-else-if="owner && flow.status === 'returned'" class="between">
            <p>
              已收到审核意见及现场考察反馈，请修订四部分填报数据并逐条回复。
            </p>
            <n-button type="primary" @click="revise">开始修订</n-button>
          </div>
          <div v-else-if="reviewer" class="row wrap">
            <n-button
              v-if="flow.status === 'submitted'"
              type="primary"
              @click="
                run(() => startReview(entity, session.user), '已受理，开始审核')
              "
              >受理并开始审核</n-button
            ><template v-if="flow.status === 'reviewing'"
              ><n-button @click="tab = 'fill'">查看填报数据</n-button
              ><n-button type="primary" @click="openAction('visit')"
                >安排现场考察</n-button
              ><n-button
                v-if="flow.versions.some((v) => v.visit?.completedAt)"
                type="success"
                @click="openAction('approve')"
                >批准填报数据</n-button
              ></template
            ><n-button
              v-if="flow.status === 'site_visit'"
              type="primary"
              @click="openAction('return')"
              >记录考察并退回修订</n-button
            ><span
              v-if="['returned', 'revising'].includes(flow.status)"
              class="muted"
              >等待企业修改并再次提交。</span
            ><span v-if="flow.status === 'approved'" class="muted"
              >填报数据已获批，后续方案报备与验收在“方案与验收办理”中进行。</span
            >
          </div>
          <p v-else class="muted">
            {{
              flow.status === "approved"
                ? "填报数据已获批，可进入方案优化与实施。"
                : owner
                  ? "已提交接收单位，等待审核反馈。"
                  : "当前账号可查看辖区办理情况，审核由本次接收单位办理。"
            }}
          </p>
        </div>
      </section>
      <section class="section-card">
        <div class="section-heading">
          <h3><Icon name="clock" /> 提交与办理记录</h3>
          <span class="muted small"
            >已提交 {{ flow.versions.length }} 个版本</span
          >
        </div>
        <div class="section-body">
          <DataTable
            :rows="flow.events"
            :columns="[
              { field: 'at', title: '时间', width: 185 },
              { field: 'actor', title: '办理单位', minWidth: 235 },
              { field: 'action', title: '操作', width: 190 },
              { field: 'note', title: '办理说明', minWidth: 320 },
            ]"
          />
        </div>
      </section>
    </template>
    <div v-else-if="dataApproved(entity)" class="stack">
      <PlanSubmission v-if="owner" :data="entity" />
      <DeliveryReview :data="entity" />
    </div>
    <EvidenceDrawer
      v-model:show="evidence.show"
      :source="evidence.source"
      :page="evidence.page"
      :documents="data.documents"
    />
    <RecordEditor
      v-model:show="modal"
      :title="titles[action]"
      :record="record"
      :fields="fields"
      @save="saveAction"
    />
  </div>
  <section v-else class="section-card">
    <div class="section-body">
      <n-empty description="该企业尚未提交审核数据" />
      <div class="modal-actions">
        <n-button @click="router.push('/app/oa')">返回收件列表</n-button>
      </div>
    </div>
  </section>
</template>
