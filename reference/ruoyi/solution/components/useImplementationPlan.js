/**
 * 实施计划 composable —— 跨"智能推荐"与"保障实施"两个 Tab 共享选中的方案
 *
 * 使用模块级 reactive 单例，避免依赖父组件 provide。
 * 持久化到 localStorage，按企业维度隔离。
 */
import { reactive, computed, watch } from 'vue'

const STORAGE_KEY = 'liquor_implementation_plan_v1'

// 模块级单例状态
const state = reactive({
  // 按 enterpriseId 隔离的计划：{ [enterpriseId]: [planItem, ...] }
  plans: loadFromStorage(),
  // 当前激活的企业ID（由 solution/index.vue 设置）
  activeEnterpriseId: null,
})

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (e) {
    console.warn('[useImplementationPlan] 读取失败', e)
    return {}
  }
}

watch(
  () => state.plans,
  (v) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
    } catch (e) {
      console.warn('[useImplementationPlan] 保存失败', e)
    }
  },
  { deep: true }
)

let autoPlanId = 10000

function ensureList() {
  const id = state.activeEnterpriseId || '__default__'
  if (!state.plans[id]) state.plans[id] = []
  return state.plans[id]
}

export function useImplementationPlan() {
  const list = computed(() => ensureList())

  function setActiveEnterprise(id) {
    state.activeEnterpriseId = id
  }

  function add(scheme) {
    const arr = ensureList()
    if (arr.find((p) => p.schemeId === scheme.schemeId)) return
    autoPlanId += 1
    arr.push({
      planId: autoPlanId,
      schemeId: scheme.schemeId,
      name: scheme.name,
      schemeType: scheme.schemeType,
      category: scheme.category,
      relatedIndicator: scheme.relatedIndicator,
      investment: scheme.investment,
      paybackPeriod: scheme.paybackPeriod,
      description: scheme.description,
      matchScore: scheme.matchScore,
      matchReason: scheme.matchReason,
      // 计划字段（用户填写）
      responsibleDept: '',
      startDate: '',
      endDate: '',
      progress: 0,
      planStatus: '待启动',
    })
  }

  function remove(planId) {
    const arr = ensureList()
    const idx = arr.findIndex((p) => p.planId === planId)
    if (idx > -1) arr.splice(idx, 1)
  }

  function clearAll() {
    state.plans[state.activeEnterpriseId || '__default__'] = []
  }

  function updateRow(planId, patch) {
    const arr = ensureList()
    const row = arr.find((p) => p.planId === planId)
    if (row) Object.assign(row, patch)
  }

  // 统计
  const summary = computed(() => {
    const arr = ensureList()
    const totalInvestment = arr.reduce(
      (s, r) => s + (Number(r.investment) || 0), 0
    )
    const avgProgress =
      arr.length === 0
        ? 0
        : Math.round(arr.reduce((s, r) => s + (Number(r.progress) || 0), 0) / arr.length)
    const statusCount = arr.reduce((m, r) => {
      m[r.planStatus] = (m[r.planStatus] || 0) + 1
      return m
    }, {})
    return {
      count: arr.length,
      totalInvestment: Number(totalInvestment.toFixed(2)),
      avgProgress,
      statusCount,
    }
  })

  return {
    list,
    summary,
    setActiveEnterprise,
    add,
    remove,
    clearAll,
    updateRow,
  }
}

// 保障措施文本（同样按企业隔离 + 持久化）
const MEASURES_KEY = 'liquor_implementation_measures_v1'
const measuresState = reactive({
  data: loadMeasures(),
})

function loadMeasures() {
  try {
    const raw = localStorage.getItem(MEASURES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (e) {
    return {}
  }
}

watch(
  () => measuresState.data,
  (v) => {
    try {
      localStorage.setItem(MEASURES_KEY, JSON.stringify(v))
    } catch (e) { /* ignore */ }
  },
  { deep: true }
)

export function useImplementationMeasures() {
  function measuresFor(id) {
    const key = id || '__default__'
    if (!measuresState.data[key]) {
      measuresState.data[key] = {
        organization: '',
        funding: '',
        institution: '',
        supervision: '',
      }
    }
    return measuresState.data[key]
  }
  return { measuresFor }
}
