<template>
  <div class="implementation-page">
    <!-- 实施计划表 -->
    <el-card class="plan-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">
            <el-icon><Tickets /></el-icon>
            清洁生产方案实施计划
            <el-tag type="info" effect="plain" size="small" round>{{ plan.list.value.length }} 项</el-tag>
          </span>
          <span class="hint">从「智能推荐」加入的方案将显示在此，可编辑责任部门、时间、进度</span>
        </div>
      </template>

      <!-- 汇总 -->
      <el-descriptions :column="4" border size="small" class="summary-desc">
        <el-descriptions-item label="方案数">{{ plan.summary.value.count }}</el-descriptions-item>
        <el-descriptions-item label="总投资(万元)">{{ formatNum(plan.summary.value.totalInvestment) }}</el-descriptions-item>
        <el-descriptions-item label="平均进度">{{ plan.summary.value.avgProgress }}%</el-descriptions-item>
        <el-descriptions-item label="状态分布">
          <el-tag
            v-for="(v, k) in plan.summary.value.statusCount"
            :key="k"
            :type="statusTag(k)"
            effect="plain"
            size="small"
            class="status-tag"
          >
            {{ k }}：{{ v }}
          </el-tag>
          <span v-if="!plan.summary.value.count">—</span>
        </el-descriptions-item>
      </el-descriptions>

      <vxe-table
        :data="plan.list.value"
        border
        round
        stripe
        show-overflow
        auto-resize
        :row-config="{ isHover: true, keyField: 'planId' }"
        :edit-config="{ trigger: 'click', mode: 'cell', showIcon: false }"
        :max-height="420"
        :empty-text="'暂无方案，请在「智能推荐」中点击「加入实施计划」'"
      >
        <vxe-column type="seq" title="序号" width="60" />
        <vxe-column field="name" title="方案名称" min-width="180" align="left" />
        <vxe-column field="schemeType" title="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="schemeTypeTag(row.schemeType)" effect="light" size="small">{{ row.schemeType }}</el-tag>
          </template>
        </vxe-column>
        <vxe-column field="investment" title="投资(万元)" width="110" align="right"
          :formatter="({ cellValue }) => formatNum(cellValue)" />
        <vxe-column field="responsibleDept" title="责任部门" width="140" align="left"
          :edit-render="{ name: 'VxeInput', props: { placeholder: '责任部门' } }" />
        <vxe-column field="startDate" title="计划开始" width="130" align="center"
          :edit-render="{ name: 'VxeInput', props: { placeholder: 'YYYY-MM-DD' } }" />
        <vxe-column field="endDate" title="计划完成" width="130" align="center"
          :edit-render="{ name: 'VxeInput', props: { placeholder: 'YYYY-MM-DD' } }" />
        <vxe-column field="progress" title="进度(%)" width="110" align="right"
          :edit-render="{ name: 'VxeNumberInput', props: { min: 0, max: 100, digits: 0, controls: false } }"
          :formatter="({ cellValue }) => (cellValue == null ? '-' : cellValue + '%')" />
        <vxe-column field="planStatus" title="状态" width="110" align="center"
          :edit-render="{ name: 'VxeSelect', options: STATUS_OPTIONS, props: { transfer: true } }">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.planStatus)" effect="plain" size="small">{{ row.planStatus }}</el-tag>
          </template>
        </vxe-column>
        <vxe-column title="操作" width="90" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" link size="small" :icon="Delete" @click="plan.remove(row.planId)">移除</el-button>
          </template>
        </vxe-column>
      </vxe-table>

      <div class="plan-actions">
        <el-button :icon="Delete" @click="confirmClear">清空计划</el-button>
        <el-button type="success" :icon="Check" @click="handleSave">保存提交</el-button>
      </div>
    </el-card>

    <!-- 保障措施 -->
    <el-card class="measures-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title"><el-icon><Stamp /></el-icon> 保障措施</span>
          <span class="hint">组织 / 资金 / 制度 / 监督 四方面保障</span>
        </div>
      </template>
      <el-form :model="measures" label-width="120px" label-position="right">
        <el-form-item label="组织保障">
          <el-input v-model="measures.organization" type="textarea" :rows="2"
            placeholder="成立清洁生产审核领导小组，明确职责分工..." />
        </el-form-item>
        <el-form-item label="资金保障">
          <el-input v-model="measures.funding" type="textarea" :rows="2"
            placeholder="落实方案实施资金，纳入年度预算..." />
        </el-form-item>
        <el-form-item label="制度保障">
          <el-input v-model="measures.institution" type="textarea" :rows="2"
            placeholder="建立清洁生产管理制度、考核与奖励办法..." />
        </el-form-item>
        <el-form-item label="监督保障">
          <el-input v-model="measures.supervision" type="textarea" :rows="2"
            placeholder="建立进度跟踪、阶段性评估与持续改进机制..." />
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Tickets, Stamp, Delete, Check } from '@element-plus/icons-vue'
import { schemeTypeTag } from '@/store/modules/liquorScheme'
import {
  useImplementationPlan,
  useImplementationMeasures,
} from './useImplementationPlan'

defineOptions({ name: 'ImplementationPlan' })

const props = defineProps({
  enterprise: { type: Object, default: () => ({}) },
})

const plan = useImplementationPlan()
const { measuresFor } = useImplementationMeasures()

watch(
  () => props.enterprise?.enterpriseId,
  (id) => {
    plan.setActiveEnterprise(id)
  },
  { immediate: true }
)

const measures = computed(() => measuresFor(props.enterprise?.enterpriseId))

const STATUS_OPTIONS = [
  { value: '待启动', label: '待启动' },
  { value: '进行中', label: '进行中' },
  { value: '已完成', label: '已完成' },
  { value: '已搁置', label: '已搁置' },
]

function statusTag(s) {
  const m = { 待启动: 'info', 进行中: 'warning', 已完成: 'success', 已搁置: 'danger' }
  return m[s] || 'info'
}

function formatNum(v) {
  if (v === null || v === undefined || v === '') return '-'
  const n = Number(v)
  if (!Number.isFinite(n)) return '-'
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

async function confirmClear() {
  if (!plan.list.value.length) return
  try {
    await ElMessageBox.confirm('确认清空当前实施计划吗？', '清空确认', {
      type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消',
    })
  } catch {
    return
  }
  plan.clearAll()
  ElMessage.info('已清空实施计划')
}

function handleSave() {
  // eslint-disable-next-line no-console
  console.group('[清洁生产方案实施计划] 保存提交')
  // eslint-disable-next-line no-console
  console.log('企业：', props.enterprise?.enterpriseName)
  // eslint-disable-next-line no-console
  console.log('实施计划：', plan.list.value)
  // eslint-disable-next-line no-console
  console.log('保障措施：', measures.value)
  // eslint-disable-next-line no-console
  console.groupEnd()
  ElMessage.success(`已保存 ${plan.list.value.length} 项实施计划，详情见控制台`)
}
</script>

<style scoped lang="scss">
.implementation-page { display: flex; flex-direction: column; gap: 16px; }
.plan-card, .measures-card {
  border-radius: 10px;
  border: 1px solid var(--el-border-color-lighter);
  :deep(.el-card__header) { padding: 14px 18px; }
  :deep(.el-card__body) { padding: 12px 14px 16px; }
}
.card-header {
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;
  .title { display: inline-flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; }
  .hint { color: var(--el-text-color-secondary); font-size: 12px; }
}
.summary-desc { margin-bottom: 12px; }
.status-tag { margin-right: 6px; }
.plan-actions {
  display: flex; justify-content: flex-end; gap: 10px;
  margin-top: 12px; padding-top: 12px;
  border-top: 1px dashed var(--el-border-color-lighter);
}
</style>
