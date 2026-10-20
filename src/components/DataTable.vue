<script setup>
import { computed } from "vue";
const props = defineProps({
  rows: { type: Array, default: () => [] },
  columns: Array,
  editable: Boolean,
  footer: Array,
  height: [String, Number],
  sequence: { type: Boolean, default: true },
});
defineEmits(["change"]);
const footerData = computed(() =>
  props.footer
    ? [props.sequence ? ["合计 / 指标", ...props.footer] : props.footer]
    : [],
);
</script>
<template>
  <vxe-table
    :data="rows"
    border
    auto-resize
    show-overflow
    :height="height"
    :row-config="{ isHover: true, keyField: 'id' }"
    :column-config="{ resizable: true }"
    :edit-config="
      editable
        ? { trigger: 'dblclick', mode: 'cell', showIcon: true }
        : undefined
    "
    :show-footer="!!footer"
    :footer-data="footerData"
    empty-text="暂无记录"
    @edit-closed="$emit('change')"
    ><vxe-column
      v-if="sequence"
      type="seq"
      title="序号"
      width="65"
      align="center" /><vxe-column
      v-for="col in columns"
      :key="col.field"
      :field="col.field"
      :title="col.title"
      :width="col.width"
      :min-width="col.minWidth || 110"
      :align="col.align"
      :fixed="col.fixed"
      :edit-render="editable && col.edit ? {} : undefined"
      ><template #default="{ row, rowIndex }"
        ><slot :name="col.slot || col.field" :row="row" :index="rowIndex"
          ><span :class="{ number: col.type === 'number' }">{{
            row[col.field] ?? "—"
          }}</span></slot
        ></template
      ><template v-if="editable && col.edit" #edit="{ row }"
        ><select
          v-if="col.options"
          v-model="row[col.field]"
          class="table-input"
          :aria-label="col.title"
        >
          <option v-for="o in col.options" :key="o" :value="o">
            {{ o }}
          </option></select
        ><input
          v-else-if="col.type === 'number'"
          v-model.number="row[col.field]"
          class="table-input"
          type="number"
          min="0"
          step="any"
          :aria-label="col.title" /><input
          v-else
          v-model="row[col.field]"
          class="table-input"
          :type="col.type || 'text'"
          :aria-label="col.title" /></template></vxe-column
  ></vxe-table>
</template>
