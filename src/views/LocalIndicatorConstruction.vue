<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import IndicatorProjects from "../components/IndicatorProjects.vue";
import IndustryIndicators from "./IndustryIndicators.vue";
const route = useRoute(), router = useRouter();
const tab = computed({ get: () => route.query.tab === 'questionnaires' ? 'questionnaires' : 'projects', set: (value) => router.replace({ query: { ...route.query, tab: value } }) });
</script>
<template>
  <div class="stack">
    <div><h1 class="page-title">地方指标建设</h1><p class="page-description">组织指标研究、基准值测算、企业试评价和专家论证，记录成果版本与发布文件。</p></div>
    <div class="tabs-strip"><button :class="{ active: tab === 'projects' }" @click="tab = 'projects'">指标建设项目</button><button :class="{ active: tab === 'questionnaires' }" @click="tab = 'questionnaires'">专家问卷</button></div>
    <IndicatorProjects v-if="tab === 'projects'" />
    <IndustryIndicators v-else />
  </div>
</template>
