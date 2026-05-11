<template>
  <el-container class="main-container">
    <el-aside :width="isCollapse ? '64px' : '220px'">
      <div class="logo">
        <span v-if="!isCollapse">物品领用系统</span>
        <span v-else>物品</span>
      </div>
      <el-menu
        :default-active="$route.path"
        :collapse="isCollapse"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        router
      >
        <el-menu-item v-if="userStore.user?.role !== 'employee'" index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>首页概览</template>
        </el-menu-item>
        
        <el-menu-item v-if="userStore.user?.role === 'admin'" index="/categories">
          <el-icon><Grid /></el-icon>
          <template #title>物品分类</template>
        </el-menu-item>
        
        <el-menu-item v-if="userStore.user?.role !== 'employee'" index="/items">
          <el-icon><Box /></el-icon>
          <template #title>物品库存</template>
        </el-menu-item>
        
        <el-menu-item v-if="userStore.user?.role === 'admin'" index="/employees">
          <el-icon><User /></el-icon>
          <template #title>员工管理</template>
        </el-menu-item>
        
        <el-menu-item index="/my-requests">
          <el-icon><Document /></el-icon>
          <template #title>我的领用</template>
        </el-menu-item>
        
        <el-menu-item v-if="userStore.user?.role !== 'employee'" index="/requests">
          <el-icon><Checked /></el-icon>
          <template #title>领用审批</template>
        </el-menu-item>
        
        <el-menu-item v-if="userStore.user?.role !== 'employee'" index="/inventory">
          <el-icon><Plus /></el-icon>
          <template #title>入库/归还</template>
        </el-menu-item>
        
        <el-menu-item v-if="userStore.user?.role !== 'employee'" index="/inventory-logs">
          <el-icon><List /></el-icon>
          <template #title>库存台账</template>
        </el-menu-item>
        
        <el-menu-item v-if="userStore.user?.role === 'admin'" index="/stats">
          <el-icon><TrendCharts /></el-icon>
          <template #title>数据统计</template>
        </el-menu-item>
        
        <el-menu-item v-if="userStore.user?.role === 'admin'" index="/settings">
          <el-icon><Setting /></el-icon>
          <template #title>系统设置</template>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header>
        <div class="header-left">
          <el-icon class="collapse-btn" @click="isCollapse = !isCollapse">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <span class="page-title">{{ $route.meta.title }}</span>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><User /></el-icon>
              {{ userStore.user?.name }}
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="password">修改密码</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessageBox } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const isCollapse = ref(false)

function handleCommand(command) {
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      userStore.logout()
      router.push('/login')
    })
  } else if (command === 'password') {
    router.push('/change-password')
  }
}
</script>

<style scoped>
.main-container {
  height: 100vh;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  margin-right: 15px;
}

.page-title {
  font-size: 16px;
  color: #303133;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #606266;
}

.user-info .el-icon {
  margin: 0 5px;
}
</style>
