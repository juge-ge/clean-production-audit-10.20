<script setup>
import { randomId } from "../services/id.js";

import { ref, computed, nextTick } from "vue";
import { useMessage, useDialog } from "naive-ui";
import { db, session } from "../data/store";
import { experts } from "../data/experts";
import { clone } from "../data/deliveryWorkflow";
import {
  indicatorTemplate,
  surveyLabels,
  ensureQuestionnaires,
  visibleSurveys,
  managesSurvey,
  saveSurvey,
  issueSurvey,
  recordResponse,
  scoringResults,
  closeSurvey,
  adoptWeights,
} from "../data/questionnaires";
import { documentHtml, csv } from "../services/industryExport";
import { downloadText } from "../services/files";
import DataTable from "../components/DataTable.vue";
import Icon from "../components/Icon.vue";
ensureQuestionnaires(db, session.user);
const message = useMessage(),
  dialog = useDialog(),
  search = ref(""),
  tab = ref("content"),
  editor = ref(false),
  form = ref({}),
  expertIds = ref([]),
  responseModal = ref(false),
  expertId = ref(null),
  scores = ref([]),
  detailElement = ref(null);
const surveys = computed(() =>
  visibleSurveys(db, session.user).filter((s) =>
    (s.title + s.industry + s.ownerName).includes(search.value),
  ),
);
const selected = ref(
  surveys.value.find((s) => s.owner === session.user.username)?.id ||
    surveys.value[0]?.id,
);
const current = computed(() =>
  visibleSurveys(db, session.user).find((s) => s.id === selected.value),
);
const managed = computed(
  () => current.value && managesSurvey(current.value, session.user),
);
const results = computed(() =>
  current.value ? scoringResults(current.value) : [],
);
const collected = computed(() => current.value?.responses.length || 0);
const responseRows = computed(
  () =>
    current.value?.experts.map((e) => {
      const r = current.value.responses.find((x) => x.expertId === e.id);
      return {
        ...e,
        response: r,
        status: r ? "已回收" : "待回收",
        at: r?.at || "—",
        average: r
          ? Number(
              (
                r.scores.reduce((sum, x) => sum + x.score, 0) / r.scores.length
              ).toFixed(2),
            )
          : "—",
      };
    }) || [],
);
const resultCols = [
  { field: "name", title: "评价指标", minWidth: 220 },
  { field: "weight", title: "初拟权重（%）", width: 145 },
  { field: "count", title: "有效评分数", width: 125 },
  { field: "average", title: "专家平均分", width: 135 },
  { field: "min", title: "最低分", width: 100 },
  { field: "max", title: "最高分", width: 100 },
  { field: "suggested", title: "建议权重（%）", width: 145 },
];
const totalWeight = computed(
  () =>
    form.value.indicators?.reduce((s, x) => s + Number(x.weight || 0), 0) || 0,
);
function run(fn, text) {
  try {
    const r = fn();
    if (text) message.success(text);
    return r ?? true;
  } catch (e) {
    message.warning(e.message);
    return false;
  }
}
function edit(s) {
  form.value = s
    ? clone(s)
    : {
        title: "",
        industry: "白酒制造",
        deadline: "2026-11-30",
        description:
          "请评价指标的行业适用性、可核查性与重要性，每项 0—100 分，并提出完善建议。",
        indicators: clone(indicatorTemplate),
        experts: [],
      };
  expertIds.value = s
    ? s.experts.map((e) => e.id)
    : experts.slice(0, 3).map((e) => e.id);
  editor.value = true;
}
function save() {
  form.value.experts = experts.filter((e) => expertIds.value.includes(e.id));
  const result = run(
    () => saveSurvey(db, session.user, form.value),
    "问卷草稿已保存",
  );
  if (result) {
    selected.value = result.id;
    tab.value = "content";
    editor.value = false;
  }
}
function issue() {
  run(
    () => issueSurvey(current.value, session.user),
    "已在本机模拟发放，等待录入专家回收结果",
  );
}
async function choose(s) {
  selected.value = s.id;
  tab.value = "content";
  await nextTick();
  detailElement.value?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function loadScores() {
  const r = current.value.responses.find((r) => r.expertId === expertId.value);
  scores.value = current.value.indicators.map((x) => ({
    indicatorId: x.id,
    name: x.name,
    criterion: x.criterion,
    score: r?.scores.find((v) => v.indicatorId === x.id)?.score ?? null,
    comment: r?.scores.find((v) => v.indicatorId === x.id)?.comment || "",
  }));
}
function openResponse(e) {
  expertId.value =
    e?.id ||
    current.value.experts.find(
      (e) => !current.value.responses.some((r) => r.expertId === e.id),
    )?.id ||
    current.value.experts[0].id;
  loadScores();
  responseModal.value = true;
}
function saveResponse() {
  if (
    run(
      () =>
        recordResponse(
          current.value,
          session.user,
          expertId.value,
          scores.value,
        ),
      "专家回收结果已保存",
    )
  )
    responseModal.value = false;
}
function close() {
  dialog.info({
    title: "结束问卷回收",
    content: `已回收 ${collected.value} / ${current.value.experts.length} 份。结束后本轮评分只读，未回收专家不计入平均分。`,
    positiveText: "确认结束回收",
    negativeText: "继续回收",
    onPositiveClick: () =>
      run(() => closeSurvey(current.value, session.user), "回收已结束"),
  });
}
function downloadQuestionnaire() {
  const s = current.value;
  const html = documentHtml(
    s.title,
    `${s.ownerName}；行业：${s.industry}；截止：${s.deadline}。${s.description}。本文件为本机前端演示问卷。`,
    [
      {
        title: "专家标准评分问卷 · 每项 0—100 分",
        columns: [
          { field: "name", title: "指标" },
          { field: "criterion", title: "评分说明" },
          { field: "weight", title: "初拟权重（%）" },
          { field: "score", title: "专家评分" },
          { field: "comment", title: "专家建议" },
        ],
        rows: s.indicators.map((x) => ({ ...x, score: "", comment: "" })),
      },
    ],
  );
  downloadText(s.title + ".html", html, "text/html;charset=utf-8");
}
</script>
<template>
  <div class="stack industry-page">
    <div class="between">
      <div>
        <h1 class="page-title">行业清洁生产指标</h1>
        <p class="page-description">调查问卷 · 专家标准评分 · 指标权重建议</p>
      </div>
      <n-button type="primary" @click="edit()"
        ><Icon name="plus" :size="15" /> 新建专家问卷</n-button
      >
    </div>
    <div class="industry-metrics">
      <div>
        <span>当前辖区问卷</span
        ><strong>{{ surveys.length }} <small>份</small></strong>
      </div>
      <div>
        <span>回收中</span
        ><strong
          >{{ surveys.filter((s) => s.status === "issued").length }}
          <small>份</small></strong
        >
      </div>
      <div>
        <span>已形成权重建议</span
        ><strong
          >{{ surveys.filter((s) => s.adoptedWeights).length }}
          <small>份</small></strong
        >
      </div>
    </div>
    <section class="section-card">
      <div class="section-heading">
        <h3>调查问卷管理</h3>
        <span class="muted small">本机模拟发放与代录回收</span>
      </div>
      <div class="section-body stack">
        <n-input
          v-model:value="search"
          placeholder="搜索问卷名称、行业或发起单位"
          clearable
          style="max-width: 400px"
        /><DataTable
          :rows="surveys"
          :columns="[
            { field: 'title', title: '问卷名称', minWidth: 340 },
            { field: 'ownerName', title: '发起单位', minWidth: 240 },
            { field: 'status', title: '状态', width: 190 },
            { field: 'deadline', title: '回收截止日期', width: 145 },
            { field: 'received', title: '回收份数', width: 110 },
            { field: 'action', title: '操作', width: 120, fixed: 'right' },
          ]"
          ><template #status="{ row }"
            ><span
              class="status-pill"
              :class="{ warning: row.status === 'issued' }"
              >{{ surveyLabels[row.status] }}</span
            ></template
          ><template #received="{ row }"
            >{{ row.responses.length }} / {{ row.experts.length }}</template
          ><template #action="{ row }"
            ><button class="link-button" @click="choose(row)">
              查看问卷
            </button></template
          ></DataTable
        >
        <p class="section-note">
          发放仅在本机生成状态和专家名单，不会发送邮件或消息。评分由发起单位代录，题目和专家名单在发放后固定。下级可管理自己发起的问卷，上级可查看辖区问卷。
        </p>
      </div>
    </section>
    <section
      v-if="current"
      ref="detailElement"
      class="section-card survey-detail"
    >
      <div class="section-heading">
        <h3>{{ current.title }}</h3>
        <span class="status-pill">{{ surveyLabels[current.status] }}</span>
      </div>
      <div class="section-body stack">
        <div class="assessment-meta">
          <div>
            <span>发起单位</span><strong>{{ current.ownerName }}</strong>
          </div>
          <div>
            <span>行业 / 截止日期</span
            ><strong>{{ current.industry }} / {{ current.deadline }}</strong>
          </div>
          <div>
            <span>有效回收</span
            ><strong
              >{{ collected }} / {{ current.experts.length }} 位专家</strong
            >
          </div>
        </div>
        <div class="row wrap">
          <n-button @click="downloadQuestionnaire">下载调查问卷</n-button
          ><n-button
            v-if="managed && current.status === 'draft'"
            @click="edit(current)"
            >编辑问卷</n-button
          ><n-button
            v-if="managed && current.status === 'draft'"
            type="primary"
            @click="issue"
            >模拟发放问卷</n-button
          ><template v-if="managed && current.status === 'issued'"
            ><n-button type="primary" @click="openResponse()"
              >录入专家回收</n-button
            ><n-button @click="close">结束本轮回收</n-button></template
          >
        </div>
        <div class="tabs-strip">
          <button
            v-for="t in [
              { id: 'content', name: '问卷内容与评分标准' },
              { id: 'responses', name: '专家发放与回收' },
              { id: 'results', name: '评分汇总与权重建议' },
            ]"
            :key="t.id"
            :class="{ active: tab === t.id }"
            @click="tab = t.id"
          >
            {{ t.name }}
          </button>
        </div>
        <template v-if="tab === 'content'"
          ><p>{{ current.description }}</p>
          <DataTable
            :rows="current.indicators"
            :columns="[
              { field: 'name', title: '指标名称', minWidth: 230 },
              { field: 'criterion', title: '标准评分说明', minWidth: 430 },
              { field: 'weight', title: '初拟权重（%）', width: 150 },
            ]"
        /></template>
        <DataTable
          v-else-if="tab === 'responses'"
          :rows="responseRows"
          :columns="[
            { field: 'name', title: '专家姓名', width: 110 },
            { field: 'organization', title: '单位', minWidth: 250 },
            { field: 'specialty', title: '专业方向', width: 145 },
            { field: 'status', title: '回收状态', width: 120 },
            { field: 'average', title: '平均评分', width: 120 },
            { field: 'at', title: '回收时间', width: 190 },
            { field: 'action', title: '操作', width: 125, fixed: 'right' },
          ]"
          ><template #action="{ row }"
            ><button class="link-button" @click="openResponse(row)">
              {{
                managed && current.status === "issued"
                  ? row.response
                    ? "修改回收"
                    : "录入回收"
                  : "查看评分"
              }}
            </button></template
          ></DataTable
        >
        <template v-else
          ><div class="between">
            <p class="muted small">
              按有效专家评分计算平均值；建议权重 = 各项平均分 /
              平均分之和。未回收不计零分，末项校正至合计 100%。
            </p>
            <n-button
              size="small"
              @click="csv(current.title + '评分汇总', resultCols, results)"
              >导出评分汇总</n-button
            >
          </div>
          <DataTable :rows="results" :columns="resultCols" />
          <div v-if="current.adoptedWeights" class="section-note">
            已保存本轮建议权重：{{
              current.adoptedWeights
                .map((x) => x.name + " " + x.weight + "%")
                .join("；")
            }}。仅作指标草案，尚未发布正式标准。
          </div>
          <div v-else class="modal-actions">
            <n-button
              v-if="managed"
              type="primary"
              :disabled="current.status !== 'closed'"
              @click="
                run(
                  () => adoptWeights(current, session.user),
                  '已保存专家建议权重至本轮指标草案',
                )
              "
              >采用专家建议权重</n-button
            >
          </div>
          <p class="muted small">
            此处评价指标体系的适用性与重要性，不是企业达标评分。正式标准及指标阈值须另行确定。
          </p></template
        >
      </div>
    </section>
    <n-modal
      v-model:show="editor"
      preset="card"
      title="设置专家标准评分问卷"
      style="width: 1100px; max-width: 95vw"
      ><n-form class="form-grid" label-placement="top"
        ><n-form-item label="问卷名称" required class="wide"
          ><n-input
            v-model:value="form.title"
            placeholder="填写专家调查问卷名称" /></n-form-item
        ><n-form-item label="所属行业" required
          ><n-input
            v-model:value="form.industry"
            placeholder="填写所属行业" /></n-form-item
        ><n-form-item label="回收截止日期" required
          ><n-input
            v-model:value="form.deadline"
            placeholder="YYYY-MM-DD" /></n-form-item
        ><n-form-item label="评分目的与填写说明" class="wide"
          ><n-input
            v-model:value="form.description"
            type="textarea" /></n-form-item
        ><n-form-item label="发放专家" required class="wide"
          ><n-select
            v-model:value="expertIds"
            multiple
            :options="
              experts.map((e) => ({
                label: e.name + ' · ' + e.specialty,
                value: e.id,
              }))
            "
            aria-label="选择问卷专家" /></n-form-item
      ></n-form>
      <div class="between" style="margin-bottom: 15px">
        <h4>指标与标准评分说明 · 权重合计 {{ totalWeight }}%</h4>
        <n-button
          size="small"
          @click="
            form.indicators.push({
              id: randomId(),
              name: '',
              criterion: '',
              weight: 0,
            })
          "
          >添加评分指标</n-button
        >
      </div>
      <DataTable
        :rows="form.indicators"
        :columns="[
          { field: 'name', title: '指标名称', minWidth: 200 },
          { field: 'criterion', title: '评分依据 / 说明', minWidth: 350 },
          { field: 'weight', title: '权重（%）', width: 150 },
          { field: 'action', title: '操作', width: 95 },
        ]"
        ><template #name="{ row }"
          ><n-input v-model:value="row.name" placeholder="指标名称" /></template
        ><template #criterion="{ row }"
          ><n-input
            v-model:value="row.criterion"
            placeholder="标准评分依据与说明" /></template
        ><template #weight="{ row }"
          ><n-input-number
            v-model:value="row.weight"
            :min="0"
            :max="100"
            :input-props="{ 'aria-label': row.name + '权重' }" /></template
        ><template #action="{ row }"
          ><button
            class="link-button danger"
            @click="
              form.indicators = form.indicators.filter((x) => x.id !== row.id)
            "
          >
            删除
          </button></template
        ></DataTable
      >
      <div class="modal-actions">
        <n-button @click="editor = false">取消</n-button
        ><n-button type="primary" @click="save">保存问卷草稿</n-button>
      </div></n-modal
    >
    <n-modal
      v-model:show="responseModal"
      preset="card"
      :title="
        managed && current?.status === 'issued'
          ? '代录专家回收评分'
          : '专家回收评分详情'
      "
      style="width: 1050px; max-width: 95vw"
      ><div class="stack">
        <n-select
          v-model:value="expertId"
          :options="
            current?.experts.map((e) => ({
              label: e.name + ' · ' + e.organization,
              value: e.id,
            }))
          "
          aria-label="回收评分专家"
          @update:value="loadScores"
        /><DataTable
          :rows="scores.map((x) => ({ ...x, id: x.indicatorId }))"
          :columns="[
            { field: 'name', title: '指标', minWidth: 220 },
            { field: 'criterion', title: '评分说明', minWidth: 300 },
            { field: 'score', title: '评分（0—100）', width: 165 },
            { field: 'comment', title: '专家建议', minWidth: 260 },
          ]"
          ><template #score="{ row }"
            ><n-input-number
              v-if="managed && current.status === 'issued'"
              v-model:value="
                scores.find((x) => x.indicatorId === row.indicatorId).score
              "
              :min="0"
              :max="100"
              :input-props="{ 'aria-label': row.name + '评分' }"
            /><span v-else>{{ row.score ?? "未回收" }}</span></template
          ><template #comment="{ row }"
            ><n-input
              v-if="managed && current.status === 'issued'"
              v-model:value="
                scores.find((x) => x.indicatorId === row.indicatorId).comment
              "
              placeholder="专家完善建议"
            /><span v-else>{{ row.comment || "—" }}</span></template
          ></DataTable
        >
        <p class="muted small">
          按实际收到的专家意见代录；不代表在线专家签名。未评分项须全部补齐后保存。
        </p>
        <div class="modal-actions">
          <n-button @click="responseModal = false">关闭</n-button
          ><n-button
            v-if="managed && current?.status === 'issued'"
            type="primary"
            @click="saveResponse"
            >保存专家回收评分</n-button
          >
        </div>
      </div></n-modal
    >
  </div>
</template>
