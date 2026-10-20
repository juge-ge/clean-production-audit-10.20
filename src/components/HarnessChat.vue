<script setup>
import { ref, computed, nextTick } from "vue";
import { useRouter } from "vue-router";
import Icon from "./Icon.vue";
import { documentTypes } from "../data/domain";
const props = defineProps({ data: Object, compact: Boolean });
const router = useRouter();
const input = ref(""),
  busy = ref(false),
  thread = ref(null);
const history = computed(() => props.data.chat);
const suggestions = [
  "查看本轮待补充资料",
  "梳理现状调研所需数据",
  "检查文档与指标的对应关系",
];
async function send(text = input.value) {
  if (!text.trim() || busy.value) return;
  props.data.chat.push({ role: "user", text: text.trim() });
  input.value = "";
  busy.value = true;
  await nextTick();
  thread.value?.scrollTo({
    top: thread.value.scrollHeight,
    behavior: "smooth",
  });
  setTimeout(async () => {
    const files = props.data.documents;
    let answer = text.includes("资料")
      ? `本企业资料库已收录 ${files.length} 份文件，当前资料清单包含 ${documentTypes.length} 类。建议先补齐生产年报、综合能源利用表、排污许可执行报告和适用行业标准，再核对资料年份。您可以进入“企业相关资料报告”查看各类别的归集情况。`
      : text.includes("数据")
        ? `现状调研已设置产品产能、原辅材料、综合能源、用水和污染物排放五类表格。每条数据均应记录来源文件与页码。综合能耗和新鲜水单耗按当前表格数值计算；行业评价阈值需在适用标准确认后配置。`
        : `可以按“原始文件 → 页码与摘录 → 指标字段 → 人工确认”的顺序核对。上传文件后，请说明统计年度、生产边界和适用标准。当前尚未接入 DeepSeek Harness，此演示仅展示对话与任务交接方式，不会读取或识别文档正文。`;
    props.data.chat.push({ role: "assistant", text: answer });
    busy.value = false;
    await nextTick();
    thread.value?.scrollTo({
      top: thread.value.scrollHeight,
      behavior: "smooth",
    });
  }, 400);
}
function keydown(event) {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    send();
  }
}
</script>
<template>
  <section class="harness-panel" :class="{ compact }">
    <div class="harness-head">
      <div class="row">
        <Icon name="chat" :size="19" />
        <h3>清洁生产审核助手</h3>
        <span class="harness-badge">DeepSeek Harness</span>
      </div>
      <button v-if="history.length" class="link-button" @click="data.chat = []">
        清空对话</button
      ><span v-else class="muted small">对话演示</span>
    </div>
    <div
      ref="thread"
      class="harness-conversation"
      :class="{ populated: history.length }"
    >
      <template v-if="!history.length"
        ><div class="assistant-intro">
          <span class="assistant-mark"><Icon name="book" :size="26" /></span>
          <h2>
            {{
              compact
                ? "结合原始资料，整理审核所需数据"
                : "从一份资料，开始本轮审核。"
            }}
          </h2>
          <p>归集审核资料、梳理指标数据，逐项确认数据依据。</p>
        </div>
        <div class="prompt-list">
          <button v-for="(s, i) in suggestions" :key="s" @click="send(s)">
            <Icon
              :name="['folder', 'clipboard', 'file'][i]"
              :size="17"
            /><span>{{ s }}</span
            ><Icon name="arrow" :size="14" />
          </button></div
      ></template>
      <div v-for="(m, i) in history" :key="i" :class="['chat-turn', m.role]">
        <span class="chat-role">{{
          m.role === "user" ? "您" : "审核助手 · 演示回复"
        }}</span>
        <p>{{ m.text }}</p>
      </div>
      <p v-if="busy" class="muted">正在整理演示回复…</p>
    </div>
    <div class="composer">
      <textarea
        v-model="input"
        aria-label="审核助手输入框"
        placeholder="输入审核问题，或说明需要从资料中整理哪些数据…"
        @keydown="keydown"
        rows="2"
      ></textarea>
      <div class="composer-tools">
        <button
          class="attach-button"
          @click="router.push('/app/enterprise?p=documents')"
        >
          <Icon name="attach" :size="17" /> 添加审核资料
        </button>
        <div class="spacer"></div>
        <span class="muted small">Enter 发送 · Shift + Enter 换行</span
        ><n-button
          type="primary"
          :disabled="!input.trim() || busy"
          @click="send()"
          size="small"
          aria-label="发送消息"
          ><Icon name="send" :size="16"
        /></n-button>
      </div>
    </div>
    <div class="harness-foot">
      本地前端演示，尚未连接模型服务。审核数据与结论须由填报人核实。
    </div>
  </section>
</template>
<style scoped>
.harness-panel {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 0 24px 16px;
}
.harness-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 19px 0;
  border-bottom: 1px solid #f0f1f4;
  color: #606266;
}
.harness-head h3 {
  font-size: 14px;
  color: #303133;
}
.harness-badge {
  font-size: 10px;
  color: #98a1ad;
  letter-spacing: 0.2px;
  padding-left: 8px;
  border-left: 1px solid #e4e7ed;
}
.harness-conversation {
  padding: 32px 14px 30px;
  min-height: 285px;
  max-height: 420px;
  overflow: auto;
}
.assistant-intro {
  text-align: center;
}
.assistant-mark {
  display: inline-flex;
  color: #547895;
  padding: 11px;
  background: #f2f6fa;
  border-radius: 6px;
  margin-bottom: 14px;
}
.assistant-intro h2 {
  font-size: 21px;
  font-weight: 500;
  color: #3d4b5a;
  letter-spacing: 0.5px;
}
.assistant-intro p {
  font-size: 13px;
  color: #909399;
  margin-top: 10px;
}
.prompt-list {
  display: flex;
  gap: 10px;
  margin-top: 29px;
}
.prompt-list button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid #e9edf2;
  border-radius: 4px;
  background: white;
  color: #718296;
  font-size: 12px;
  padding: 11px 10px;
  flex: 1;
  text-align: left;
}
.prompt-list button:hover {
  background: #f7fafc;
  border-color: #c6d9e9;
}
.prompt-list button span {
  flex: 1;
}
.composer {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  overflow: hidden;
  padding: 14px 14px 10px;
  box-shadow: 0 2px 7px #30415605;
}
.composer:focus-within {
  border-color: #9cc5e8;
}
.composer textarea {
  width: 100%;
  border: 0;
  outline: none;
  resize: vertical;
  min-height: 48px;
  max-height: 180px;
  color: #606266;
  font-size: 13px;
  line-height: 1.8;
  background: transparent;
}
.composer textarea::placeholder {
  color: #a4abb4;
}
.composer-tools {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 10px;
}
.attach-button {
  display: flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: none;
  color: #7d8794;
  padding: 0;
  font-size: 12px;
}
.harness-foot {
  text-align: center;
  font-size: 11px;
  color: #a6abb2;
  margin-top: 12px;
}
.chat-turn {
  margin-bottom: 20px;
  font-size: 13px;
}
.chat-turn .chat-role {
  display: block;
  font-size: 11px;
  color: #909399;
  margin-bottom: 6px;
}
.chat-turn p {
  padding: 12px 15px;
  background: #f7f9fb;
  border-radius: 4px;
  line-height: 1.9;
  white-space: pre-wrap;
}
.chat-turn.user {
  margin-left: 15%;
  text-align: right;
}
.chat-turn.user p {
  background: #ecf5ff;
  display: inline-block;
  text-align: left;
}
.chat-turn.assistant {
  margin-right: 6%;
}
.populated {
  padding: 20px 4px;
}
.compact .harness-conversation {
  min-height: 150px;
  padding-top: 20px;
}
.compact .assistant-intro h2 {
  font-size: 17px;
}
.compact .assistant-mark {
  display: none;
}
.compact .prompt-list {
  margin-top: 20px;
}
.compact .harness-badge {
  display: none;
}
@media (max-width: 1000px) {
  .prompt-list {
    flex-direction: column;
  }
  .harness-badge {
    display: none;
  }
  .composer-tools > .muted {
    display: none;
  }
  .harness-panel {
    padding: 0 16px 14px;
  }
}
</style>
