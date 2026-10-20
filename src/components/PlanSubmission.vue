<script setup>
import { computed, ref } from "vue";
import { useDialog, useMessage } from "naive-ui";
import { session } from "../data/store";
import { planEditable, submitPlan } from "../data/deliveryWorkflow";
import SchemeTable from "./SchemeTable.vue";
const props = defineProps({ data: Object });
const f = computed(() => props.data.delivery);
const visible = computed(() => session.user.role === "enterprise" && planEditable(props.data));
const reviewed = computed(() => f.value.expertReviews.at(-1)?.revision === f.value.revision);
const note = ref("");
const dialog = useDialog(), message = useMessage();
function submit() {
  dialog.info({
    title: "提交本轮方案报备",
    content: "确认后将固定当前方案、优化约束和专家复核意见，提交所属接收单位。本次为本机前端演示。",
    positiveText: "确认报备", negativeText: "继续核对",
    onPositiveClick: () => {
      try { submitPlan(props.data, session.user, note.value); message.success("方案已提交，等待上级办理"); }
      catch (error) { message.warning(error.message); }
    },
  });
}
</script>

<template>
  <section v-if="visible" class="section-card">
    <div class="section-heading"><h3>方案正式报备</h3><span class="muted small">核对工作台方案及专家复核意见</span></div>
    <div class="section-body stack">
      <n-alert v-if="f.status === 'plan_returned'" type="warning" :show-icon="false">上级退回意见：{{ f.planVersions.at(-1)?.decision?.comment }}</n-alert>
      <template v-if="f.selected">
        <SchemeTable :rows="f.selected.items" />
        <p class="section-note">专家复核：{{ reviewed ? f.expertReviews.at(-1).expert.name + ' · 当前版本已复核' : '当前版本待专家复核，请返回审核工作台完善' }}</p>
        <n-input v-model:value="note" type="textarea" placeholder="填写方案报备说明；如被退回，请逐项说明修改情况" />
        <div class="modal-actions"><n-button type="primary" :disabled="!reviewed" @click="submit">提交方案报备</n-button></div>
      </template>
      <n-empty v-else description="请先在审核工作台完成方案编制与专家复核" />
    </div>
  </section>
</template>
