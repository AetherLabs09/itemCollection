<template>
  <div>
    <div class="page-header">
      <h2>入库/归还管理</h2>
    </div>
    
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>采购入库</span>
          </template>
          <el-form ref="inFormRef" :model="inForm" :rules="inRules" label-width="80px">
            <el-form-item label="物品" prop="item_id">
              <el-select v-model="inForm.item_id" placeholder="选择物品" style="width: 100%" filterable>
                <el-option
                  v-for="i in items"
                  :key="i.id"
                  :label="`${i.name} (当前库存: ${i.stock}${i.unit})`"
                  :value="i.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="数量" prop="quantity">
              <el-input-number v-model="inForm.quantity" :min="1" style="width: 100%" />
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="inForm.remark" type="textarea" :rows="2" placeholder="入库备注" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleIn" :loading="submitting">确认入库</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>归还入库</span>
          </template>
          <el-form ref="returnFormRef" :model="returnForm" :rules="returnRules" label-width="80px">
            <el-form-item label="物品" prop="item_id">
              <el-select v-model="returnForm.item_id" placeholder="选择物品" style="width: 100%" filterable>
                <el-option
                  v-for="i in items"
                  :key="i.id"
                  :label="`${i.name} (当前库存: ${i.stock}${i.unit})`"
                  :value="i.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="数量" prop="quantity">
              <el-input-number v-model="returnForm.quantity" :min="1" style="width: 100%" />
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="returnForm.remark" type="textarea" :rows="2" placeholder="归还备注" />
            </el-form-item>
            <el-form-item>
              <el-button type="success" @click="handleReturn" :loading="submitting">确认归还</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../utils/api'
import { ElMessage } from 'element-plus'

const items = ref([])
const submitting = ref(false)
const inFormRef = ref()
const returnFormRef = ref()

const inForm = reactive({
  item_id: '',
  quantity: 1,
  type: 'in',
  remark: ''
})

const returnForm = reactive({
  item_id: '',
  quantity: 1,
  remark: ''
})

const inRules = {
  item_id: [{ required: true, message: '请选择物品', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }]
}

const returnRules = {
  item_id: [{ required: true, message: '请选择物品', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }]
}

onMounted(() => {
  loadItems()
})

async function loadItems() {
  try {
    items.value = await api.get('/items?status=1')
  } catch (error) {
    console.error(error)
  }
}

async function handleIn() {
  const valid = await inFormRef.value.validate().catch(() => false)
  if (!valid) return
  
  submitting.value = true
  try {
    await api.post('/inventory/in', inForm)
    ElMessage.success('入库成功')
    inForm.item_id = ''
    inForm.quantity = 1
    inForm.remark = ''
    loadItems()
  } catch (error) {
    console.error(error)
  } finally {
    submitting.value = false
  }
}

async function handleReturn() {
  const valid = await returnFormRef.value.validate().catch(() => false)
  if (!valid) return
  
  submitting.value = true
  try {
    await api.post('/inventory/return', returnForm)
    ElMessage.success('归还成功')
    returnForm.item_id = ''
    returnForm.quantity = 1
    returnForm.remark = ''
    loadItems()
  } catch (error) {
    console.error(error)
  } finally {
    submitting.value = false
  }
}
</script>
