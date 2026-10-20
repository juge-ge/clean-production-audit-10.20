<template>
  <div class="phase-page">
    <el-tabs v-model="activeTab" type="border-card" class="solution-tabs">
      <el-tab-pane name="library">
        <template #label>
          <span class="tab-label"><el-icon><Collection /></el-icon> 方案库</span>
        </template>
        <SchemeLibrary />
      </el-tab-pane>

      <el-tab-pane name="recommend">
        <template #label>
          <span class="tab-label"><el-icon><MagicStick /></el-icon> 智能推荐</span>
        </template>
        <SchemeRecommend :enterprise="enterprise" />
      </el-tab-pane>

      <el-tab-pane name="implementation">
        <template #label>
          <span class="tab-label"><el-icon><Tickets /></el-icon> 保障实施</span>
        </template>
        <ImplementationPlan :enterprise="enterprise" />
      </el-tab-pane>
    </el-tabs>

    <!-- 阶段导航 -->
    <el-card class="phase-actions-card" shadow="never" body-style="padding: 14px 18px;">
      <div class="phase-actions">
        <el-button :icon="ArrowLeft" @click="goPhase('analysis')">上一步</el-button>
        <el-button type="primary" :icon="ArrowRight" @click="goPhase('summary')">下一步：成果总结</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Collection, MagicStick, Tickets, ArrowLeft, ArrowRight,
} from '@element-plus/icons-vue'
import SchemeLibrary from './components/SchemeLibrary.vue'
import SchemeRecommend from './components/SchemeRecommend.vue'
import ImplementationPlan from './components/ImplementationPlan.vue'
import { useImplementationPlan } from './components/useImplementationPlan'

defineOptions({ name: 'LiquorPhaseSolution' })

const props = defineProps({ enterprise: { type: Object, required: true } })
const router = useRouter()

const activeTab = ref('library')

// 让实施计划 composable 知道当前企业，便于按企业隔离计划
const plan = useImplementationPlan()
plan.setActiveEnterprise(props.enterprise?.enterpriseId)

function goPhase(key) {
  router.push(`/liquor/enterprise/${props.enterprise.enterpriseId}/${key}`)
}
</script>

<style scoped lang="scss">
.phase-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.solution-tabs {
  border-radius: 10px;
  :deep(.el-tabs__content) {
    padding: 14px 16px;
  }
}
.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}
.phase-actions-card {
  position: sticky;
  bottom: 0;
  z-index: 10;
  background: #fff;
  border-radius: 10px;
  border: 1px solid var(--el-border-color-lighter);
}
.phase-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
