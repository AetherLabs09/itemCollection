<template>
  <div>
    <div class="page-header">
      <h2>领用审批管理</h2>
    </div>
    
    <div class="search-form">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="待审批" value="pending" />
            <el-option label="已批准" value="approved" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="申请人">
          <el-input v-model="searchForm.keyword" placeholder="姓名/单号" clearable style="width: 150px" />
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
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <div class="table-container">
      <el-table :data="requests" style="width: 100%" v-loading="loading">
        <el-table-column prop="request_no" label="申请单号" width="150" />
        <el-table-column prop="user_name" label="申请人" width="100" />
        <el-table-column prop="department" label="部门" width="100" />
        <el-table-column prop="request_time" label="申请时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.request_time) }}
          </template>
        </el-table-column>
        <el-table-column label="物品明细" min-width="200">
          <template #default="{ row }">
            <div v-for="item in row.items" :key="item.id">
              {{ item.item_name }} x {{ item.quantity }} {{ item.unit }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="purpose" label="领用用途" min-width="150" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status]?.type">{{ statusMap[row.status]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="approver_name" label="审批人" width="100" />
        <el-table-column prop="reject_reason" label="驳回原因" min-width="150">
          <template #default="{ row }">
            <span v-if="row.reject_reason" style="color: #F56C6C">{{ row.reject_reason }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button type="success" link @click="handleApprove(row, 'approved')">批准</el-button>
              <el-button type="danger" link @click="handleApprove(row, 'rejected')">驳回</el-button>
            </template>
            <el-button type="primary" link @click="handleDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="detailVisible" title="申请详情" width="500px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="申请单号">{{ currentRequest?.request_no }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ currentRequest?.user_name }}</el-descriptions-item>
        <el-descriptions-item label="部门">{{ currentRequest?.department }}</el-descriptions-item>
        <el-descriptions-item label="岗位">{{ currentRequest?.position }}</el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ formatTime(currentRequest?.request_time) }}</el-descriptions-item>
        <el-descriptions-item label="领用用途">{{ currentRequest?.purpose }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusMap[currentRequest?.status]?.type">{{ statusMap[currentRequest?.status]?.label }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="审批人">{{ currentRequest?.approver_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="审批时间">{{ formatTime(currentRequest?.approve_time) || '-' }}</el-descriptions-item>
        <el-descriptions-item label="驳回原因" v-if="currentRequest?.reject_reason">{{ currentRequest?.reject_reason }}</el-descriptions-item>
      </el-descriptions>
      <h4 style="margin: 20px 0 10px">物品明细</h4>
      <el-table :data="currentRequest?.items" border size="small">
        <el-table-column prop="item_name" label="物品名称" />
        <el-table-column prop="specification" label="规格" />
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column prop="unit" label="单位" width="60" />
      </el-table>
    </el-dialog>

    <el-dialog v-model="rejectVisible" title="驳回原因" width="400px">
      <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="请输入驳回原因" />
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReject" :loading="submitting">确定驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../utils/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const submitting = ref(false)
const requests = ref([])
const detailVisible = ref(false)
const rejectVisible = ref(false)
const currentRequest = ref(null)
const rejectReason = ref('')
const dateRange = ref([])

const statusMap = {
  pending: { label: '待审批', type: 'warning' },
  approved: { label: '已批准', type: 'success' },
  rejected: { label: '已驳回', type: 'danger' }
}

const searchForm = reactive({
  status: '',
  keyword: ''
})

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (searchForm.status) params.append('status', searchForm.status)
    if (searchForm.keyword) params.append('keyword', searchForm.keyword)
    if (dateRange.value && dateRange.value[0]) {
      params.append('start_date', dateRange.value[0])
      params.append('end_date', dateRange.value[1])
    }
    requests.value = await api.get(`/requests?${params.toString()}`)
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

function resetSearch() {
  searchForm.status = ''
  searchForm.keyword = ''
  dateRange.value = []
  loadData()
}

function handleDetail(row) {
  currentRequest.value = row
  detailVisible.value = true
}

async function handleApprove(row, status) {
  if (status === 'rejected') {
    currentRequest.value = row
    rejectReason.value = ''
    rejectVisible.value = true
    return
  }
  
  try {
    await ElMessageBox.confirm('确定要批准该申请吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })
    await api.put(`/requests/${row.id}/approve`, { status })
    ElMessage.success('审批成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') console.error(error)
  }
}

async function submitReject() {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请输入驳回原因')
    return
  }
  
  submitting.value = true
  try {
    await api.put(`/requests/${currentRequest.value.id}/approve`, {
      status: 'rejected',
      reject_reason: rejectReason.value
    })
    ElMessage.success('已驳回')
    rejectVisible.value = false
    loadData()
  } catch (error) {
    console.error(error)
  } finally {
    submitting.value = false
  }
}

function formatTime(time) {
  if (!time) return ''
  return new Date(time).toLocaleString('zh-CN')
}
</script>
