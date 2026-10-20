<script setup>
import { ref, watch, onBeforeUnmount } from "vue";
import { getFile, downloadBlob } from "../services/files";
import { useMessage } from "naive-ui";
const props = defineProps({
  show: Boolean,
  source: String,
  page: [String, Number],
  documents: Array,
});
defineEmits(["update:show"]);
const url = ref(""),
  file = ref(null),
  text = ref(""),
  message = useMessage();
watch(
  () => [props.show, props.source],
  async () => {
    if (url.value) URL.revokeObjectURL(url.value);
    url.value = "";
    file.value = null;
    text.value = "";
    if (!props.show) return;
    const doc = props.documents?.find(
      (d) => d.name === props.source || d.id === props.source,
    );
    if (doc) {
      try {
        file.value = await getFile(doc.id);
        if (file.value) {
          url.value = URL.createObjectURL(file.value);
          if (file.value.type.startsWith("text/"))
            text.value = await file.value.text();
        }
      } catch (error) {
        message.error("原文件读取失败，请重新上传");
      }
    }
  },
);
onBeforeUnmount(() => {
  if (url.value) URL.revokeObjectURL(url.value);
});
</script>
<template>
  <n-drawer
    :show="show"
    @update:show="$emit('update:show', $event)"
    :width="640"
    ><n-drawer-content title="数据依据" closable
      ><div class="stack">
        <div>
          <h3>{{ source || "尚未填写来源文档" }}</h3>
          <p class="muted">引用页码：第 {{ page || "—" }} 页</p>
        </div>
        <template v-if="file"
          ><iframe
            v-if="file.type === 'application/pdf'"
            :src="url + '#page=' + (page || 1)"
            title="来源 PDF"
            style="width: 100%; height: 72vh; border: 1px solid #ddd"
          /><img
            v-else-if="file.type.startsWith('image/')"
            :src="url"
            style="max-width: 100%"
            alt="来源文档"
          />
          <pre v-else-if="text" style="white-space: pre-wrap">{{ text }}</pre>
          <n-alert v-else type="info"
            >此格式请下载后使用本地软件查看。引用页码由填报人核实。</n-alert
          ><n-button @click="downloadBlob(file.name || source, file)"
            >下载原文件</n-button
          ></template
        ><template v-else
          ><n-alert type="info" :show-icon="false">{{
            source?.includes("示例")
              ? "这是界面演示引用，尚未关联真实原始文件。"
              : "未找到关联原文件。请在企业相关资料报告中上传文件，再填写文件名称与页码。"
          }}</n-alert>
          <div class="evidence-page">
            <div class="example-label">引用记录预览 · 非文档原文</div>
            <h3>{{ source }}</h3>
            <p>
              第 <mark>{{ page || "—" }}</mark> 页
            </p>
            <p>
              此处用于展示数据来源定位。正式识别结果将关联上传文件、页码和原文摘录，经过人工确认后写入审核表格。
            </p>
          </div></template
        >
      </div></n-drawer-content
    ></n-drawer
  >
</template>
