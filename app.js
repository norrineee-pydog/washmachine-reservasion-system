// app.js
App({
  globalData: {
    userInfo: null,
    isLogin: false,
    currentBuilding: null,
    version: '1.0.0'
  },

  onLaunch() {
    console.log('上大洗衣侠小程序启动')
    this.initCloudDevelopment()
    this.checkLoginStatus()
    this.initLocation()
  },

  // 初始化云开发
  initCloudDevelopment() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    
    wx.cloud.init({
      env: 'cloud1-5ggq2l2i9a7c56ed',
      traceUser: true,
    })
    
    console.log('云开发初始化完成')
  },

  onShow() {
    console.log('小程序显示')
  },

  onHide() {
    console.log('小程序隐藏')
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
      this.globalData.isLogin = true
    } else {
      // 如果没有用户信息，从user集合获取或创建默认用户
      this.getOrCreateUser()
    }
  },

  // 获取或创建用户
  async getOrCreateUser() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'userProfile',
        data: {
          action: 'get'
        }
      })

      if (res.result && res.result.success && res.result.data) {
        this.globalData.userInfo = res.result.data
        this.globalData.isLogin = true
        wx.setStorageSync('userInfo', res.result.data)
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  },

  // 初始化位置服务
  initLocation() {
    this.globalData.currentBuilding = {
      id: 1,
      name: '一楼洗衣房',
      floors: 1,
      washerCount: 2,
      idleCount: 2,
      workingCount: 0
    }
    
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        console.log('获取位置成功', res)
      },
      fail: (err) => {
        console.log('获取位置失败', err)
      }
    })
  },

  // 用户登录
  login(userInfo) {
    this.globalData.userInfo = userInfo
    this.globalData.isLogin = true
    wx.setStorageSync('userInfo', userInfo)
  },

  // 用户登出
  logout() {
    this.globalData.userInfo = null
    this.globalData.isLogin = false
    wx.removeStorageSync('userInfo')
  }
})