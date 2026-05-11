<template>
  <div>
    <div class="page-header">
      <h2>首页概览</h2>
    </div>
    
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: #409EFF">
            <el-icon><Box /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalItems }}</div>
            <div class="stat-label">物品种类</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: #67C23A">
            <el-icon><Goods /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalStock }}</div>
            <div class="stat-label">库存总量</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: #E6A23C">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.warningCount }}</div>
            <div class="stat-label">库存预警</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: #F56C6C">
            <el-icon><Document /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.pendingRequests }}</div>
            <div class="stat-label">待审批申请</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>库存预警物品</span>
          </template>
          <el-table :data="warningItems" style="width: 100%" max-height="300">
            <el-table-column prop="name" label="物品名称" />
            <el-table-column prop="specification" label="规格" />
            <el-table-column prop="stock" label="当前库存" width="100">
              <template #default="{ row }">
                <el-tag type="danger">{{ row.stock }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="min_stock" label="预警值" width="80" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>待审批申请</span>
          </template>
          <el-table :data="pendingRequests" style="width: 100%" max-height="300">
            <el-table-column prop="request_no" label="申请单号" width="150" />
            <el-table-column prop="user_name" label="申请人" width="100" />
            <el-table-column prop="department" label="部门" />
            <el-table-column prop="request_time" label="申请时间" width="160">
              <template #default="{ row }">
                {{ formatTime(row.request_time) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../utils/api'

const stats = ref({
  totalItems: 0,
  totalStock: 0,
  warningCount: 0,
  pendingRequests: 0,
  totalEmployees: 0
})

const warningItems = ref([])
const pendingRequests = ref([])

onMounted(async () => {
  try {
    const [overviewRes, warningRes, requestsRes] = await Promise.all([
      api.get('/stats/overview'),
      api.get('/items/warning'),
      api.get('/requests?status=pending')
    ])
    stats.value = overviewRes
    warningItems.value = warningRes.slice(0, 5)
    pendingRequests.value = requestsRes.slice(0, 5)
  } catch (error) {
    console.error(error)
  }
})

function formatTime(time) {
  if (!time) return ''
  return new Date(time).toLocaleString('zh-CN')
}
</script>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
}

.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  width: 100%;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
}

.stat-icon .el-icon {
  font-size: 28px;
  color: #fff;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}
</style>
