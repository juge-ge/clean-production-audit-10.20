<script setup>
import { computed, provide, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { session, enterpriseData } from "../data/store";
import { phases, roundOptions, scopedEnterprises } from "../data/domain";
import Icon from "../components/Icon.vue";
import EvidenceDrawer from "../components/EvidenceDrawer.vue";
import EnterpriseInfo from "./EnterpriseInfo.vue";
import Organization from "./Organization.vue";
import Documents from "./Documents.vue";
import Survey from "./Survey.vue";
import Analysis from "./Analysis.vue";
import Schemes from "./SchemeWorkspace.vue";
import Summary from "./Summary.vue";
const props = defineProps({ archiveView: Boolean });
const route = useRoute(),
  router = useRouter();
const id = computed(
  () =>
    route.params.id ||
    session.user.enterpriseId ||
    scopedEnterprises(session.user)[0]?.id,
);
const data = computed(() => enterpriseData(id.value));
const round = computed({
  get: () =>
    [1, 2, 3].includes(Number(route.query.round))
      ? Number(route.query.round)
      : 3,
  set: (v) => router.replace({ query: { ...route.query, round: v } }),
});
const phase = computed({
  get: () =>
    phases.some((p) => p.id === route.query.p)
      ? route.query.p
      : data.value.delivery.status === "reported"
        ? "summary"
        : "info",
  set: (v) => router.replace({ query: { ...route.query, p: v } }),
});
const roundData = computed(() => data.value.rounds[round.value]);
const readOnly = computed(
  () => round.value !== 3 || session.user.role !== "enterprise",
);
const evidence = ref({ show: false, source: "", page: 1 });
function showEvidence(source, page) {
  evidence.value = { show: true, source, page };
}
provide("audit", { data, round, roundData, readOnly, showEvidence, phase, archiveOnly: props.archiveView });
const components = {
  info: EnterpriseInfo,
  organization: Organization,
  documents: Documents,
  survey: Survey,
  analysis: Analysis,
  solution: Schemes,
  summary: Summary,
};
const phaseIndex = computed(() =>
  phases.findIndex((p) => p.id === phase.value),
);
</script>
<template>
  <div class="stack">
    <div class="enterprise-banner">
      <div class="enterprise-emblem"><Icon name="factory" :size="28" /></div>
      <div class="enterprise-meta">
        <div class="row wrap">
          <h1>{{ data.info.name }}</h1>
          <n-tag size="small" type="info" :bordered="false">{{
            data.info.nature
          }}</n-tag
          ><n-tag size="small" :bordered="true">{{ data.info.industry }}</n-tag
          ><span class="example-label">示例企业</span>
        </div>
        <div class="enterprise-sub">
          <span
            ><Icon name="file" :size="13" /> 信用代码
            {{ data.info.creditCode }}</span
          ><span
            ><Icon name="user" :size="13" /> 法人
            {{ data.info.legalPerson }}</span
          ><span>{{ data.info.city }} / {{ data.info.county }}</span>
        </div>
      </div>
      <n-select
        v-model:value="round"
        :options="roundOptions"
        style="width: 225px; flex-shrink: 0"
        aria-label="审核轮次"
      />
    </div>
    <div class="phase-steps">
      <button
        v-for="(item, i) in phases"
        :key="item.id"
        :class="{ active: phase === item.id, done: i < phaseIndex }"
        @click="phase = item.id"
      >
        <span class="step-number">{{ i + 1 }}</span
        ><span class="step-copy"
          ><strong>{{ item.name }}</strong
          ><small>{{ item.desc }}</small></span
        >
      </button>
    </div>
    <n-alert v-if="readOnly" type="info" :show-icon="false">{{
      round !== 3
        ? "正在查看第 " +
          round +
          " 轮审核归档，历史数据只读。切换至本轮可继续填报。"
        : "当前为政府端辖区企业查看模式。企业资料由企业账号填报。"
    }}</n-alert
    ><component
      :is="components[phase]"
      :key="phase + '-' + round + '-' + id"
      :phase="phase"
    />
    <div class="phase-actions">
      <span class="muted small"
        >第 {{ phaseIndex + 1 }} / {{ phases.length }} 阶段
        <span class="example-label">· 演示业务数据</span></span
      >
      <div class="spacer"></div>
      <n-button v-if="phaseIndex > 0" @click="phase = phases[phaseIndex - 1].id"
        ><Icon name="back" :size="15" />&nbsp; 上一阶段</n-button
      ><n-button
        v-if="phaseIndex < phases.length - 1"
        type="primary"
        @click="phase = phases[phaseIndex + 1].id"
        >下一阶段：{{ phases[phaseIndex + 1].name }} &nbsp;<Icon
          name="arrow"
          :size="15"
      /></n-button>
    </div>
    <EvidenceDrawer
      v-model:show="evidence.show"
      :source="evidence.source"
      :page="evidence.page"
      :documents="data.documents"
    />
  </div>
</template>
<style scoped>
.enterprise-banner {
  background: white;
  border: 1px solid #e8ebf0;
  border-left: 3px solid #409eff;
  border-radius: 5px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 22px;
}
.enterprise-emblem {
  color: #409eff;
  background: #ecf5ff;
  padding: 14px;
  border-radius: 6px;
}
.enterprise-meta {
  flex: 1;
}
.enterprise-meta h1 {
  font-size: 19px;
  font-weight: 600;
}
.enterprise-sub {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 10px;
  color: #909399;
  font-size: 12px;
}
.enterprise-sub > span {
  display: flex;
  align-items: center;
  gap: 5px;
}
.phase-steps {
  display: flex;
  background: white;
  border: 1px solid #e8ebf0;
  border-radius: 5px;
  padding: 12px;
  overflow: auto;
  gap: 3px;
}
.phase-steps button {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 1;
  min-width: 140px;
  background: transparent;
  border: 0;
  padding: 12px 9px;
  text-align: left;
  color: #606266;
  border-radius: 4px;
  position: relative;
}
.phase-steps button:hover {
  background: #f7f9fc;
}
.phase-steps button.active {
  background: #ecf5ff;
  color: #409eff;
}
.step-number {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  background: #f0f2f5;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}
.active .step-number {
  background: #409eff;
  color: white;
}
.step-copy {
  white-space: nowrap;
}
.step-copy strong {
  font-weight: 400;
  font-size: 12px;
  display: block;
}
.step-copy small {
  font-size: 10px;
  color: #909399;
  display: block;
  margin-top: 3px;
}
.done .step-number {
  background: #f0f7ff;
  color: #409eff;
}
.phase-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px 20px;
  border: 1px solid #e8ebf0;
  border-radius: 5px;
  background: white;
  position: sticky;
  bottom: 0;
  z-index: 10;
}
@media (max-width: 1100px) {
  .enterprise-banner {
    flex-wrap: wrap;
  }
  .enterprise-meta {
    min-width: 300px;
  }
}
@media (max-width: 650px) {
  .enterprise-banner {
    padding: 16px;
    gap: 15px;
  }
  .enterprise-meta {
    min-width: 0;
    flex: 1 0 100%;
  }
  .enterprise-sub {
    gap: 9px 14px;
  }
  .enterprise-sub > span {
    flex-wrap: wrap;
    overflow-wrap: anywhere;
  }
  .enterprise-banner > .n-select {
    max-width: 100%;
  }
  .enterprise-emblem {
    display: none;
  }
  .enterprise-meta h1 {
    font-size: 17px;
  }
  .phase-actions {
    position: static;
    flex-wrap: wrap;
    padding: 14px;
  }
  .phase-actions > .muted {
    display: none;
  }
}
</style>
