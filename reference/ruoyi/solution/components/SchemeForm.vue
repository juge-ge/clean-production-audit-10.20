<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '修改方案' : '新增方案'"
    width="780px"
    :close-on-click-modal="false"
    append-to-body
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      label-position="right"
    >
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="方案名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入方案名称" maxlength="200" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="方案类型" prop="schemeType">
            <el-select v-model="form.schemeType" placeholder="请选择" style="width: 100%">
              <el-option v-for="o in SCHEME_TYPE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="所属类别" prop="category">
            <el-select v-model="form.category" placeholder="请选择" style="width: 100%">
              <el-option v-for="o in CATEGORY_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="对应指标" prop="relatedIndicator">
            <el-input v-model="form.relatedIndicator" placeholder="对应的具体指标名称" maxlength="200" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="投资费用(万元)" prop="investment">
            <el-input-number v-model="form.investment" :min="0" :precision="2" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="投资回收期(年)" prop="paybackPeriod">
            <el-input-number v-model="form.paybackPeriod" :min="0" :precision="2" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="适用阶段" prop="applicableStage">
            <el-select v-model="form.applicableStage" placeholder="请选择" style="width: 100%">
              <el-option v-for="o in APPLICABLE_STAGE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="显示顺序" prop="sortOrder">
            <el-input-number v-model="form.sortOrder" :min="0" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="问题描述" prop="problem">
            <el-input v-model="form.problem" type="textarea" :rows="2" placeholder="现有问题" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="方案描述" prop="description">
            <el-input v-model="form.description" type="textarea" :rows="2" placeholder="方案主要内容" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="实施要点" prop="implementation">
            <el-input v-model="form.implementation" type="textarea" :rows="2" placeholder="实施要点" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="经济效益" prop="economicBenefit">
            <el-input v-model="form.economicBenefit" type="textarea" :rows="2" placeholder="经济效益" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="环境效益" prop="environmentalBenefit">
            <el-input v-model="form.environmentalBenefit" type="textarea" :rows="2" placeholder="环境效益" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态" prop="status">
            <el-radio-group v-model="form.status">
              <el-radio value="0">正常</el-radio>
              <el-radio value="1">停用</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="备注" prop="remark">
            <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注" maxlength="500" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import useLiquorSchemeStore, {
  SCHEME_TYPE_OPTIONS,
  CATEGORY_OPTIONS,
  APPLICABLE_STAGE_OPTIONS,
} from '@/store/modules/liquorScheme'

defineOptions({ name: 'SchemeForm' })

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  data: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue', 'success'])

const store = useLiquorSchemeStore()
const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const isEdit = computed(() => !!props.data?.schemeId)
const formRef = ref(null)
const submitting = ref(false)

const defaultForm = () => ({
  schemeId: undefined,
  name: '',
  relatedIndicator: '',
  schemeType: '技术改造',
  problem: '',
  description: '',
  implementation: '',
  economicBenefit: '',
  investment: 0,
  paybackPeriod: 0,
  environmentalBenefit: '',
  applicableStage: '0',
  category: '',
  sortOrder: 0,
  status: '0',
  remark: '',
})

const form = reactive(defaultForm())

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      Object.assign(form, defaultForm(), props.data || {})
    }
  }
)

const rules = {
  name: [{ required: true, message: '请输入方案名称', trigger: 'blur' }],
  schemeType: [{ required: true, message: '请选择方案类型', trigger: 'change' }],
}

async function submit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    if (isEdit.value) {
      await store.update(form.schemeId, { ...form })
      ElMessage.success('修改成功')
    } else {
      await store.create({ ...form })
      ElMessage.success('新增成功')
    }
    emit('success')
    visible.value = false
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
