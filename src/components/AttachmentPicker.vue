<script setup>
import { ref } from "vue";
import { useMessage } from "naive-ui";
import { saveFile, getFile, downloadBlob } from "../services/files";
import EvidenceDrawer from "./EvidenceDrawer.vue";
const props = defineProps({
  data: Object,
  modelValue: { type: Array, default: () => [] },
  readonly: Boolean,
  category: { type: String, default: "方案实施与验收资料" },
});
const emit = defineEmits(["update:modelValue"]);
const input = ref(null),
  busy = ref(false),
  message = useMessage(),
  preview = ref({ show: false, source: "", page: 1 });
async function upload(event) {
  if (props.readonly) return;
  busy.value = true;
  const ids = [...props.modelValue];
  for (const file of Array.from(event.target.files || [])) {
    if (
      file.size > 20 * 1024 * 1024 ||
      !/\.(pdf|png|jpg|jpeg|webp|docx?|xlsx?|txt)$/i.test(file.name)
    ) {
      message.warning("仅支持 20 MB 内的 PDF、图片、Office 或文本文件");
      continue;
    }
    try {
      const id = crypto.randomUUID();
      await saveFile(id, file);
      props.data.documents.unshift({
        id,
        name: file.name,
        category: props.category,
        year: 2026,
        date: new Date().toLocaleDateString("zh-CN", {
          timeZone: "Asia/Shanghai",
        }),
        size: file.size,
        status: "已归集 · 待核实",
      });
      ids.push(id);
    } catch {
      message.error("附件保存失败，请检查本地存储空间");
    }
  }
  emit("update:modelValue", ids);
  busy.value = false;
  event.target.value = "";
}
const name = (id) =>
  props.data.documents.find((d) => d.id === id)?.name || "原件元数据缺失";
async function download(id) {
  try {
    const f = await getFile(id);
    if (!f) return message.warning("未找到原文件");
    downloadBlob(name(id), f);
  } catch {
    message.error("无法读取附件");
  }
}
</script>
<template>
  <div class="attachment-picker">
    <div v-for="id in modelValue" :key="id" class="attachment-row">
      <button
        class="link-button attachment-name"
        @click="preview = { show: true, source: id, page: 1 }"
      >
        {{ name(id) }}</button
      ><button class="link-button" @click="download(id)">下载</button
      ><button
        v-if="!readonly"
        class="link-button danger"
        @click="
          emit(
            'update:modelValue',
            modelValue.filter((x) => x !== id),
          )
        "
      >
        移除关联
      </button>
    </div>
    <div v-if="!readonly" class="row wrap">
      <n-button size="small" :loading="busy" @click="input.click()"
        >上传凭证附件</n-button
      ><span class="muted small">支持多份资料，保存至本机</span
      ><input
        ref="input"
        type="file"
        hidden
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.txt"
        @change="upload"
      />
    </div>
    <span v-else-if="!modelValue.length" class="muted small">未附资料</span
    ><EvidenceDrawer
      v-model:show="preview.show"
      :source="preview.source"
      :page="preview.page"
      :documents="data.documents"
    />
  </div>
</template>
