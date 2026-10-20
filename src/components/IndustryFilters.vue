<script setup>
defineProps({ filters: Object, options: Object });
</script>
<template>
  <div class="toolbar industry-filters">
    <n-select
      v-model:value="filters.city"
      :options="options.cities"
      placeholder="全部地市"
      clearable
      aria-label="所属地市筛选"
      @update:value="filters.county = null"
    /><n-select
      v-model:value="filters.county"
      :options="options.counties"
      placeholder="全部区县"
      clearable
      aria-label="所属区县筛选"
    /><n-select
      v-model:value="filters.industry"
      :options="options.industries"
      placeholder="全部行业"
      clearable
      aria-label="行业筛选"
    /><n-input
      v-model:value="filters.search"
      placeholder="搜索企业名称或区县"
      clearable
    /><n-button
      @click="
        Object.assign(filters, {
          city: null,
          county: null,
          industry: null,
          search: '',
        })
      "
      >重置</n-button
    ><slot />
  </div>
</template>
