<template>
  <div>
    <div class="page-header">
      <h2>我的领用</h2>
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
      <div style="margin-bottom: 20px">
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新增领用申请
        </el-button>
      </div>
      
      <el-table :data="requests" style="width: 100%" v-loading="loading">
        <el-table-column prop="request_no" label="申请单号" width="150" />
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
        <el-table-column prop="approve_time" label="审批时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.approve_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="reject_reason" label="驳回原因" min-width="150">
          <template #default="{ row }">
            <span v-if="row.reject_reason" style="color: #F56C6C">{{ row.reject_reason }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" type="danger" link @click="handleCancel(row)">撤销</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" title="新增领用申请" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="领用时间" prop="request_time">
          <el-date-picker
            v-model="form.request_time"
            type="datetime"
            placeholder="选择日期时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="领用用途" prop="purpose">
          <el-input v-model="form.purpose" type="textarea" :rows="2" placeholder="请输入领用用途" />
        </el-form-item>
        <el-form-item label="领用物品" prop="items">
          <div v-for="(item, index) in form.items" :key="index" style="margin-bottom: 10px; display: flex; gap: 10px;">
            <el-select v-model="item.item_id" placeholder="选择物品" style="width: 200px" filterable>
              <el-option
                v-for="i in items"
                :key="i.id"
                :label="`${i.name} (库存: ${i.stock}${i.unit})`"
                :value="i.id"
                :disabled="i.stock <= 0"
              />
            </el-select>
            <el-input-number v-model="item.quantity" :min="1" placeholder="数量" style="width: 120px" />
            <el-button type="danger" link @click="removeItem(index)" v-if="form.items.length > 1">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <el-button type="primary" link @click="addItem">
            <el-icon><Plus /></el-icon>
            添加物品
          </el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import api from '../utils/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const submitting = ref(false)
const requests = ref([])
const items = ref([])
const dialogVisible = ref(false)
const formRef = ref()
const dateRange = ref([])

const statusMap = {
  pending: { label: '待审批', type: 'warning' },
  approved: { label: '已批准', type: 'success' },
  rejected: { label: '已驳回', type: 'danger' }
}

const searchForm = reactive({
  status: ''
})

const form = reactive({
  request_time: '',
  purpose: '',
  items: [{ item_id: '', quantity: 1 }]
})

const rules = {
  request_time: [{ required: true, message: '请选择领用时间', trigger: 'change' }],
  purpose: [{ required: true, message: '请输入领用用途', trigger: 'blur' }],
  items: [{ required: true, message: '请添加领用物品', trigger: 'change' }]
}

onMounted(async () => {
  await loadItems()
  loadData()
})

async function loadItems() {
  try {
    items.value = await api.get('/items?status=1')
  } catch (error) {
    console.error(error)
  }
}

async function loadData() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (searchForm.status) params.append('status', searchForm.status)
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
  dateRange.value = []
  loadData()
}

function handleAdd() {
  form.request_time = new Date().toISOString().slice(0, 19).replace('T', ' ')
  form.purpose = ''
  form.items = [{ item_id: '', quantity: 1 }]
  dialogVisible.value = true
}

function addItem() {
  form.items.push({ item_id: '', quantity: 1 })
}

function removeItem(index) {
  form.items.splice(index, 1)
}

async function handleCancel(row) {
  try {
    await ElMessageBox.confirm('确定要撤销该申请吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await api.delete(`/requests/${row.id}`)
    ElMessage.success('撤销成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') console.error(error)
  }
}

async function handleSubmit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  const validItems = form.items.filter(item => item.item_id && item.quantity > 0)
  if (validItems.length === 0) {
    ElMessage.warning('请至少添加一个领用物品')
    return
  }
  
  submitting.value = true
  try {
    await api.post('/requests', {
      request_time: form.request_time,
      purpose: form.purpose,
      items: validItems
    })
    ElMessage.success('提交成功')
    dialogVisible.value = false
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
