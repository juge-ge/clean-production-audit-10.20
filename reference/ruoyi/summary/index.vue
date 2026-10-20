<template>
  <div class="phase-page">
    <!-- 标题卡 -->
    <el-card class="phase-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">
            <el-icon><Trophy /></el-icon> 成果总结
          </span>
          <span class="hint">
            汇总各阶段成果，自动生成《{{ enterprise.enterpriseName }}清洁生产审核报告》
          </span>
        </div>
      </template>

      <!-- 顶部企业信息条 + 状态 -->
      <div class="ent-summary">
        <div class="ent-summary__left">
          <div class="ent-name">
            <el-icon><OfficeBuilding /></el-icon>
            <span>{{ enterprise.enterpriseName }}</span>
            <el-tag size="small" effect="plain" :type="natureTag">
              {{ natureText }}
            </el-tag>
          </div>
          <div class="ent-meta">
            <span><el-icon><Location /></el-icon> {{ enterprise.city || '—' }} {{ enterprise.county || '' }}</span>
            <span><el-icon><User /></el-icon> {{ enterprise.legalPerson || '—' }}</span>
            <span><el-icon><Box /></el-icon> {{ industryText }}</span>
          </div>
        </div>
        <div class="ent-summary__right">
          <el-tag
            :type="overallStatusTag.type"
            :effect="overallStatusTag.effect"
            size="large"
          >
            {{ overallStatusTag.text }}
          </el-tag>
        </div>
      </div>

      <!-- KPI 4 卡 -->
      <div class="kpi-row">
        <el-card class="kpi" shadow="hover">
          <div class="kpi-label">综合评价指数（Y_Ⅱ）</div>
          <div class="kpi-value" :class="{ ok: kpi.score >= 85 }">{{ kpi.score.toFixed(1) }}</div>
          <div class="kpi-foot">Ⅱ 级准入：≥ 85</div>
        </el-card>
        <el-card class="kpi" shadow="hover">
          <div class="kpi-label">清洁生产水平</div>
          <div class="kpi-value grade">{{ kpi.grade }}</div>
          <div class="kpi-foot">依据 GB/T 33761、T/CAEPI 92-2024</div>
        </el-card>
        <el-card class="kpi" shadow="hover">
          <div class="kpi-label">识别问题（项）</div>
          <div class="kpi-value warn">{{ kpi.problems }}</div>
          <div class="kpi-foot">含限定性 {{ kpi.limitProblems }} 项 + 一般 {{ kpi.problems - kpi.limitProblems }} 项</div>
        </el-card>
        <el-card class="kpi" shadow="hover">
          <div class="kpi-label">方案预期年节约</div>
          <div class="kpi-value money">{{ kpi.annualSaving }} <small>万元</small></div>
          <div class="kpi-foot">无/低费 {{ kpi.lowSaving }} + 中/高费 {{ kpi.highSaving }}</div>
        </el-card>
      </div>

      <!-- 阶段完成度 -->
      <el-card class="block" shadow="never">
        <template #header>
          <div class="block-header">
            <span><el-icon><Histogram /></el-icon> 阶段完成度</span>
            <span class="muted">共 6 个阶段，已完成 {{ doneCount }} / {{ PHASES.length }}</span>
          </div>
        </template>
        <div class="progress-list">
          <div v-for="p in phaseRows" :key="p.key" class="progress-item">
            <div class="progress-item__head">
              <span class="progress-item__title">
                <el-tag size="small" :type="p.tagType" effect="light">{{ p.statusText }}</el-tag>
                {{ p.title }}
              </span>
              <span class="progress-item__desc">{{ p.desc }}</span>
            </div>
            <el-progress
              :percentage="p.percent"
              :status="p.barStatus"
              :stroke-width="10"
              :show-text="false"
            />
          </div>
        </div>
      </el-card>

      <!-- 报告配置 -->
      <el-card class="block" shadow="never">
        <template #header>
          <div class="block-header">
            <span><el-icon><Setting /></el-icon> 报告配置</span>
            <span class="muted">下列内容将写入 Word 封面与扉页</span>
          </div>
        </template>
        <el-form :model="reportForm" label-width="110px" class="report-form">
          <el-row :gutter="20">
            <el-col :md="8" :sm="12" :xs="24">
              <el-form-item label="报告阶段">
                <el-radio-group v-model="reportForm.reportStage">
                  <el-radio-button value="送审稿">送审稿</el-radio-button>
                  <el-radio-button value="实施稿">实施稿</el-radio-button>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :md="8" :sm="12" :xs="24">
              <el-form-item label="技术服务单位">
                <el-input v-model="reportForm.techProvider" placeholder="例：XX 清洁生产技术服务有限公司" />
              </el-form-item>
            </el-col>
            <el-col :md="8" :sm="12" :xs="24">
              <el-form-item label="项目负责人">
                <el-input v-model="reportForm.projectLeader" placeholder="负责人姓名" />
              </el-form-item>
            </el-col>
            <el-col :md="8" :sm="12" :xs="24">
              <el-form-item label="报告编号">
                <el-input v-model="reportForm.reportNo" placeholder="自动生成，可修改" />
              </el-form-item>
            </el-col>
            <el-col :md="16" :sm="24" :xs="24">
              <el-form-item label="包含章节">
                <el-checkbox-group v-model="reportForm.sections">
                  <el-checkbox value="cover">封面/扉页</el-checkbox>
                  <el-checkbox value="ch1">一、企业基本情况</el-checkbox>
                  <el-checkbox value="ch2">二、审核组织与宣贯</el-checkbox>
                  <el-checkbox value="ch3">三、现状调研与对标</el-checkbox>
                  <el-checkbox value="ch4">四、问题分析与目标</el-checkbox>
                  <el-checkbox value="ch5">五、方案研制与实施</el-checkbox>
                  <el-checkbox value="ch6">六、成果总结</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </el-card>

      <!-- 报告生成结果 -->
      <el-card class="block" shadow="never">
        <template #header>
          <div class="block-header">
            <span><el-icon><Document /></el-icon> 报告生成</span>
            <span class="muted">符合规范：仿宋GB2312 / 黑体小二 / 1.5 倍行距 / 段前 0.5 行 / 表头加粗</span>
          </div>
        </template>

        <div class="report-result">
          <el-alert
            v-if="!reportBlob"
            type="info"
            :closable="false"
            show-icon
            title="尚未生成报告"
            description="确认上方配置后，点击「生成报告」按钮，平台将按规范要求生成 Word 文档。"
          />
          <el-result
            v-else
            icon="success"
            title="报告已生成"
            :sub-title="`文件：${currentFileName}（${(reportBlob.size / 1024).toFixed(1)} KB）`"
          >
            <template #extra>
              <el-space>
                <el-tag type="success">仿宋GB2312</el-tag>
                <el-tag type="success">黑体</el-tag>
                <el-tag>1.5 倍行距</el-tag>
                <el-tag>段前 0.5 行</el-tag>
                <el-tag info>含 {{ reportForm.sections.length }} 个章节</el-tag>
              </el-space>
            </template>
          </el-result>
        </div>

        <div class="report-actions">
          <el-button
            type="primary"
            :icon="MagicStick"
            :loading="generating"
            @click="handleGenerate"
          >
            生成报告
          </el-button>
          <el-button
            :icon="View"
            :disabled="!reportData"
            @click="handlePreview"
          >
            预览报告
          </el-button>
          <el-button
            type="success"
            :icon="Download"
            :disabled="!reportBlob"
            @click="handleDownload"
          >
            下载 Word
          </el-button>
        </div>
      </el-card>

      <!-- 底部导航 -->
      <div class="phase-actions">
        <el-button :icon="ArrowLeft" @click="goPhase('solution')">上一步</el-button>
        <el-button type="success" :icon="Check" @click="onComplete">完成审核</el-button>
      </div>
    </el-card>

    <!-- 预览 Modal -->
    <el-dialog
      v-model="previewVisible"
      title="清洁生产审核报告 - 内容预览"
      width="900px"
      top="6vh"
      destroy-on-close
    >
      <div v-if="reportData" class="preview-doc">
        <!-- 封面 -->
        <section class="prev-section prev-cover">
          <h1 class="prev-cover-title">清洁生产审核报告</h1>
          <p class="prev-cover-stage">（{{ reportData.reportStage }}）</p>
          <p class="prev-cover-ent">{{ reportData.enterprise.enterpriseName }}</p>
          <p class="prev-cover-meta">报告编号：{{ reportData.reportNo }}</p>
          <p class="prev-cover-meta">编制单位：{{ reportData.techProvider }}</p>
          <p class="prev-cover-meta">编制日期：{{ reportData.reportDate }}</p>
        </section>

        <!-- 章节摘要 -->
        <section class="prev-section">
          <h2>一、企业基本情况</h2>
          <p>{{ reportData.enterprise.enterpriseName }}（统一社会信用代码：{{ reportData.enterprise.creditCode }}）<br />
          所在地区：{{ reportData.enterprise.city }} {{ reportData.enterprise.county }}；行业：{{ reportData.enterprise.industryLabel }}；主营产品：{{ reportData.enterprise.mainProducts }}。</p>
        </section>

        <section class="prev-section">
          <h2>二、审核工作组织与宣贯</h2>
          <p>由总经理任组长，{{ reportData.techProvider }} 派 {{ reportData.consultantCount }} 名咨询师参与，开展 {{ reportData.trainingCount }} 次培训共 {{ reportData.trainingPersonTimes }} 人次。</p>
        </section>

        <section class="prev-section">
          <h2>三、现状调研与水平对标</h2>
          <ul>
            <li>吨酒综合能耗 {{ reportData.energyPerProduct }} tce/t（Ⅱ级）</li>
            <li>吨酒新鲜水耗 {{ reportData.waterPerProduct }} m³/t（Ⅱ级）</li>
            <li>年综合 CO₂ 排放约 {{ reportData.co2Emission }} t</li>
          </ul>
        </section>

        <section class="prev-section">
          <h2>四、问题分析与目标设置</h2>
          <p>共识别 5 项重点问题，覆盖能耗、水耗、综合利用、管理信息化等方面，限定性指标已达 Ⅱ 级及以上。</p>
        </section>

        <section class="prev-section">
          <h2>五、清洁生产方案研制与实施</h2>
          <p>无/低费方案 5 项（投资 33 万元，年节约 112 万元）；中/高费方案 3 项（投资 1,210 万元，年节约 560 万元）。</p>
        </section>

        <section class="prev-section">
          <h2>六、成果总结</h2>
          <p>综合评价指数 Y_Ⅰ={{ reportData.summary.score.yI }}、Y_Ⅱ={{ reportData.summary.score.yII }}、Y_Ⅲ={{ reportData.summary.score.yIII }}。</p>
          <p>整体水平：<b>{{ reportData.summary.grade }}</b></p>
          <p>建议：建立长效推进机制 / 推进 EMS 与水平衡监测 / 推动酒糟高值化利用 / 2 个月内编制实施稿。</p>
        </section>
      </div>

      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button type="success" :icon="Download" :disabled="!reportBlob" @click="handleDownload">下载 Word</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { saveAs } from 'file-saver'
import {
  Trophy, ArrowLeft, Check, OfficeBuilding, Location, User, Box,
  Histogram, Setting, Document, MagicStick, View, Download,
} from '@element-plus/icons-vue'
import useLiquorEnterpriseStore, {
  PHASES, industryLabel, natureLabel, natureTagType,
} from '@/store/modules/liquorEnterprise'
import {
  generateLiquorReport,
  buildReportFileName,
  mockReportData,
} from '@/utils/liquor-report'

defineOptions({ name: 'LiquorPhaseSummary' })

const props = defineProps({
  enterprise: { type: Object, required: true },
})

const router = useRouter()
const store = useLiquorEnterpriseStore()

/* ============== 派生展示数据 ============== */

const industryText = computed(() => industryLabel(props.enterprise.industry))
const natureText = computed(() => natureLabel(props.enterprise.enterpriseNature))
const natureTag = computed(() => natureTagType(props.enterprise.enterpriseNature) || 'info')

const STATUS_TEXT = {
  pending: '待开始',
  doing: '进行中',
  done: '已完成',
}
const STATUS_TAG = {
  pending: 'info',
  doing: 'warning',
  done: 'success',
}
const STATUS_PERCENT = { pending: 0, doing: 60, done: 100 }
const STATUS_BAR = { pending: '', doing: 'warning', done: 'success' }

const phaseRows = computed(() =>
  PHASES.map((p) => {
    const status = props.enterprise?.phaseStatus?.[p.key] || 'pending'
    return {
      ...p,
      status,
      statusText: STATUS_TEXT[status],
      tagType: STATUS_TAG[status],
      percent: STATUS_PERCENT[status],
      barStatus: STATUS_BAR[status],
    }
  }),
)

const doneCount = computed(() => phaseRows.value.filter((p) => p.status === 'done').length)

const overallStatusTag = computed(() => {
  if (doneCount.value === PHASES.length) {
    return { type: 'success', effect: 'dark', text: '审核流程已全部完成' }
  }
  if (doneCount.value === 0) {
    return { type: 'info', effect: 'plain', text: '尚未开始' }
  }
  return { type: 'warning', effect: 'dark', text: `进行中（${doneCount.value} / ${PHASES.length}）` }
})

// KPI（mock + 后续可接真实数据）
const kpi = reactive({
  score: 91.2,
  grade: 'Ⅱ 级',
  problems: 12,
  limitProblems: 5,
  annualSaving: 672,
  lowSaving: 112,
  highSaving: 560,
})

/* ============== 报告配置 ============== */

const reportForm = reactive({
  reportStage: '送审稿',
  techProvider: '某清洁生产技术服务有限公司',
  projectLeader: '张工',
  reportNo: `CP-${new Date().getFullYear()}-${String(props.enterprise.enterpriseId || 1).padStart(4, '0')}`,
  sections: ['cover', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6'],
})

// 切换企业时重置已生成的报告
watch(
  () => props.enterprise?.enterpriseId,
  () => {
    reportBlob.value = null
    reportData.value = null
  },
)

/* ============== 报告生成 / 预览 / 下载 ============== */

const generating = ref(false)
const reportBlob = ref(null)
const reportData = ref(null)
const currentFileName = ref('')
const previewVisible = ref(false)

async function handleGenerate() {
  if (!reportForm.sections.length) {
    ElMessage.warning('至少选择一个章节')
    return
  }
  generating.value = true
  try {
    const data = mockReportData(props.enterprise, {
      reportStage:   reportForm.reportStage,
      techProvider:  reportForm.techProvider,
      projectLeader: reportForm.projectLeader,
      reportNo:      reportForm.reportNo,
    })
    // 调整 summary KPI 体现选项变化
    data.summary.score.yII = kpi.score
    data.summary.grade = `${kpi.grade}（准入水平）`

    const blob = await generateLiquorReport(data)
    reportBlob.value = blob
    reportData.value = data
    currentFileName.value = buildReportFileName(props.enterprise, reportForm.reportStage)
    // 标记本阶段为「已完成」
    store.setPhaseStatus(props.enterprise.enterpriseId, 'summary', 'done')
    ElMessage.success('报告已生成，可预览或下载')
  } catch (err) {
    console.error('[LiquorReport] 生成失败：', err)
    ElMessage.error('报告生成失败：' + (err?.message || '未知错误'))
  } finally {
    generating.value = false
  }
}

function handlePreview() {
  if (!reportData.value) {
    ElMessage.info('请先点击「生成报告」')
    return
  }
  previewVisible.value = true
}

function handleDownload() {
  if (!reportBlob.value) {
    ElMessage.warning('请先点击「生成报告」')
    return
  }
  saveAs(reportBlob.value, currentFileName.value)
}

/* ============== 阶段导航 ============== */

function goPhase(key) {
  router.push(`/liquor/enterprise/${props.enterprise.enterpriseId}/${key}`)
}

async function onComplete() {
  try {
    await ElMessageBox.confirm(
      `确认将《${props.enterprise.enterpriseName}》本轮清洁生产审核流程标记为已完成吗？`,
      '完成审核',
      { type: 'success', confirmButtonText: '确认完成', cancelButtonText: '再看看' },
    )
    PHASES.forEach((p) => {
      store.setPhaseStatus(props.enterprise.enterpriseId, p.key, 'done')
    })
    ElMessage.success(`「${props.enterprise.enterpriseName}」清洁生产审核流程已完成`)
  } catch {
    /* user cancel */
  }
}
</script>

<style scoped lang="scss">
.phase-page { display: flex; flex-direction: column; gap: 16px; }
.phase-card {
  border-radius: 10px;
  border: 1px solid var(--el-border-color-lighter);
  :deep(.el-card__header) { padding: 14px 18px; }
  :deep(.el-card__body) { padding: 18px; }
}
.card-header {
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;
  .title { display: inline-flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; }
  .hint { color: var(--el-text-color-secondary); font-size: 12px; }
}

/* 企业摘要 */
.ent-summary {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 16px; border-radius: 8px;
  background: linear-gradient(135deg, #f0f6ff 0%, #f7f3ff 100%);
  border: 1px solid var(--el-border-color-lighter);
  margin-bottom: 16px;
  .ent-name {
    display: flex; align-items: center; gap: 8px;
    font-size: 16px; font-weight: 600; margin-bottom: 6px;
    .el-icon { color: var(--el-color-primary); }
  }
  .ent-meta {
    display: flex; gap: 18px; flex-wrap: wrap;
    color: var(--el-text-color-secondary); font-size: 13px;
    span { display: inline-flex; align-items: center; gap: 4px; }
  }
}

/* KPI */
.kpi-row { display: grid; gap: 12px; grid-template-columns: repeat(4, 1fr); margin-bottom: 16px; }
.kpi {
  border-radius: 10px; border: 1px solid var(--el-border-color-lighter);
  :deep(.el-card__body) { padding: 14px 16px; }
  .kpi-label { color: var(--el-text-color-secondary); font-size: 13px; }
  .kpi-value {
    margin: 6px 0 4px; font-size: 26px; font-weight: 700;
    color: var(--el-color-primary);
    small { font-size: 13px; color: var(--el-text-color-secondary); margin-left: 4px; font-weight: 500; }
    &.ok    { color: var(--el-color-success); }
    &.warn  { color: var(--el-color-warning); }
    &.money { color: var(--el-color-danger); }
    &.grade { font-size: 22px; color: var(--el-color-success); }
  }
  .kpi-foot { color: var(--el-text-color-secondary); font-size: 12px; }
}
@media (max-width: 1100px) { .kpi-row { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px)  { .kpi-row { grid-template-columns: 1fr; } }

/* 通用 block */
.block {
  border-radius: 10px; border: 1px solid var(--el-border-color-lighter);
  margin-bottom: 16px;
  :deep(.el-card__header) { padding: 12px 16px; }
  :deep(.el-card__body)   { padding: 16px; }
}
.block-header {
  display: flex; justify-content: space-between; align-items: center;
  font-weight: 600;
  .el-icon { margin-right: 6px; color: var(--el-color-primary); }
  .muted { color: var(--el-text-color-secondary); font-size: 12px; font-weight: normal; }
}

/* 进度列表 */
.progress-list { display: flex; flex-direction: column; gap: 12px; }
.progress-item {
  &__head {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 6px; flex-wrap: wrap; gap: 8px;
  }
  &__title { display: inline-flex; align-items: center; gap: 8px; font-weight: 500; }
  &__desc  { color: var(--el-text-color-secondary); font-size: 12px; }
}

/* 报告表单 */
.report-form :deep(.el-form-item) { margin-bottom: 12px; }

/* 报告结果 */
.report-result { margin-bottom: 16px; }
.report-actions { display: flex; justify-content: flex-end; gap: 10px; }

/* 底部 */
.phase-actions {
  margin-top: 18px; padding-top: 12px; display: flex; justify-content: flex-end; gap: 10px;
  border-top: 1px dashed var(--el-border-color-lighter);
}

/* 预览 */
.preview-doc {
  max-height: 65vh; overflow-y: auto;
  padding: 8px 4px;
  font-family: '仿宋', '仿宋_GB2312', 'FangSong', serif;
  color: #222;
  .prev-section { margin-bottom: 18px; line-height: 1.8; }
  .prev-section h2 { font-size: 17px; font-weight: 700; margin: 10px 0 6px; color: #2b3a4a; }
  .prev-section p { text-indent: 2em; margin: 4px 0; }
  .prev-section ul { padding-left: 28px; margin: 4px 0; }

  .prev-cover {
    text-align: center;
    padding: 32px 0 24px;
    border-bottom: 2px dashed var(--el-border-color);
    margin-bottom: 24px;
  }
  .prev-cover-title { font-family: '黑体', SimHei, sans-serif; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: 4px; }
  .prev-cover-stage { font-size: 18px; font-weight: 600; margin: 8px 0 24px; color: #444; }
  .prev-cover-ent   { font-size: 20px; font-weight: 700; margin: 8px 0 16px; }
  .prev-cover-meta  { margin: 4px 0; text-indent: 0; color: #555; }
}
</style>
