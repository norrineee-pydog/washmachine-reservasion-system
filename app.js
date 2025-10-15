// app.js
App({
  globalData: {
    userInfo: null,
    isLogin: false,
    currentBuilding: null,
    apiBaseUrl: 'https://your-api-domain.com/api',
    version: '1.0.0'
  },

  onLaunch() {
    console.log('上大洗衣侠小程序启动')
    this.checkLoginStatus()
    this.initLocation()
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
    }
  },

  // 初始化位置服务
  initLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        console.log('获取位置成功', res)
        this.getBuildingByLocation(res.latitude, res.longitude)
      },
      fail: (err) => {
        console.log('获取位置失败', err)
        // 使用默认楼栋
        this.globalData.currentBuilding = {
          id: 1,
          name: '东区1号楼',
          floors: 6
        }
      }
    })
  },

  // 根据位置获取楼栋信息
  getBuildingByLocation(lat, lng) {
    // 这里应该调用后端API根据经纬度获取楼栋信息
    // 暂时使用模拟数据
    const buildings = [
      { id: 1, name: '东区1号楼', lat: 31.2756, lng: 121.5000, floors: 6 },
      { id: 2, name: '东区2号楼', lat: 31.2758, lng: 121.5002, floors: 6 },
      { id: 3, name: '西区1号楼', lat: 31.2750, lng: 121.4998, floors: 8 }
    ]
    
    // 简单的距离计算找到最近的楼栋
    let nearestBuilding = buildings[0]
    let minDistance = this.calculateDistance(lat, lng, buildings[0].lat, buildings[0].lng)
    
    buildings.forEach(building => {
      const distance = this.calculateDistance(lat, lng, building.lat, building.lng)
      if (distance < minDistance) {
        minDistance = distance
        nearestBuilding = building
      }
    })
    
    this.globalData.currentBuilding = nearestBuilding
  },

  // 计算两点间距离
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371 // 地球半径
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
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
  },

  // 网络请求封装
  request(options) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: this.globalData.apiBaseUrl + options.url,
        method: options.method || 'GET',
        data: options.data || {},
        header: {
          'Content-Type': 'application/json',
          'Authorization': this.globalData.userInfo ? `Bearer ${this.globalData.userInfo.token}` : ''
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data)
          } else {
            reject(res)
          }
        },
        fail: reject
      })
    })
  }
})
