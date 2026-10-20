<script setup>
import { inject, ref, computed } from "vue";
import { useMessage, useDialog } from "naive-ui";
import {
  documentTypes,
  documentGroups,
  years,
  surveyTemplates,
} from "../data/domain";
import { uid } from "../data/store";
import { deliveryFileReferenced } from "../data/deliveryWorkflow";
import {
  saveFile,
  getFile,
  removeFile,
  downloadBlob,
  downloadText,
} from "../services/files";
import Icon from "../components/Icon.vue";
import DataTable from "../components/DataTable.vue";
import RecordEditor from "../components/RecordEditor.vue";
const props = defineProps({ dataCenter: Boolean });
const { data, round, readOnly, showEvidence, sourceDocuments } = inject("audit"),
  message = useMessage(),
  dialog = useDialog();
const year = ref(round.value === 3 ? 2026 : round.value === 2 ? 2023 : 2020),
  category = ref("生产年报（原辅材料情况）"),
  fileInput = ref(null),
  dragging = ref(false),
  uploading = ref(false),
  filter = ref(null),
  query = ref(""),
  view = ref(props.dataCenter ? "checklist" : "files"),
  prompt = ref(
    "请按照适用的清洁生产审核标准，整理本年度产品产量、原辅材料、能源和用水数据。逐项标明单位、统计口径、来源文件及页码，缺失项请单独列出。",
  ),
  prepared = ref(false),
  standard = ref(null),
  reportModal = ref(false),
  reportText = ref(""),
  editing = ref(false),
  record = ref({});
const rows = computed(() =>
  data.value.documents.filter(
    (d) =>
      d.year === year.value &&
      (!filter.value || d.category === filter.value) &&
      d.name.includes(query.value),
  ),
);
const standards = computed(() =>
  data.value.documents
    .filter((d) => d.category.includes("标准") || d.category.includes("规范"))
    .map((d) => ({ label: d.name, value: d.id })),
);
const grouped = computed(() =>
  documentGroups.map((g) => ({
    ...g,
    items: g.items.map((name) => ({
      name,
      count: data.value.documents.filter(
        (d) => d.category === name && d.year === year.value,
      ).length,
    })),
  })),
);
async function upload(files) {
  if (readOnly.value) return;
  uploading.value = true;
  let count = 0;
  for (const file of Array.from(files)) {
    if (!/\.(pdf|docx?|xlsx?|csv|txt|png|jpg|jpeg|webp)$/i.test(file.name)) {
      message.warning(`${file.name}：暂不支持此格式`);
      continue;
    }
    if (file.size > 50 * 1024 * 1024) {
      message.warning(`${file.name} 超过 50 MB`);
      continue;
    }
    const id = uid();
    try {
      await saveFile(id, file);
      data.value.documents.unshift({
        id,
        name: file.name,
        category: category.value,
        year: year.value,
        size: file.size,
        date: new Date().toLocaleDateString("zh-CN"),
        status: "已归集 · 待核实",
      });
      count++;
    } catch (error) {
      message.error("文件保存失败，请检查本地存储空间");
    }
  }
  uploading.value = false;
  if (count) message.success(`已保存 ${count} 份原始文件至本机`);
  if (fileInput.value) fileInput.value.value = "";
}
function drop(event) {
  dragging.value = false;
  upload(event.dataTransfer.files);
}
async function download(row) {
  try {
    const f = await getFile(row.id);
    if (!f) return message.warning("原文件未找到");
    downloadBlob(row.name, f);
  } catch (e) {
    message.error("文件读取失败");
  }
}
function remove(row) {
  if (data.value.documents !== data.value.auditWorkspace?.documents && data.value.auditWorkspace?.documents.some((file) => file.id === row.id))
    return message.warning("该原件已被审核工作台引用，请保留以供追溯。");
  if (sourceDocuments?.value.some((file) => file.id === row.id))
    return message.warning("该原件由企业数据中心维护，请在企业数据中心管理。");
  if (deliveryFileReferenced(data.value, row.id))
    return message.warning(
      "该原件已被方案、专家意见、实施或验收记录引用，请保留以供追溯。",
    );
  if (
    data.value.oaWorkflow.versions.some((v) =>
      v.snapshot.documents.some((d) => d.id === row.id),
    ) ||
    data.value.reports.some((r) => r.fileId === row.id)
  )
    return message.warning("该原件已关联报告或提交版本，请保留以供追溯。");
  dialog.warning({
    title: "删除资料",
    content: `确认删除“${row.name}”及本地原文件？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: async () => {
      try {
        await removeFile(row.id);
        data.value.documents = data.value.documents.filter(
          (d) => d.id !== row.id,
        );
        message.success("已删除");
      } catch (e) {
        message.error("删除失败，请重试");
      }
    },
  });
}
function prepare() {
  if (!rows.value.length) return message.warning("请先上传当前年度的原始资料");
  if (!prompt.value.trim()) return message.warning("请填写识别提示词");
  prepared.value = true;
  data.value.recognitionDraft = {
    year: year.value,
    standard: standard.value,
    prompt: prompt.value,
    files: rows.value.map((r) => r.id),
  };
  message.info("识别任务草稿已保存；模型服务尚未接入，未执行文档识别");
}
async function saveBrief() {
  if (!reportText.value.trim()) return message.warning("请填写企业简易汇报");
  const file = new File(
    [reportText.value],
    `${data.value.info.name}_${year.value}年公司简易汇报.txt`,
    { type: "text/plain" },
  );
  const old = category.value;
  category.value = "公司简易汇报";
  await upload([file]);
  category.value = old;
  reportModal.value = false;
}
function saveMeta(form) {
  const row = data.value.documents.find((r) => r.id === form.id);
  Object.assign(row, form);
  message.success("资料信息已保存");
}
function checklist() {
  downloadText(
    `${year.value}年度资料清单.txt`,
    documentGroups
      .map((g) => g.name + "\n" + g.items.map((i) => "□ " + i).join("\n"))
      .join("\n\n"),
  );
}
</script>
<template>
  <div class="stack">
    <section class="section-card">
      <div class="section-heading">
        <h3><Icon name="folder" /> {{ dataCenter ? '企业资料清单' : '企业相关资料报告' }}</h3>
        <div class="row">
          <span class="muted small">按资料年度归集</span
          ><n-select
            v-model:value="year"
            :options="years.map((y) => ({ label: y + ' 年', value: y }))"
            style="width: 120px"
            aria-label="资料年度"
          />
        </div>
      </div>
      <div class="section-body">
        <template v-if="!readOnly && (!dataCenter || view === 'files')"
          ><div class="toolbar">
            <span class="field-label">上传归类</span
            ><n-select
              v-model:value="category"
              :options="documentTypes"
              filterable
              style="width: 360px"
            />
            <div class="spacer"></div>
            <n-button size="small" @click="reportModal = true"
              >填写公司简易汇报</n-button
            ><n-button size="small" @click="checklist">下载资料清单</n-button>
          </div>
          <div
            :class="['document-drop', { dragging }]"
            @dragover.prevent="dragging = true"
            @dragleave.prevent="dragging = false"
            @drop.prevent="drop"
            role="button"
            tabindex="0"
            @keydown.enter="fileInput.click()"
            @keydown.space.prevent="fileInput.click()"
            @click="fileInput.click()"
          >
            <span class="upload-glyph"><Icon name="upload" :size="29" /></span>
            <h3>
              {{
                uploading
                  ? "正在保存文件…"
                  : "将原始文档拖到这里，或点击选择文件"
              }}
            </h3>
            <p>
              PDF、Word、Excel、图片及文本 · 单个文件不超过 50 MB · 支持多文件
            </p>
            <span>当前归入 {{ year }} 年 / {{ category }}</span>
          </div>
          <input
            ref="fileInput"
            type="file"
            multiple
            hidden
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp"
            @change="upload($event.target.files)"
          />
          <div class="recognition-composer">
            <div class="between">
              <strong><Icon name="chat" :size="15" /> 文档识别提示</strong
              ><span class="muted small">DeepSeek Harness · 服务待接入</span>
            </div>
            <n-input
              v-model:value="prompt"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 5 }"
              placeholder="说明审核标准、年度、统计边界和需要提取的字段…"
              style="margin: 12px 0"
            />
            <div class="row wrap">
              <span class="muted small">适用标准</span
              ><n-select
                v-model:value="standard"
                :options="standards"
                clearable
                placeholder="选择已上传的行业标准"
                style="width: 300px"
              />
              <div class="spacer"></div>
              <n-button @click="prepare" type="primary" secondary size="small"
                >准备识别任务</n-button
              >
            </div>
          </div>
          <div v-if="prepared" class="recognition-result">
            <n-alert type="info" :show-icon="false"
              >任务草稿已保存。当前仅生成字段核对清单，尚未读取原文或生成识别结果。{{
                standard
                  ? "已选择标准文件，具体指标需后端解析。"
                  : "尚未关联适用标准，正式识别前请补充。"
              }}</n-alert
            >
            <div class="requirement-grid">
              <div v-for="t in Object.values(surveyTemplates)" :key="t.name">
                <strong>{{ t.name }}</strong>
                <p>{{ t.quantity }} · {{ t.unit }} · 来源页码</p>
              </div>
            </div>
          </div></template
        >
        <div class="tabs-strip">
          <button v-if="dataCenter" :class="{ active: view === 'checklist' }" @click="view = 'checklist'">
            资料分类清单 <span class="muted">{{ documentTypes.length }} 类</span>
          </button>
          <button :class="{ active: view === 'files' }" @click="view = 'files'">
            已上传资料 <span class="muted">{{ rows.length }}</span></button
          ><button
            v-if="!dataCenter"
            :class="{ active: view === 'checklist' }"
            @click="view = 'checklist'"
          >
            完整资料清单
            <span class="muted">{{ documentTypes.length }} 类</span>
          </button>
        </div>
        <p v-if="dataCenter && view === 'checklist'" class="data-center-hint">
          点击资料项查看或上传。周期报告按所属年度归集，证照与基础资料按变更更新；历史文件保留，供本轮审核引用。
        </p>
        <template v-if="view === 'files'"
          ><div class="toolbar">
            <n-input
              v-model:value="query"
              placeholder="搜索文件名称"
              clearable
              style="width: 240px"
              ><template #prefix
                ><Icon name="search" :size="15" /></template></n-input
            ><n-select
              v-model:value="filter"
              :options="documentTypes"
              clearable
              filterable
              placeholder="全部资料类别"
              style="width: 320px"
            />
            <div class="spacer"></div>
            <span class="muted small">原件保存在本机浏览器</span>
          </div>
          <DataTable
            :rows="rows"
            :columns="[
              { field: 'name', title: '文件名称', minWidth: 260 },
              { field: 'category', title: '资料类别', minWidth: 240 },
              { field: 'year', title: '年度', width: 80 },
              { field: 'status', title: '状态', width: 155 },
              { field: 'action', title: '操作', width: 200 },
            ]"
            ><template #name="{ row }"
              ><span class="row"
                ><Icon name="file" :size="16" />{{ row.name }}</span
              ></template
            ><template #action="{ row }"
              ><button class="link-button" @click="showEvidence(row.name, 1)">
                查看</button
              ><button class="link-button" @click="download(row)">下载</button
              ><template v-if="!readOnly"
                ><button
                  class="link-button"
                  @click="
                    record = { ...row };
                    editing = true;
                  "
                >
                  编辑</button
                ><button class="link-button danger" @click="remove(row)">
                  删除
                </button></template
              ></template
            ></DataTable
          >
          <p class="muted small" style="margin-top: 15px">
            原始报告、固废台账按年度分别上传；季报请在文件名中注明季度。人员名单需包含姓名、职务及组内职责。
          </p></template
        >
        <div v-else class="document-checklist">
          <section v-for="g in grouped" :key="g.name">
            <h4>{{ g.name }}</h4>
            <button
              v-for="item in g.items"
              :key="item.name"
              :title="'查看或上传：' + item.name"
              @click="
                category = item.name;
                filter = item.name;
                view = 'files';
              "
            >
              <Icon :name="item.count ? 'check' : 'file'" :size="15" /><span>{{
                item.name
              }}</span
              ><small :class="{ received: item.count }">{{
                item.count ? item.count + " 份" : "待上传"
              }}</small>
            </button>
          </section>
        </div>
      </div>
    </section>
    <RecordEditor
      v-model:show="editing"
      title="编辑资料归属"
      :record="record"
      :fields="[
        { key: 'name', label: '文件名称', required: true, wide: true },
        {
          key: 'category',
          label: '资料类别',
          options: documentTypes,
          required: true,
          wide: true,
        },
        {
          key: 'year',
          label: '资料年度',
          options: years.map((y) => ({ label: y + ' 年', value: y })),
        },
      ]"
      @save="saveMeta"
    /><n-modal
      v-model:show="reportModal"
      preset="card"
      title="公司简易汇报 · 由企业负责人填写"
      style="width: 720px; max-width: 94vw"
      ><p class="muted" style="margin-bottom: 15px">
        说明企业基本情况、主要产品、生产规模、环保管理及本轮审核工作安排。
      </p>
      <n-input
        v-model:value="reportText"
        type="textarea"
        :autosize="{ minRows: 12 }"
        placeholder="请企业负责人根据实际情况填写…"
      />
      <div class="modal-actions">
        <n-button @click="reportModal = false">取消</n-button
        ><n-button type="primary" @click="saveBrief">保存为资料文件</n-button>
      </div></n-modal
    >
  </div>
</template>
<style scoped>
.document-drop {
  border: 1px dashed #b8c9d8;
  border-radius: 5px;
  text-align: center;
  padding: 25px 20px 20px;
  background: #fafcfe;
  cursor: pointer;
  transition: background 0.15s;
}
.document-drop:hover,
.document-drop.dragging {
  border-color: #409eff;
  background: #f0f7ff;
}
.upload-glyph {
  color: #6c94b7;
  display: block;
  margin-bottom: 9px;
}
.document-drop h3 {
  font-weight: 400;
  font-size: 15px;
  color: #4e6479;
}
.document-drop p {
  color: #909399;
  font-size: 12px;
  margin-top: 8px;
}
.document-drop > span:last-child {
  display: block;
  font-size: 11px;
  color: #a2adb7;
  margin-top: 12px;
}
.recognition-composer {
  border: 1px solid #e4e7ed;
  background: white;
  border-radius: 5px;
  padding: 16px;
  margin-top: 14px;
}
.recognition-composer strong {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}
.recognition-result {
  margin-top: 15px;
}
.requirement-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}
.requirement-grid > div {
  background: #f5f7fa;
  padding: 12px;
  flex: 1;
  min-width: 150px;
}
.requirement-grid strong {
  font-size: 12px;
  font-weight: 500;
}
.requirement-grid p {
  font-size: 11px;
  color: #909399;
  margin-top: 5px;
}
.document-checklist {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.data-center-hint { margin: 0 0 20px; color: #909399; font-size: 12px; line-height: 1.7; }
.document-checklist section {
  border: 1px solid #ebeef5;
  border-radius: 4px;
}
.document-checklist h4 {
  padding: 12px 16px;
  background: #f5f7fa;
  font-size: 13px;
}
.document-checklist button {
  padding: 11px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  border-top: 1px solid #f0f2f5;
  background: white;
  text-align: left;
  width: 100%;
  color: #606266;
  font-size: 12px;
}
.document-checklist button:hover {
  background: #f5faff;
}
.document-checklist small {
  margin-left: auto;
  white-space: nowrap;
  color: #b2b5bb;
}
.document-checklist small.received {
  color: #67a247;
}
.document-checklist button > svg {
  color: #9eafbf;
}
@media (max-width: 800px) {
  .document-checklist {
    grid-template-columns: 1fr;
  }
}
</style>
