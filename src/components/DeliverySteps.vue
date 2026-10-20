<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { session } from "../data/store";
import { dataApproved, deliveryLabels } from "../data/deliveryWorkflow";
import Icon from "./Icon.vue";
const props = defineProps({ data: Object });
const router = useRouter();
function navigate(i) {
  const owner = session.user.role === "enterprise",
    id = owner ? "" : "/" + props.data.info.id;
  if (i === 0) return router.push("/app/oa" + id + "?stage=fill");
  if (!owner)
    return router.push(
      "/app/oa" +
        id +
        "?stage=delivery&detail=" +
        [
          "",
          "plan",
          "plan",
          "implementation",
          "acceptance",
          "acceptance",
          "continuous",
        ][i],
    );
  router.push(
    "/app/enterprise?p=" +
      (i < 4
        ? "solution&section=" + ["", "optimize", "expert", "implementation"][i]
        : "summary"),
  );
}
const index = computed(() =>
  !dataApproved(props.data)
    ? 0
    : ["planning", "plan_returned"].includes(props.data.delivery.status)
      ? 1
      : props.data.delivery.status === "plan_submitted"
        ? 2
        : ["implementing", "acceptance_returned"].includes(
              props.data.delivery.status,
            )
          ? 3
          : props.data.delivery.status === "acceptance_submitted"
            ? 4
            : props.data.delivery.status === "reported"
              ? 6
              : 5,
);
</script>
<template>
  <div class="delivery-steps">
    <button
      v-for="(s, i) in [
        '填报获批',
        '方案优化与专家修订',
        '方案报备批准',
        '实施考察与整改',
        '验收检查指导',
        '生成审核报告',
        '持续清洁生产',
      ]"
      :key="s"
      :class="{ active: i === index, done: i < index }"
      @click="navigate(i)"
    >
      <span>{{ i < index ? "✓" : i + 1 }}</span
      ><strong>{{ s }}</strong
      ><Icon v-if="i < 6" name="right" :size="12" />
    </button>
  </div>
  <div class="delivery-state">
    <span class="status-pill" :class="{ warning: index < 5 }">{{
      dataApproved(data)
        ? deliveryLabels[data.delivery.status]
        : "等待填报数据获批"
    }}</span
    ><span class="muted small">第 3 轮 · 前端演示</span>
  </div>
</template>
