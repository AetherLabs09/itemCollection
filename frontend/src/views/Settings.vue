<template>
  <div>
    <div class="page-header">
      <h2>系统设置</h2>
    </div>
    
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>基础参数设置</span>
          </template>
          <el-form :model="settings" label-width="120px">
            <el-form-item label="系统名称">
              <el-input v-model="settings.system_name" placeholder="系统名称" />
            </el-form-item>
            <el-form-item label="公司名称">
              <el-input v-model="settings.company_name" placeholder="公司名称" />
            </el-form-item>
            <el-form-item label="联系电话">
              <el-input v-model="settings.contact_phone" placeholder="联系电话" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveSettings" :loading="saving">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>数据备份</span>
          </template>
          <div style="margin-bottom: 20px">
            <el-button type="primary" @click="handleBackup" :loading="backingUp">立即备份</el-button>
          </div>
          <el-table :data="backups" style="width: 100%" max-height="300">
            <el-table-column prop="name" label="备份文件" />
            <el-table-column prop="size" label="大小" width="100">
              <template #default="{ row }">
                {{ formatSize(row.size) }}
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="备份时间" width="160">
              <template #default="{ row }">
                {{ formatTime(row.created_at) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
    
    <el-card style="margin-top: 20px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>操作日志</span>
        </div>
      </template>
      <div class="search-form" style="padding: 0; margin-bottom: 15px;">
        <el-form :inline="true" :model="logSearch">
          <el-form-item label="操作人">
            <el-input v-model="logSearch.user_id" placeholder="用户ID" clearable style="width: 100px" />
          </el-form-item>
          <el-form-item label="操作类型">
            <el-input v-model="logSearch.action" placeholder="操作类型" clearable style="width: 120px" />
          </el-form-item>
          <el-form-item label="时间">
            <el-date-picker
              v-model="logDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="width: 240px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadLogs">查询</el-button>
          </el-form-item>
        </el-form>
      </div>
      <el-table :data="logs" style="width: 100%" v-loading="loadingLogs">
        <el-table-column prop="created_at" label="时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="user_name" label="操作人" width="100" />
        <el-table-column prop="action" label="操作类型" width="120" />
        <el-table-column prop="target" label="操作对象" min-width="150" />
        <el-table-column prop="detail" label="详情" min-width="200">
          <template #default="{ row }">
            <el-tooltip v-if="row.detail" :content="row.detail" placement="top">
              <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; max-width: 200px;">
                {{ row.detail }}
              </span>
            </el-tooltip>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="ip" label="IP" width="120" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../utils/api'
import { ElMessage } from 'element-plus'

const saving = ref(false)
const backingUp = ref(false)
const loadingLogs = ref(false)
const settings = reactive({
  system_name: '',
  company_name: '',
  contact_phone: ''
})
const backups = ref([])
const logs = ref([])
const logDateRange = ref([])

const logSearch = reactive({
  user_id: '',
  action: ''
})

onMounted(() => {
  loadSettings()
  loadBackups()
  loadLogs()
})

async function loadSettings() {
  try {
    const data = await api.get('/settings/system')
    Object.assign(settings, data)
  } catch (error) {
    console.error(error)
  }
}

async function saveSettings() {
  saving.value = true
  try {
    await api.post('/settings/system', settings)
    ElMessage.success('保存成功')
  } catch (error) {
    console.error(error)
  } finally {
    saving.value = false
  }
}

async function loadBackups() {
  try {
    backups.value = await api.get('/settings/backups')
  } catch (error) {
    console.error(error)
  }
}

async function handleBackup() {
  backingUp.value = true
  try {
    await api.post('/settings/backup')
    ElMessage.success('备份成功')
    loadBackups()
  } catch (error) {
    console.error(error)
  } finally {
    backingUp.value = false
  }
}

async function loadLogs() {
  loadingLogs.value = true
  try {
    const params = new URLSearchParams()
    if (logSearch.user_id) params.append('user_id', logSearch.user_id)
    if (logSearch.action) params.append('action', logSearch.action)
    if (logDateRange.value && logDateRange.value[0]) {
      params.append('start_date', logDateRange.value[0])
      params.append('end_date', logDateRange.value[1])
    }
    logs.value = await api.get(`/settings/logs?${params.toString()}`)
  } catch (error) {
    console.error(error)
  } finally {
    loadingLogs.value = false
  }
}

function formatTime(time) {
  if (!time) return ''
  return new Date(time).toLocaleString('zh-CN')
}

function formatSize(size) {
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB'
  return (size / 1024 / 1024).toFixed(2) + ' MB'
}
</script>
