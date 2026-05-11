<template>
  <div>
    <div class="page-header">
      <h2>物品库存管理</h2>
    </div>
    
    <div class="search-form">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="分类">
          <el-select v-model="searchForm.category_id" placeholder="全部" clearable style="width: 150px">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="名称/规格/型号" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 100px">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
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
          新增物品
        </el-button>
        <el-button type="warning" @click="showWarning = !showWarning">
          库存预警 ({{ warningCount }})
        </el-button>
      </div>
      
      <el-table :data="items" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="image" label="图片" width="80">
          <template #default="{ row }">
            <el-image v-if="row.image" :src="row.image" style="width: 50px; height: 50px" fit="cover" />
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" min-width="120" />
        <el-table-column prop="category_name" label="分类" width="100" />
        <el-table-column prop="specification" label="规格" width="100" />
        <el-table-column prop="model" label="型号" width="100" />
        <el-table-column prop="unit" label="单位" width="60" />
        <el-table-column prop="stock" label="库存" width="80">
          <template #default="{ row }">
            <el-tag :type="row.stock <= row.min_stock ? 'danger' : 'success'">{{ row.stock }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="min_stock" label="预警值" width="70" />
        <el-table-column prop="location" label="位置" width="100" />
        <el-table-column prop="status" label="状态" width="70">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="warning" link @click="handleStock(row)">库存</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑物品' : '新增物品'" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入物品名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分类" prop="category_id">
              <el-select v-model="form.category_id" placeholder="请选择分类" style="width: 100%">
                <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="规格">
              <el-input v-model="form.specification" placeholder="规格" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="型号">
              <el-input v-model="form.model" placeholder="型号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单位" prop="unit">
              <el-input v-model="form.unit" placeholder="单位" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="存放位置">
              <el-input v-model="form.location" placeholder="存放位置" />
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="!isEdit">
            <el-form-item label="初始库存">
              <el-input-number v-model="form.stock" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预警库存">
              <el-input-number v-model="form.min_stock" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="isEdit">
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio :label="1">启用</el-radio>
                <el-radio :label="0">禁用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="图片">
              <el-upload
                class="avatar-uploader"
                :action="uploadUrl"
                :headers="uploadHeaders"
                :show-file-list="false"
                :on-success="handleUploadSuccess"
                accept="image/*"
              >
                <el-image v-if="form.image" :src="form.image" style="width: 100px; height: 100px" fit="cover" />
                <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
              </el-upload>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="stockDialogVisible" title="库存调整" width="400px">
      <el-form :model="stockForm" label-width="100px">
        <el-form-item label="当前库存">
          <span>{{ currentItem?.stock }} {{ currentItem?.unit }}</span>
        </el-form-item>
        <el-form-item label="调整后库存">
          <el-input-number v-model="stockForm.stock" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="stockForm.remark" type="textarea" :rows="2" placeholder="调整原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stockDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitStock" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showWarning" title="库存预警物品" width="800px">
      <el-table :data="warningItems" style="width: 100%">
        <el-table-column prop="name" label="物品名称" />
        <el-table-column prop="specification" label="规格" />
        <el-table-column prop="stock" label="当前库存">
          <template #default="{ row }">
            <el-tag type="danger">{{ row.stock }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="min_stock" label="预警值" />
        <el-table-column prop="location" label="位置" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import api from '../utils/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const submitting = ref(false)
const items = ref([])
const categories = ref([])
const warningItems = ref([])
const showWarning = ref(false)
const dialogVisible = ref(false)
const stockDialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const currentItem = ref(null)

const searchForm = reactive({
  category_id: '',
  keyword: '',
  status: ''
})

const form = reactive({
  id: null,
  name: '',
  category_id: '',
  specification: '',
  model: '',
  unit: '',
  stock: 0,
  min_stock: 0,
  location: '',
  image: '',
  status: 1
})

const stockForm = reactive({
  stock: 0,
  remark: ''
})

const rules = {
  name: [{ required: true, message: '请输入物品名称', trigger: 'blur' }],
  unit: [{ required: true, message: '请输入单位', trigger: 'blur' }]
}

const uploadUrl = '/api/items'
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
}))

const warningCount = computed(() => warningItems.value.length)

onMounted(async () => {
  await loadCategories()
  loadData()
  loadWarningItems()
})

async function loadCategories() {
  try {
    categories.value = await api.get('/categories')
  } catch (error) {
    console.error(error)
  }
}

async function loadData() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (searchForm.category_id) params.append('category_id', searchForm.category_id)
    if (searchForm.keyword) params.append('keyword', searchForm.keyword)
    if (searchForm.status !== '') params.append('status', searchForm.status)
    items.value = await api.get(`/items?${params.toString()}`)
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

async function loadWarningItems() {
  try {
    warningItems.value = await api.get('/items/warning')
  } catch (error) {
    console.error(error)
  }
}

function resetSearch() {
  searchForm.category_id = ''
  searchForm.keyword = ''
  searchForm.status = ''
  loadData()
}

function handleAdd() {
  isEdit.value = false
  Object.assign(form, {
    id: null,
    name: '',
    category_id: '',
    specification: '',
    model: '',
    unit: '',
    stock: 0,
    min_stock: 0,
    location: '',
    image: '',
    status: 1
  })
  dialogVisible.value = true
}

function handleEdit(row) {
  isEdit.value = true
  Object.assign(form, {
    id: row.id,
    name: row.name,
    category_id: row.category_id,
    specification: row.specification,
    model: row.model,
    unit: row.unit,
    min_stock: row.min_stock,
    location: row.location,
    image: row.image,
    status: row.status
  })
  dialogVisible.value = true
}

function handleStock(row) {
  currentItem.value = row
  stockForm.stock = row.stock
  stockForm.remark = ''
  stockDialogVisible.value = true
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm('确定要删除该物品吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await api.delete(`/items/${row.id}`)
    ElMessage.success('删除成功')
    loadData()
    loadWarningItems()
  } catch (error) {
    if (error !== 'cancel') console.error(error)
  }
}

function handleUploadSuccess(response) {
  if (response.image) {
    form.image = response.image
  }
}

async function handleSubmit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  submitting.value = true
  try {
    const formData = new FormData()
    for (const key in form) {
      if (form[key] !== null && form[key] !== undefined && form[key] !== '') {
        formData.append(key, form[key])
      }
    }
    
    if (isEdit.value) {
      await api.put(`/items/${form.id}`, form)
      ElMessage.success('更新成功')
    } else {
      await api.post('/items', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    loadData()
    loadWarningItems()
  } catch (error) {
    console.error(error)
  } finally {
    submitting.value = false
  }
}

async function submitStock() {
  submitting.value = true
  try {
    await api.put(`/items/${currentItem.value.id}/stock`, stockForm)
    ElMessage.success('库存调整成功')
    stockDialogVisible.value = false
    loadData()
    loadWarningItems()
  } catch (error) {
    console.error(error)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.avatar-uploader {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-uploader:hover {
  border-color: #409EFF;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
}
</style>
