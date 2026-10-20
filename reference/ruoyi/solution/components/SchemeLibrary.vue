<template>
  <el-card class="library-card" shadow="never">
    <template #header>
      <div class="card-header">
        <span class="title">
          <el-icon><Collection /></el-icon>
          清洁生产方案库
          <el-tag type="info" effect="plain" size="small" round>共 {{ total }} 条</el-tag>
        </span>
        <span class="hint">白酒行业 79 条种子方案，支持新增/修改/删除/导出</span>
      </div>
    </template>

    <!-- 搜索 -->
    <el-form :inline="true" :model="query" class="search-form">
      <el-form-item label="方案名称">
        <el-input v-model="query.name" placeholder="方案名称" clearable @keyup.enter="handleSearch" style="width: 180px" />
      </el-form-item>
      <el-form-item label="方案类型">
        <el-select v-model="query.schemeType" placeholder="全部" clearable style="width: 140px">
          <el-option v-for="o in SCHEME_TYPE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="所属类别">
        <el-select v-model="query.category" placeholder="全部" clearable style="width: 160px">
          <el-option v-for="o in CATEGORY_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" placeholder="全部" clearable style="width: 100px">
          <el-option label="正常" value="0" />
          <el-option label="停用" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
        <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 工具栏 -->
    <div class="toolbar">
      <el-button type="primary" :icon="Plus" @click="openAdd">新增</el-button>
      <el-button type="danger" :icon="Delete" :disabled="selection.length === 0" @click="handleBatchDelete">
        批量删除
      </el-button>
      <el-button :icon="Download" @click="handleExport">导出</el-button>
      <span class="spacer" />
      <el-button :icon="RefreshRight" @click="loadList">刷新</el-button>
    </div>

    <!-- 表格 -->
    <vxe-table
      ref="tableRef"
      :data="store.list"
      :loading="store.loading"
      border
      round
      stripe
      show-overflow
      auto-resize
      :row-config="{ isHover: true, keyField: 'schemeId' }"
      :column-config="{ resizable: true }"
      :checkbox-config="{ range: true }"
      :max-height="520"
      @checkbox-change="onSelectionChange"
      @checkbox-all="onSelectionChange"
    >
      <vxe-column type="checkbox" width="50" fixed="left" />
      <vxe-column type="seq" title="序号" width="60" fixed="left" />
      <vxe-column field="name" title="方案名称" min-width="200" align="left" fixed="left" />
      <vxe-column field="schemeType" title="类型" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="schemeTypeTag(row.schemeType)" effect="light" size="small">
            {{ row.schemeType || '-' }}
          </el-tag>
        </template>
      </vxe-column>
      <vxe-column field="category" title="所属类别" width="140" align="center" />
      <vxe-column field="relatedIndicator" title="对应指标" min-width="180" align="left" />
      <vxe-column field="investment" title="投资(万元)" width="110" align="right"
        :formatter="({ cellValue }) => formatNum(cellValue)" />
      <vxe-column field="paybackPeriod" title="回收期(年)" width="110" align="right"
        :formatter="({ cellValue }) => formatNum(cellValue)" />
      <vxe-column field="status" title="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === '0' ? 'success' : 'info'" effect="plain" size="small">
            {{ row.status === '0' ? '正常' : '停用' }}
          </el-tag>
        </template>
      </vxe-column>
      <vxe-column title="操作" width="160" align="center" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="openEdit(row)">修改</el-button>
          <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </vxe-column>
    </vxe-table>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="query.pageNum"
        v-model:page-size="query.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadList"
        @current-change="loadList"
      />
    </div>

    <SchemeForm v-model="formVisible" :data="formRow" @success="loadList" />
  </el-card>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Collection, Plus, Delete, Download, Search, Refresh, RefreshRight,
} from '@element-plus/icons-vue'
import request from '@/utils/request'
import useLiquorSchemeStore, {
  SCHEME_TYPE_OPTIONS,
  CATEGORY_OPTIONS,
  schemeTypeTag,
} from '@/store/modules/liquorScheme'
import SchemeForm from './SchemeForm.vue'

defineOptions({ name: 'SchemeLibrary' })

const store = useLiquorSchemeStore()
const tableRef = ref(null)
const selection = ref([])

const query = reactive({
  pageNum: 1,
  pageSize: 20,
  name: '',
  schemeType: '',
  category: '',
  status: '',
})

const total = computed(() => store.total)

async function loadList() {
  await store.fetchList(query)
}

function handleSearch() {
  query.pageNum = 1
  loadList()
}

function resetQuery() {
  query.name = ''
  query.schemeType = ''
  query.category = ''
  query.status = ''
  query.pageNum = 1
  loadList()
}

function onSelectionChange() {
  selection.value = tableRef.value?.getCheckboxRecords?.() || []
}

// —— 新增 / 编辑 ——
const formVisible = ref(false)
const formRow = ref({})

function openAdd() {
  formRow.value = {}
  formVisible.value = true
}

function openEdit(row) {
  formRow.value = { ...row }
  formVisible.value = true
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除方案「${row.name}」吗？`, '删除确认', {
      type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消',
    })
  } catch {
    return
  }
  await store.remove(row.schemeId)
  ElMessage.success('删除成功')
  loadList()
}

async function handleBatchDelete() {
  if (!selection.value.length) return
  try {
    await ElMessageBox.confirm(`确认删除选中的 ${selection.value.length} 条方案吗？`, '批量删除', {
      type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消',
    })
  } catch {
    return
  }
  const ids = selection.value.map((r) => r.schemeId)
  await store.remove(ids)
  ElMessage.success('批量删除成功')
  loadList()
}

function handleExport() {
  // 走后端导出接口
  request({
    url: '/liquor/scheme/export',
    method: 'post',
    params: query,
    responseType: 'blob',
  }).then((data) => {
    const blob = new Blob([data], { type: 'application/vnd.ms-excel' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '白酒清洁生产方案库.xlsx'
    a.click()
    window.URL.revokeObjectURL(url)
  }).catch(() => {
    ElMessage.warning('导出失败，请确认后端 /liquor/scheme/export 已启用')
  })
}

function formatNum(v) {
  if (v === null || v === undefined || v === '') return '-'
  const n = Number(v)
  if (!Number.isFinite(n)) return '-'
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

onMounted(() => {
  loadList()
})
</script>

<style scoped lang="scss">
.library-card {
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
.search-form { margin-bottom: 8px; }
.toolbar {
  display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
  .spacer { flex: 1; }
}
.pagination {
  display: flex; justify-content: flex-end; margin-top: 12px;
}
</style>
