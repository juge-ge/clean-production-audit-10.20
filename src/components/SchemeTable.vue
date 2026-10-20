<script setup>
import DataTable from "./DataTable.vue";
defineProps({ rows: Array, editable: Boolean });
defineEmits(["edit"]);
</script>
<template>
  <DataTable
    :rows="rows"
    :columns="[
      { field: 'name', title: '方案名称', minWidth: 220 },
      { field: 'type', title: '类别', width: 110 },
      { field: 'investment', title: '投资（万元）', width: 120 },
      { field: 'saving', title: '年效益（万元）', width: 135 },
      { field: 'energy', title: '节能（tce/a）', width: 125 },
      { field: 'water', title: '节水（m³/a）', width: 125 },
      { field: 'nox', title: 'NOx减排（t/a）', width: 145 },
      { field: 'days', title: '工期（天）', width: 105 },
      { field: 'description', title: '具体措施', minWidth: 260 },
      { field: 'action', title: '操作', width: 100, fixed: 'right' },
    ]"
    ><template #name="{ row }"
      ><strong>{{ row.name }}</strong>
      <p class="muted small">{{ row.source }}</p></template
    ><template #action="{ row }"
      ><button v-if="editable" class="link-button" @click="$emit('edit', row)">
        人工修订</button
      ><span v-else class="muted">查看</span></template
    ></DataTable
  >
</template>
