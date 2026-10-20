<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useIndustry } from "../data/useIndustry";
import ReportComposer from "../components/ReportComposer.vue";
import IndustryReports from "./IndustryReports.vue";
const route = useRoute(), router = useRouter();
const tab = computed({ get: () => route.query.tab === 'references' ? 'references' : 'drafts', set: (value) => router.replace({ query: { ...route.query, tab: value } }) });
const { filters, rows, options } = useIndustry();
</script>
<template>
  <div class="stack">
    <div><h1 class="page-title">行业报告工作台</h1><p class="page-description">引用辖区企业数据和审核档案，编制行业报告，保存草稿及成果版本。</p></div>
    <div class="tabs-strip"><button :class="{ active: tab === 'drafts' }" @click="tab = 'drafts'">报告编制</button><button :class="{ active: tab === 'references' }" @click="tab = 'references'">行业资料参考</button></div>
    <ReportComposer v-if="tab === 'drafts'" :rows="rows" :filters="filters" :options="options" />
    <IndustryReports v-else />
  </div>
</template>
