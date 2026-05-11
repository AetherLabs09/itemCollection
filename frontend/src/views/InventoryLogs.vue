<template>
  <div>
    <div class="page-header">
      <h2>库存台账记录</h2>
    </div>
    
    <div class="search-form">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="物品">
          <el-select v-model="searchForm.item_id" placeholder="全部" clearable filterable style="width: 200px">
            <el-option v-for="i in items" :key="i.id" :label="i.name" :value="i.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="searchForm.type" placeholder="全部" clearable style="width: 120px">
            <el-option label="采购入库" value="in" />
            <el-option label="领用出库" value="out" />
            <el-option label="归还入库" value="return" />
            <el-option label="调整增加" value="adjust_in" />
            <el-option label="调整减少" value="adjust_out" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="物品名称" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
          <el-button type="success" @click="handleExport">导出Excel</el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <div class="table-container">
      <el-table :data="logs" style="width: 100%" v-loading="loading">
        <el-table-column prop="created_at" label="时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="item_name" label="物品名称" min-width="120" />
        <el-table-column prop="specification" label="规格" width="100" />
        <el-table-column prop="model" label="型号" width="100" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="typeMap[row.type]?.type" size="small">{{ typeMap[row.type]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="80">
          <template #default="{ row }">
            <span :style="{ color: ['in', 'return', 'adjust_in'].includes(row.type) ? '#67C23A' : '#F56C6C' }">
              {{ ['in', 'return', 'adjust_in'].includes(row.type) ? '+' : '-' }}{{ row.quantity }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="60" />
        <el-table-column prop="before_stock" label="变动前" width="80" />
        <el-table-column prop="after_stock" label="变动后" width="80" />
        <el-table-column prop="operator_name" label="操作人" width="100" />
        <el-table-column prop="remark" label="备注" min-width="150" />
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../utils/api'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'

const loading = ref(false)
const logs = ref([])
const items = ref([])
const dateRange = ref([])

const typeMap = {
  in: { label: '采购入库', type: 'success' },
  out: { label: '领用出库', type: 'danger' },
  return: { label: '归还入库', type: 'success' },
  adjust_in: { label: '调整增加', type: 'warning' },
  adjust_out: { label: '调整减少', type: 'warning' }
}

const searchForm = reactive({
  item_id: '',
  type: '',
  keyword: ''
})

onMounted(async () => {
  await loadItems()
  loadData()
})

async function loadItems() {
  try {
    items.value = await api.get('/items')
  } catch (error) {
    console.error(error)
  }
}

async function loadData() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (searchForm.item_id) params.append('item_id', searchForm.item_id)
    if (searchForm.type) params.append('type', searchForm.type)
    if (searchForm.keyword) params.append('keyword', searchForm.keyword)
    if (dateRange.value && dateRange.value[0]) {
      params.append('start_date', dateRange.value[0])
      params.append('end_date', dateRange.value[1])
    }
    logs.value = await api.get(`/inventory/logs?${params.toString()}`)
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

function resetSearch() {
  searchForm.item_id = ''
  searchForm.type = ''
  searchForm.keyword = ''
  dateRange.value = []
  loadData()
}

async function handleExport() {
  try {
    const params = new URLSearchParams()
    if (dateRange.value && dateRange.value[0]) {
      params.append('start_date', dateRange.value[0])
      params.append('end_date', dateRange.value[1])
    }
    const data = await api.get(`/inventory/logs/export?${params.toString()}`)
    
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '库存台账')
    XLSX.writeFile(wb, `库存台账_${new Date().toISOString().slice(0, 10)}.xlsx`)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error(error)
  }
}

function formatTime(time) {
  if (!time) return ''
  return new Date(time).toLocaleString('zh-CN')
}
</script>
