<script setup>
import { ref, watch } from "vue";
import { useMessage } from "naive-ui";
const props = defineProps({
  show: Boolean,
  title: String,
  fields: Array,
  record: Object,
});
const emit = defineEmits(["update:show", "save"]);
const form = ref({});
const message = useMessage();
watch(
  () => props.show,
  (v) => {
    if (v) form.value = JSON.parse(JSON.stringify(props.record || {}));
  },
);
function save() {
  const missing = props.fields.find(
    (f) =>
      f.required &&
      (form.value[f.key] == null || String(form.value[f.key]).trim() === ""),
  );
  if (missing) return message.warning(`请填写${missing.label}`);
  if (
    form.value.phone &&
    !/^1\d{10}$|^0\d{2,3}-?\d{7,8}$/.test(form.value.phone)
  )
    return message.warning("请填写正确的联系电话");
  emit("save", form.value);
  emit("update:show", false);
}
</script>
<template>
  <n-modal
    :show="show"
    @update:show="$emit('update:show', $event)"
    preset="card"
    :title="title"
    style="width: 700px; max-width: 94vw"
    ><n-form label-placement="top" class="form-grid"
      ><n-form-item
        v-for="field in fields"
        :key="field.key"
        :label="field.label"
        :required="field.required"
        :class="{ wide: field.wide }"
        ><n-select
          v-if="field.options"
          v-model:value="form[field.key]"
          :options="
            field.options.map((x) =>
              typeof x === 'string' ? { label: x, value: x } : x,
            )
          "
          :placeholder="'请选择' + field.label" /><n-input-number
          v-else-if="field.type === 'number'"
          v-model:value="form[field.key]"
          :min="field.min ?? 0"
          :max="field.max"
          style="width: 100%" /><n-input
          v-else
          v-model:value="form[field.key]"
          :disabled="field.disabled"
          :type="field.type === 'textarea' ? 'textarea' : 'text'"
          :placeholder="'请输入' + field.label" /></n-form-item
    ></n-form>
    <div class="modal-actions">
      <n-button @click="$emit('update:show', false)">取消</n-button
      ><n-button type="primary" @click="save">保存</n-button>
    </div></n-modal
  >
</template>
