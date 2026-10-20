<script setup>
import { inject, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useDialog, useMessage } from "naive-ui";
import { uid } from "../data/store";
import { getFile, downloadBlob, downloadText } from "../services/files";
import Icon from "../components/Icon.vue";
import DataTable from "../components/DataTable.vue";
import RecordEditor from "../components/RecordEditor.vue";
const { data, round, roundData, readOnly, isOa = false } = inject("audit"),
  router = useRouter(),
  dialog = useDialog(),
  message = useMessage();
const editing = ref(false),
  record = ref({}),
  target = ref("leadership");
const peopleFields = [
  { key: "name", label: "姓名", required: true },
  { key: "position", label: "职务", required: true },
  { key: "department", label: "部门" },
  {
    key: "role",
    label: "组内角色",
    options: ["组长", "副组长", "成员", "联络员"],
  },
  { key: "responsibility", label: "审核职责", wide: true },
];
const planFields = [
  { key: "name", label: "工作内容", required: true, wide: true },
  { key: "owner", label: "责任人", required: true },
  { key: "date", label: "计划完成日期（YYYY-MM-DD）", required: true },
  { key: "status", label: "执行情况", options: ["未开始", "进行中", "已完成"] },
];
const standards = computed(() =>
  data.value.documents.filter((d) =>
    [
      "行业规范条件（国标、地标）",
      "清洁生产行业标准",
      "鼓励标准（产业指导目录、行业发展指南）",
    ].includes(d.category),
  ),
);
function edit(type, row) {
  target.value = type;
  record.value = row
    ? { ...row }
    : { id: uid(), status: "未开始", role: "成员" };
  editing.value = true;
}
function save(form) {
  const list = roundData.value[target.value];
  const index = list.findIndex((r) => r.id === form.id);
  if (index < 0) list.push(form);
  else list[index] = form;
  message.success("已保存");
}
function remove(type, row) {
  dialog.warning({
    title: "删除记录",
    content: `确认删除“${row.name}”？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: () => {
      roundData.value[type] = roundData.value[type].filter(
        (r) => r.id !== row.id,
      );
    },
  });
}
async function download(row) {
  try {
    const f = await getFile(row.id);
    if (!f) return message.warning("原文件不存在，请重新上传");
    downloadBlob(row.name, f);
  } catch (e) {
    message.error("无法读取文件");
  }
}
function downloadChecklist() {
  downloadText(
    "清洁生产标准与宣贯资料清单.txt",
    "清洁生产审核资料准备清单（前端演示）\n请从正式发布渠道获取现行有效文件并上传。\n1. 清洁生产审核管理相关文件\n2. 适用行业清洁生产评价指标体系\n3. 行业规范条件（国标、地标）\n4. 产业指导目录、行业发展指南\n5. 本轮清洁生产审核领导小组、工作小组及工作计划\n文件有效性与适用边界应由审核人员确认。",
  );
}
</script>
<template>
  <div class="stack">
    <section v-if="!isOa" class="section-card">
      <div class="section-heading">
        <h3><Icon name="book" /> 清洁生产标准与宣贯资料</h3>
        <div class="row">
          <n-button size="small" @click="downloadChecklist"
            ><Icon name="download" :size="14" />&nbsp; 下载资料清单</n-button
          ><n-button
            v-if="!readOnly"
            size="small"
            @click="
              router.replace({
                query: { ...router.currentRoute.value.query, p: 'documents' },
              })
            "
            >上传标准文件</n-button
          >
        </div>
      </div>
      <div class="section-body">
        <DataTable
          v-if="standards.length"
          :rows="standards"
          :columns="[
            { field: 'name', title: '文件名称', minWidth: 280 },
            { field: 'category', title: '资料类别', minWidth: 180 },
            { field: 'year', title: '年份', width: 90 },
            { field: 'action', title: '操作', width: 100 },
          ]"
          ><template #action="{ row }"
            ><button class="link-button" @click="download(row)">
              下载文件
            </button></template
          ></DataTable
        >
        <div v-else class="standards-empty">
          <Icon name="book" :size="24" />
          <div>
            <h4>请上传本轮适用的行业标准与宣贯文件</h4>
            <p class="muted">
              归集正式标准原件后可在此下载。当前尚未关联真实标准文件。
            </p>
          </div>
        </div>
      </div>
    </section>
    <section
      class="section-card"
      v-for="group in [
        { key: 'leadership', title: '清洁生产审核领导小组' },
        { key: 'team', title: '清洁生产工作小组' },
      ]"
      :key="group.key"
    >
      <div class="section-heading">
        <h3>
          <Icon name="users" /> 第 {{ round }} 轮 · {{ group.title }}
          <span class="muted small">{{ roundData[group.key].length }} 人</span>
        </h3>
        <n-button
          v-if="!readOnly"
          size="small"
          type="primary"
          secondary
          @click="edit(group.key)"
          ><Icon name="plus" :size="14" />&nbsp; 添加成员</n-button
        >
      </div>
      <div class="section-body">
        <DataTable
          :rows="roundData[group.key]"
          :columns="[
            { field: 'name', title: '姓名', width: 100 },
            { field: 'position', title: '职务', minWidth: 130 },
            { field: 'department', title: '部门', minWidth: 120 },
            { field: 'role', title: '角色', width: 100 },
            { field: 'responsibility', title: '审核职责', minWidth: 250 },
            { field: 'action', title: '操作', width: 120 },
          ]"
          ><template #action="{ row }"
            ><template v-if="!readOnly"
              ><button class="link-button" @click="edit(group.key, row)">
                修改</button
              ><button
                class="link-button danger"
                @click="remove(group.key, row)"
              >
                删除
              </button></template
            ><span v-else class="muted">归档</span></template
          ></DataTable
        >
      </div>
    </section>
    <section class="section-card">
      <div class="section-heading">
        <h3><Icon name="calendar" /> 第 {{ round }} 轮 · 清洁生产工作计划</h3>
        <n-button
          v-if="!readOnly"
          size="small"
          type="primary"
          secondary
          @click="edit('plan')"
          ><Icon name="plus" :size="14" />&nbsp; 添加工作安排</n-button
        >
      </div>
      <div class="section-body">
        <DataTable
          :rows="roundData.plan"
          :columns="[
            { field: 'name', title: '工作内容', minWidth: 280 },
            { field: 'owner', title: '责任人', width: 110 },
            { field: 'date', title: '计划完成时间', width: 160 },
            { field: 'status', title: '当前执行情况', width: 140 },
            { field: 'action', title: '操作', width: 120 },
          ]"
          ><template #status="{ row }"
            ><span
              :class="[
                'status-pill',
                {
                  warning: row.status === '进行中',
                  neutral: row.status === '未开始',
                },
              ]"
              >{{ row.status }}</span
            ></template
          ><template #action="{ row }"
            ><template v-if="!readOnly"
              ><button class="link-button" @click="edit('plan', row)">
                修改</button
              ><button class="link-button danger" @click="remove('plan', row)">
                删除
              </button></template
            ><span v-else class="muted">归档</span></template
          ></DataTable
        >
        <div class="table-end">
          已完成
          {{ roundData.plan.filter((p) => p.status === "已完成").length }} /
          {{ roundData.plan.length }} 项工作
        </div>
      </div>
    </section>
    <RecordEditor
      v-model:show="editing"
      :title="target === 'plan' ? '工作计划' : '审核小组成员'"
      :fields="target === 'plan' ? planFields : peopleFields"
      :record="record"
      @save="save"
    />
  </div>
</template>
<style scoped>
.standards-empty {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 8px 0;
  color: #8aa3ba;
}
.standards-empty h4 {
  font-size: 14px;
  color: #606266;
  font-weight: 400;
  margin-bottom: 5px;
}
</style>
