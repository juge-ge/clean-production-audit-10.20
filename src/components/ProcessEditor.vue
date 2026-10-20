<script setup>
import { inject, computed, ref } from "vue";
import { VueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/controls/dist/style.css";
import { useDialog, useMessage } from "naive-ui";
import { uid } from "../data/store";
import { downloadText } from "../services/files";
import Icon from "./Icon.vue";
import DataTable from "./DataTable.vue";
import RecordEditor from "./RecordEditor.vue";
const { data, roundData, readOnly, showEvidence } = inject("audit"),
  message = useMessage(),
  dialog = useDialog();
const kind = ref("production"),
  graph = computed(() => roundData.value.graphs[kind.value]),
  editor = ref(false),
  editType = ref("node"),
  record = ref({}),
  equipmentModal = ref(false),
  equipmentRecord = ref({});
const kindOptions = [
  { key: "production", name: "生产工艺" },
  { key: "water", name: "废水处理工艺" },
  { key: "air", name: "废气治理工艺" },
];
const nodeOptions = computed(() =>
  graph.value.nodes.map((n) => ({ label: n.label, value: n.id })),
);
const editFields = computed(() =>
  editType.value === "node"
    ? [{ key: "label", label: "工序 / 设施名称", required: true, wide: true }]
    : [
        {
          key: "source",
          label: "起点工序",
          options: nodeOptions.value,
          required: true,
        },
        {
          key: "target",
          label: "终点工序",
          options: nodeOptions.value,
          required: true,
        },
        { key: "material", label: "物料 / 污染物", required: true },
        { key: "amount", label: "流量数值", type: "number" },
        {
          key: "unit",
          label: "单位",
          options: ["t/a", "m³/a", "kg/h", "Nm³/h", "t/d"],
        },
        { key: "note", label: "说明与统计口径", wide: true },
      ],
);
const flowRows = computed(() =>
  graph.value.edges.map((e) => ({
    ...e,
    from: graph.value.nodes.find((n) => n.id === e.source)?.label,
    to: graph.value.nodes.find((n) => n.id === e.target)?.label,
    material: e.data?.material || e.label,
    amount: e.data?.amount ?? "待录入",
    unit: e.data?.unit || "—",
  })),
);
function addNode() {
  editType.value = "node";
  record.value = {
    id: uid(),
    label: "新工序",
    position: { x: 120 + graph.value.nodes.length * 80, y: 280 },
    sourcePosition: "right",
    targetPosition: "left",
  };
  editor.value = true;
}
function editNode({ node }) {
  if (readOnly.value) return;
  editType.value = "node";
  record.value = JSON.parse(JSON.stringify(node));
  editor.value = true;
}
function addFlow() {
  editType.value = "edge";
  record.value = {
    id: uid(),
    source: graph.value.nodes[0]?.id,
    target: graph.value.nodes[1]?.id,
    material: "",
    amount: null,
    unit: "t/a",
    note: "",
  };
  editor.value = true;
}
function editEdge({ edge }) {
  if (readOnly.value) return;
  editType.value = "edge";
  record.value = {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    material: edge.data?.material || edge.label,
    amount: edge.data?.amount ?? null,
    unit: edge.data?.unit || "t/a",
    note: edge.data?.note || "",
  };
  editor.value = true;
}
function save(form) {
  if (editType.value === "node") {
    const index = graph.value.nodes.findIndex((n) => n.id === form.id);
    if (index < 0) graph.value.nodes.push(form);
    else
      graph.value.nodes[index] = {
        ...graph.value.nodes[index],
        label: form.label,
      };
  } else {
    if (form.source === form.target)
      return message.warning("流向起点与终点不能相同");
    const e = {
      id: form.id,
      source: form.source,
      target: form.target,
      type: "smoothstep",
      markerEnd: "arrowclosed",
      label: `${form.material}${form.amount !== null && form.amount !== undefined ? " · " + form.amount + " " + form.unit : ""}`,
      data: {
        material: form.material,
        amount: form.amount,
        unit: form.unit,
        note: form.note,
      },
    };
    const index = graph.value.edges.findIndex((e) => e.id === form.id);
    if (index < 0) graph.value.edges.push(e);
    else graph.value.edges[index] = e;
  }
  message.success("流程已保存至本机");
}
function connect(connection) {
  if (readOnly.value) return;
  editType.value = "edge";
  record.value = {
    id: uid(),
    ...connection,
    material: "物料",
    amount: null,
    unit: "t/a",
  };
  editor.value = true;
}
function deleteSelected() {
  const nodes = graph.value.nodes.filter((n) => n.selected),
    edges = graph.value.edges.filter((e) => e.selected);
  if (!nodes.length && !edges.length)
    return message.info("请先单击选中节点或连线");
  dialog.warning({
    title: "删除选中流程元素",
    content: "删除工序将同时删除与其相连的流向记录。",
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: () => {
      const ids = new Set(nodes.map((n) => n.id));
      graph.value.nodes = graph.value.nodes.filter((n) => !ids.has(n.id));
      graph.value.edges = graph.value.edges.filter(
        (e) => !ids.has(e.source) && !ids.has(e.target) && !e.selected,
      );
    },
  });
}
function equipmentSave(form) {
  const i = roundData.value.equipment.findIndex((e) => e.id === form.id);
  if (i < 0) roundData.value.equipment.push(form);
  else roundData.value.equipment[i] = form;
}
function deleteEquipment(row) {
  dialog.warning({
    title: "删除设备",
    content: `确认删除${row.name}？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: () =>
      (roundData.value.equipment = roundData.value.equipment.filter(
        (e) => e.id !== row.id,
      )),
  });
}
</script>
<template>
  <div class="stack">
    <div class="section-note">
      {{ data.info.name }} · {{ data.info.industry }} · 主要产品：{{
        data.info.products
      }}。工艺与设备属于定性指标核查内容，需结合适用标准逐项确认。
    </div>
    <div class="between wrap">
      <div class="tabs-strip" style="margin: 0; border: 0">
        <button
          v-for="k in kindOptions"
          :key="k.key"
          :class="{ active: kind === k.key }"
          @click="kind = k.key"
        >
          {{ k.name }}
        </button>
      </div>
      <span class="muted small">{{
        readOnly ? "归档流程" : "拖动节点调整位置 · 双击节点 / 连线编辑"
      }}</span>
    </div>
    <div class="toolbar" style="margin: 0">
      <template v-if="!readOnly"
        ><n-button size="small" @click="addNode"
          ><Icon name="plus" :size="14" />&nbsp; 添加工序</n-button
        ><n-button size="small" @click="addFlow">添加物料流向</n-button
        ><n-button size="small" @click="deleteSelected"
          >删除选中</n-button
        ></template
      >
      <div class="spacer"></div>
      <n-button
        size="small"
        @click="
          downloadText(
            kind + '-流程.json',
            JSON.stringify(graph, null, 2),
            'application/json',
          )
        "
        ><Icon name="download" :size="14" />&nbsp; 导出流程</n-button
      >
    </div>
    <div class="process-canvas">
      <VueFlow
        :key="kind"
        v-model:nodes="graph.nodes"
        v-model:edges="graph.edges"
        :nodes-draggable="!readOnly"
        :nodes-connectable="!readOnly"
        :delete-key-code="null"
        :min-zoom="0.25"
        :max-zoom="2"
        fit-view-on-init
        @node-double-click="editNode"
        @edge-double-click="editEdge"
        @connect="connect"
        ><Background :gap="20" pattern-color="#dce3eb" /><Controls
          :show-interactive="false"
      /></VueFlow>
    </div>
    <div>
      <div class="between" style="margin-bottom: 9px">
        <h4>{{ kindOptions.find((k) => k.key === kind).name }}流程描述</h4>
        <span class="muted small">编辑后自动保存</span>
      </div>
      <n-input
        v-model:value="graph.description"
        type="textarea"
        :disabled="readOnly"
        :autosize="{ minRows: 3 }"
      />
    </div>
    <div>
      <h4 style="margin-bottom: 12px">物料 / 污染物流向数据</h4>
      <DataTable
        :rows="flowRows"
        :columns="[
          { field: 'from', title: '起点工序', minWidth: 130 },
          { field: 'to', title: '终点工序', minWidth: 130 },
          { field: 'material', title: '物料 / 污染物', minWidth: 180 },
          { field: 'amount', title: '流量', width: 100 },
          { field: 'unit', title: '单位', width: 90 },
          { field: 'action', title: '操作', width: 100 },
        ]"
        ><template #action="{ row }"
          ><button
            v-if="!readOnly"
            class="link-button"
            @click="
              editEdge({ edge: graph.edges.find((e) => e.id === row.id) })
            "
          >
            编辑流向</button
          ><span v-else class="muted">归档</span></template
        ></DataTable
      >
      <p class="muted small" style="margin-top: 10px">
        流量为企业填报值；未配置平衡边界前不自动判定物料守恒。示例图不代表实际工艺。
      </p>
    </div>
    <div>
      <div class="between" style="margin: 5px 0 14px">
        <h4>工艺设备信息表</h4>
        <n-button
          v-if="!readOnly"
          size="small"
          @click="
            equipmentRecord = { id: uid(), quantity: 1, page: 1 };
            equipmentModal = true;
          "
          >添加设备</n-button
        >
      </div>
      <DataTable
        :rows="roundData.equipment"
        :columns="[
          { field: 'process', title: '所属工序', width: 120 },
          { field: 'name', title: '设备名称', minWidth: 160 },
          { field: 'model', title: '设备型号', minWidth: 160 },
          { field: 'quantity', title: '数量（台 / 套）', width: 130 },
          { field: 'action', title: '操作', width: 120 },
          { field: 'source', title: '依据', minWidth: 210 },
        ]"
        ><template #action="{ row }"
          ><template v-if="!readOnly"
            ><button
              class="link-button"
              @click="
                equipmentRecord = { ...row };
                equipmentModal = true;
              "
            >
              修改</button
            ><button class="link-button danger" @click="deleteEquipment(row)">
              删除
            </button></template
          ><span v-else class="muted">归档</span></template
        ><template #source="{ row }"
          ><button
            class="link-button cell-source"
            @click="showEvidence(row.source, row.page)"
          >
            {{ row.source || "待补充" }} · 第 {{ row.page || "—" }} 页
          </button></template
        ></DataTable
      >
    </div>
    <RecordEditor
      v-model:show="editor"
      :title="editType === 'node' ? '编辑工序节点' : '编辑物料流向'"
      :record="record"
      :fields="editFields"
      @save="save"
    /><RecordEditor
      v-model:show="equipmentModal"
      title="工艺设备"
      :record="equipmentRecord"
      :fields="[
        { key: 'process', label: '所属工序', required: true },
        { key: 'name', label: '设备名称', required: true },
        { key: 'model', label: '设备型号' },
        {
          key: 'quantity',
          label: '数量（台 / 套）',
          type: 'number',
          required: true,
        },
        { key: 'source', label: '来源文档', wide: true },
        { key: 'page', label: '来源页码', type: 'number' },
      ]"
      @save="equipmentSave"
    />
  </div>
</template>
