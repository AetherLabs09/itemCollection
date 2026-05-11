<template>
  <div>
    <div class="page-header">
      <h2>数据统计分析</h2>
    </div>
    
    <div class="search-form">
      <el-form :inline="true">
        <el-form-item label="时间范围">
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
        <el-form-item>
          <el-button type="primary" @click="loadAllData">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>部门领用统计</span>
              <el-button type="success" size="small" @click="exportData('department')">导出</el-button>
            </div>
          </template>
          <el-table :data="departmentStats" style="width: 100%" max-height="400">
            <el-table-column prop="department" label="部门" />
            <el-table-column prop="request_count" label="领用次数" width="100" />
            <el-table-column prop="total_quantity" label="领用数量" width="100" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>物品消耗排行 TOP 10</span>
              <el-button type="success" size="small" @click="exportData('item')">导出</el-button>
            </div>
          </template>
          <el-table :data="itemStats" style="width: 100%" max-height="400">
            <el-table-column type="index" label="排名" width="60" />
            <el-table-column prop="name" label="物品名称" />
            <el-table-column prop="specification" label="规格" width="80" />
            <el-table-column prop="request_count" label="领用次数" width="90" />
            <el-table-column prop="total_quantity" label="消耗数量" width="90" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
    
    <el-card style="margin-top: 20px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>领用趋势</span>
          <el-radio-group v-model="groupBy" @change="loadTimeStats">
            <el-radio-button label="day">按日</el-radio-button>
            <el-radio-button label="month">按月</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <el-table :data="timeStats" style="width: 100%">
        <el-table-column prop="time" label="时间" width="150" />
        <el-table-column prop="request_count" label="领用次数" width="120" />
        <el-table-column prop="total_quantity" label="领用数量" width="120" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../utils/api'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'

const dateRange = ref([])
const groupBy = ref('day')
const departmentStats = ref([])
const itemStats = ref([])
const timeStats = ref([])

onMounted(() => {
  loadAllData()
})

async function loadAllData() {
  await Promise.all([
    loadDepartmentStats(),
    loadItemStats(),
    loadTimeStats()
  ])
}

function getParams() {
  const params = new URLSearchParams()
  if (dateRange.value && dateRange.value[0]) {
    params.append('start_date', dateRange.value[0])
    params.append('end_date', dateRange.value[1])
  }
  return params
}

async function loadDepartmentStats() {
  try {
    departmentStats.value = await api.get(`/stats/by-department?${getParams().toString()}`)
  } catch (error) {
    console.error(error)
  }
}

async function loadItemStats() {
  try {
    itemStats.value = await api.get(`/stats/by-item?${getParams().toString()}&limit=10`)
  } catch (error) {
    console.error(error)
  }
}

async function loadTimeStats() {
  try {
    timeStats.value = await api.get(`/stats/by-time?${getParams().toString()}&group_by=${groupBy.value}`)
  } catch (error) {
    console.error(error)
  }
}

function resetSearch() {
  dateRange.value = []
  loadAllData()
}

async function exportData(type) {
  try {
    const params = getParams()
    const data = await api.get(`/stats/export?${params.toString()}&type=${type}`)
    
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, type === 'department' ? '部门统计' : '物品统计')
    XLSX.writeFile(wb, `${type === 'department' ? '部门领用统计' : '物品消耗统计'}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error(error)
  }
}
</script>
