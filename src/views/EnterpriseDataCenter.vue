<script setup>
import { computed, provide, ref } from "vue";
import { session, enterpriseData } from "../data/store";
import Documents from "./Documents.vue";
import EvidenceDrawer from "../components/EvidenceDrawer.vue";
import Icon from "../components/Icon.vue";

const data = computed(() => enterpriseData(session.user.enterpriseId));
const round = ref(3);
const roundData = computed(() => data.value.rounds[3]);
const readOnly = computed(() => false);
const evidence = ref({ show: false, source: "", page: 1 });
function showEvidence(source, page) {
  evidence.value = { show: true, source, page };
}
provide("audit", { data, round, roundData, readOnly, showEvidence });
</script>

<template>
  <div class="stack">
    <section class="section-card data-center-intro">
      <div>
        <h2><Icon name="folder" :size="22" /> 企业数据中心</h2>
        <p>按年度维护企业资料，定期补充生产、能源、用水及监测数据；证照、设备与工艺资料发生变化时更新。</p>
      </div>
      <span class="muted small">{{ data.info.name }}</span>
    </section>
    <Documents data-center />
    <EvidenceDrawer v-model:show="evidence.show" :source="evidence.source" :page="evidence.page" :documents="data.documents" />
  </div>
</template>

<style scoped>
.data-center-intro { display: flex; justify-content: space-between; gap: 20px; padding: 22px 24px; align-items: center; }
h2 { display: flex; align-items: center; gap: 10px; font-size: 19px; }
p { margin-top: 10px; color: #909399; font-size: 13px; line-height: 1.7; }
@media (max-width: 800px) { .data-center-intro { align-items: flex-start; flex-direction: column; } }
</style>
