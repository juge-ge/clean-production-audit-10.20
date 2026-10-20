<template>
  <el-card class="recommend-card" shadow="never">
    <template #header>
      <div class="card-header">
        <span class="title">
          <el-icon><MagicStick /></el-icon>
          大模型智能方案推荐
          <el-tag type="warning" effect="plain" size="small" round>规则预筛 + LLM 打分</el-tag>
        </span>
        <span class="hint">基于企业诊断与评价指标自动匹配最佳清洁生产方案</span>
      </div>
    </template>

    <!-- 诊断输入 -->
    <el-form :model="dto" label-width="120px" label-position="right" class="dto-form">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="企业名称">
            <el-input v-model="dto.enterpriseName" placeholder="企业名称" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="清洁生产水平">
            <el-tag :type="overallLevelTag" effect="dark" size="default">{{ dto.overallLevel || '待评估' }}</el-tag>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="YⅠ"><el-input-number v-model="dto.y1" :precision="2" controls-position="right" style="width: 100%" /></el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="YⅡ"><el-input-number v-model="dto.y2" :precision="2" controls-position="right" style="width: 100%" /></el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="YⅢ"><el-input-number v-model="dto.y3" :precision="2" controls-position="right" style="width: 100%" /></el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="重点改进指标">
            <el-select
              v-model="dto.targetIndicators"
              multiple
              filterable
              allow-create
              placeholder="选择或输入重点改进的指标名称"
              style="width: 100%"
            >
              <el-option-group
                v-for="group in indicatorGroups"
                :key="group.label"
                :label="group.label"
              >
                <el-option
                  v-for="ind in group.options"
                  :key="ind"
                  :label="ind"
                  :value="ind"
                />
              </el-option-group>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="推荐数量">
            <el-input-number v-model="dto.topN" :min="1" :max="20" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label=" ">
            <el-button type="primary" :icon="MagicStick" :loading="store.recommendLoading" @click="runRecommend">
              智能匹配方案
            </el-button>
            <el-button :icon="RefreshLeft" @click="store.clearRecommend()">清空结果</el-button>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <!-- 推荐结果 -->
    <el-divider content-position="left">推荐结果</el-divider>

    <el-empty v-if="!store.recommendResult.length && !store.recommendLoading" description="尚未生成推荐，请填写诊断后点击「智能匹配方案」" />

    <div v-else class="result-list">
      <el-card
        v-for="(item, idx) in store.recommendResult"
        :key="item.schemeId"
        class="result-item"
        shadow="hover"
      >
        <div class="result-head">
          <span class="rank">No.{{ idx + 1 }}</span>
          <span class="name">{{ item.name }}</span>
          <el-tag :type="schemeTypeTag(item.schemeType)" effect="light" size="small">{{ item.schemeType }}</el-tag>
          <el-tag type="info" effect="plain" size="small">{{ item.category }}</el-tag>
          <span class="score">
            匹配得分：<b>{{ formatScore(item.matchScore) }}</b>
          </span>
        </div>
        <el-descriptions :column="4" border size="small" class="result-desc">
          <el-descriptions-item label="对应指标">{{ item.relatedIndicator || '-' }}</el-descriptions-item>
          <el-descriptions-item label="投资(万元)">{{ formatNum(item.investment) }}</el-descriptions-item>
          <el-descriptions-item label="回收期(年)">{{ formatNum(item.paybackPeriod) }}</el-descriptions-item>
          <el-descriptions-item label="操作">
            <el-button type="success" size="small" :icon="Plus" @click="addToPlan(item)">加入实施计划</el-button>
          </el-descriptions-item>
        </el-descriptions>
        <div v-if="item.description" class="desc-block">
          <span class="label">方案描述：</span>{{ item.description }}
        </div>
        <div v-if="item.matchReason" class="desc-block reason">
          <span class="label">匹配理由：</span>{{ item.matchReason }}
        </div>
      </el-card>
    </div>
  </el-card>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { MagicStick, Plus, RefreshLeft } from '@element-plus/icons-vue'
import useLiquorSchemeStore, { schemeTypeTag } from '@/store/modules/liquorScheme'
import { useSharedAssessmentSummary } from '../../analysis/composables/useCleanProductionAssessment'
import { useImplementationPlan } from './useImplementationPlan'

defineOptions({ name: 'SchemeRecommend' })

const props = defineProps({
  enterprise: { type: Object, default: () => ({}) },
})

const store = useLiquorSchemeStore()

// 跨路由读取分析阶段发布的评估结论（overallLevel / y1/y2/y3 / weakIndicators）
const summary = useSharedAssessmentSummary()

// 实施计划 composable（跨组件共享选中方案）
const plan = useImplementationPlan()

const dto = reactive({
  enterpriseId: undefined,
  enterpriseName: '',
  overallLevel: '',
  y1: 0,
  y2: 0,
  y3: 0,
  targetIndicators: [],
  surveySummaryJson: '',
  topN: 5,
})

// 同步企业名称
watch(
  () => props.enterprise,
  (e) => {
    if (e) {
      dto.enterpriseId = e.enterpriseId
      dto.enterpriseName = e.enterpriseName
    }
  },
  { immediate: true }
)

// 同步评估结论：清洁生产水平 / YⅠ YⅡ YⅢ / 重点改进指标自动填充
watch(
  () => [
    summary.ready,
    summary.overallLevel,
    summary.y1,
    summary.y2,
    summary.y3,
    summary.weakIndicators,
  ],
  () => {
    if (summary.ready) {
      dto.overallLevel = summary.overallLevel || ''
      dto.y1 = Number(summary.y1 || 0)
      dto.y2 = Number(summary.y2 || 0)
      dto.y3 = Number(summary.y3 || 0)
      // 首次进入或用户未手动改过时，自动选中全部"未达 Ⅰ级"指标作为重点改进
      if (!dto.targetIndicators.length && summary.weakIndicators.length) {
        dto.targetIndicators = summary.weakIndicators.map((i) => i.name)
      }
    }
  },
  { immediate: true, deep: true }
)

// 重点改进指标候选（按一级类别分组，来源共享摘要中的 weakIndicators）
const indicatorGroups = computed(() => {
  const groups = {}
  summary.weakIndicators.forEach((i) => {
    if (!i.category) return
    if (!groups[i.category]) groups[i.category] = []
    groups[i.category].push(i.name)
  })
  return Object.entries(groups).map(([label, options]) => ({ label, options }))
})

const overallLevelTag = computed(() => {
  const m = { 'Ⅰ级': 'success', 'Ⅱ级': 'primary', 'Ⅲ级': 'warning', 不达标: 'danger', 待评估: 'info' }
  return m[dto.overallLevel] || 'info'
})

async function runRecommend() {
  if (!dto.targetIndicators.length) {
    ElMessage.warning('请选择或输入重点改进指标')
    return
  }
  try {
    const list = await store.recommend({ ...dto })
    ElMessage.success(`已生成 ${list.length} 条推荐方案`)
  } catch (e) {
    ElMessage.error('智能匹配失败，请稍后重试')
  }
}

function addToPlan(item) {
  plan.add(item)
  ElMessage.success(`已加入实施计划：${item.name}`)
}

function formatNum(v) {
  if (v === null || v === undefined || v === '') return '-'
  const n = Number(v)
  if (!Number.isFinite(n)) return '-'
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}
function formatScore(v) {
  if (v === null || v === undefined || v === '') return '-'
  return Number(v).toFixed(2)
}
</script>

<style scoped lang="scss">
.recommend-card {
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
.dto-form { margin-top: 4px; }
.result-list { display: flex; flex-direction: column; gap: 12px; }
.result-item {
  border-radius: 8px;
  :deep(.el-card__body) { padding: 12px 14px; }
}
.result-head {
  display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px;
  .rank {
    display: inline-block; padding: 1px 8px; border-radius: 10px;
    background: var(--el-color-primary); color: #fff; font-size: 12px; font-weight: 600;
  }
  .name { font-size: 15px; font-weight: 600; color: var(--el-text-color-primary); }
  .score {
    margin-left: auto;
    b { color: var(--el-color-warning-dark-2); font-family: 'Consolas', 'Monaco', monospace; font-size: 16px; }
  }
}
.result-desc { margin-bottom: 8px; }
.desc-block {
  font-size: 13px; color: var(--el-text-color-regular); line-height: 1.7; margin-top: 4px;
  .label { color: var(--el-text-color-secondary); font-weight: 600; }
  &.reason .label { color: var(--el-color-success-dark-2); }
}
</style>
