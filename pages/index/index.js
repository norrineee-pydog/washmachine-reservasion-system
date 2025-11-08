// pages/index/index.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    currentBuilding: null,
    weather: null,
    washerList: [],
    statusSummary: {
      idle: 0,
      booking: 0,
      working: 0,
      ready: 0
    },
    recommendations: [],
    notices: [],
    loading: false,
    hasData: false
  },

  onLoad() {
    console.log('首页加载')
    this.initPage()
  },

  onShow() {
    console.log('首页显示')
    // 每次显示页面时检查楼栋是否更新
    this.checkBuildingUpdate()
    this.refreshData()
  },

  onPullDownRefresh() {
    this.refreshData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 检查楼栋是否更新
  checkBuildingUpdate() {
    const currentBuilding = app.globalData.currentBuilding
    const oldBuilding = this.data.currentBuilding
    
    // 如果楼栋发生变化，重新加载洗衣机数据
    if (currentBuilding && (!oldBuilding || currentBuilding.id !== oldBuilding.id)) {
      console.log('检测到楼栋切换，重新加载数据')
      this.setData({
        currentBuilding: currentBuilding
      })
      this.loadWasherStatus()
    } else if (!this.data.currentBuilding && currentBuilding) {
      // 如果之前没有楼栋信息，现在有了
      this.setData({
        currentBuilding: currentBuilding
      })
    }
  },

  // 初始化页面
  initPage() {
    this.setData({
      userInfo: app.globalData.userInfo,
      currentBuilding: app.globalData.currentBuilding
    })
    
    this.loadWeather()
    this.loadWasherStatus()
    this.loadRecommendations()
    this.loadNotices()
  },

  // 刷新数据
  async refreshData() {
    await Promise.all([
      this.loadWasherStatus(),
      this.loadRecommendations(),
      this.loadNotices()
    ])
  },

  // 加载天气信息
  loadWeather() {
    this.setData({
      weather: {
        temp: 22,
        desc: '多云'
      }
    })
  },

  // 加载洗衣机状态 - 根据当前楼栋筛选
  async loadWasherStatus() {
    this.setData({ loading: true })
    
    try {
      const db = wx.cloud.database()
      const currentBuilding = this.data.currentBuilding || app.globalData.currentBuilding
      
      // 获取所有洗衣机
      const res = await db.collection('machines')
        .get()
      
      console.log('获取洗衣机数据成功:', res.data)
      
      if (res.data.length > 0) {
        let washerList = res.data.map(machine => {
          return {
            id: machine._id,
            name: machine.name,
            location: machine.location,
            type: machine.type,
            capacity: machine.capacity,
            pricePerHour: machine.pricePerHour,
            status: this.mapStatus(machine.status),
            statusText: this.getStatusText(machine.status),
            description: machine.description,
            remainingTime: null,
            building: machine.building || '一楼洗衣房' // 添加楼栋信息
          }
        })
        
        // 根据当前楼栋筛选洗衣机
        if (currentBuilding && currentBuilding.name) {
          washerList = washerList.filter(machine => 
            machine.location.includes(currentBuilding.name) || 
            (machine.building && machine.building.includes(currentBuilding.name))
          )
        }
        
        await this.updateWasherStatusWithReservations(washerList)
        
        this.setData({
          washerList: washerList,
          statusSummary: this.calculateStatusSummary(washerList),
          loading: false,
          hasData: true
        })
      } else {
        this.fallbackToMockData()
      }
      
    } catch (err) {
      console.error('获取洗衣机数据失败:', err)
      this.fallbackToMockData()
    }
  },

  // 根据预约数据更新洗衣机状态
  async updateWasherStatusWithReservations(washerList) {
    try {
      const db = wx.cloud.database()
      const now = new Date()
      
      const res = await db.collection('reservations')
        .where({
          status: 'pending'
        })
        .get()
      
      washerList.forEach(washer => {
        const machineReservations = res.data.filter(reservation => 
          reservation.machineId === washer.id
        )
        
        if (machineReservations.length > 0) {
          washer.status = 'booking'
          washer.statusText = '预约中'
          
          const nearestReservation = machineReservations[0]
          if (nearestReservation.reservationDateTime) {
            const reserveTime = new Date(nearestReservation.reservationDateTime)
            const timeDiff = Math.floor((reserveTime - now) / (1000 * 60))
            
            if (timeDiff > 0) {
              washer.remainingTime = `${timeDiff}分钟后开始`
            } else {
              washer.remainingTime = '即将开始'
            }
          }
        }
      })
      
    } catch (error) {
      console.error('获取预约数据失败:', error)
    }
  },

  // 映射状态到前端状态
  mapStatus(dbStatus) {
    const statusMap = {
      'available': 'idle',
      'reserved': 'booking', 
      'in_use': 'working',
      'pending': 'booking',
      'completed': 'ready',
      'maintenance': 'fault'
    }
    return statusMap[dbStatus] || 'idle'
  },

  // 获取状态文本
  getStatusText(dbStatus) {
    const statusTextMap = {
      'available': '空闲',
      'reserved': '预约中',
      'in_use': '工作中',
      'pending': '预约中',
      'completed': '待取衣',
      'maintenance': '故障'
    }
    return statusTextMap[dbStatus] || '空闲'
  },

  // 备用模拟数据 - 根据楼栋生成
  fallbackToMockData() {
    const currentBuilding = this.data.currentBuilding || app.globalData.currentBuilding
    const buildingName = currentBuilding ? currentBuilding.name : '一楼洗衣房'
    
    const mockData = [
      {
        id: 'machine_001',
        name: '滚筒洗衣机A',
        location: `${buildingName}A区`,
        type: '滚筒',
        capacity: '8kg',
        pricePerHour: 5,
        status: 'idle',
        statusText: '空闲',
        description: '大容量滚筒洗衣机，带烘干功能',
        building: buildingName
      },
      {
        id: 'machine_002',
        name: '波轮洗衣机B',
        location: `${buildingName}B区`,
        type: '波轮',
        capacity: '7kg',
        pricePerHour: 4,
        status: 'idle',
        statusText: '空闲',
        description: '节能波轮洗衣机',
        building: buildingName
      },
      {
        id: 'machine_003',
        name: '滚筒洗衣机C',
        location: `${buildingName}C区`,
        type: '滚筒',
        capacity: '10kg',
        pricePerHour: 6,
        status: 'working',
        statusText: '工作中',
        description: '超大容量滚筒洗衣机',
        building: buildingName,
        remainingTime: '25分钟'
      }
    ]
    
    this.setData({
      washerList: mockData,
      statusSummary: this.calculateStatusSummary(mockData),
      loading: false,
      hasData: true
    })
  },

  // 计算状态汇总
  calculateStatusSummary(washerList) {
    const summary = {
      idle: 0,
      booking: 0,
      working: 0,
      ready: 0
    }
    
    washerList.forEach(washer => {
      if (summary.hasOwnProperty(washer.status)) {
        summary[washer.status]++
      }
    })
    
    return summary
  },

  // 加载推荐信息
  loadRecommendations() {
    const recommendations = [
      {
        id: 1,
        time: '14:00-15:00',
        description: '当前时段使用率较低，推荐预约',
        score: 85
      },
      {
        id: 2,
        time: '20:00-21:00',
        description: '晚间高峰时段，建议提前预约',
        score: 92
      }
    ]
    
    this.setData({ recommendations })
  },

  // 加载公告信息
  async loadNotices() {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('announcements')
        .where({
          status: 'active'
        })
        .orderBy('createTime', 'desc')
        .limit(3)
        .get()
      
      if (res.data.length > 0) {
        const notices = res.data.map(notice => ({
          id: notice._id,
          title: notice.title,
          time: this.formatDate(notice.createTime),
          content: notice.content
        }))
        this.setData({ notices })
      } else {
        this.setDefaultNotices()
      }
    } catch (error) {
      console.error('加载公告失败:', error)
      this.setDefaultNotices()
    }
  },

  // 设置默认公告
  setDefaultNotices() {
    const notices = [
      {
        id: 1,
        title: '系统公告',
        time: '2024-01-15',
        content: '欢迎使用上大洗衣侠小程序'
      },
      {
        id: 2,
        title: '温馨提示',
        time: '2024-01-10',
        content: '请及时取走已完成的衣物'
      }
    ]
    this.setData({ notices })
  },

  // 格式化日期
  formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 选择洗衣机
  selectWasher(e) {
    const washer = e.currentTarget.dataset.washer
    if (washer.status === 'idle') {
      wx.navigateTo({
        url: `/pages/booking/booking?washerId=${washer.id}&washerName=${washer.name}&type=${washer.type}&price=${washer.pricePerHour}`
      })
    } else {
      wx.showToast({
        title: '该洗衣机暂不可用',
        icon: 'none'
      })
    }
  },

  // 立即预约 - 直接跳转到预约页面
  goToImmediateBooking() {
    console.log('点击立即预约')
    wx.switchTab({
      url: '/pages/booking/booking'
    })
  },

  // 选择楼栋
  goToBuilding() {
    wx.switchTab({
      url: '/pages/building/building'
    })
  },

  // 跳转到我的预约
goToMyBooking() {
  console.log('跳转到我的预约页面')
  
  if (!this.data.userInfo) {
    wx.showToast({
      title: '请先登录',
      icon: 'none'
    })
    return
  }
  
  // 跳转到我的预约页面
  wx.navigateTo({
    url: '/pages/my-booking/my-booking',
    success: () => {
      console.log('跳转到我的预约页面成功')
    },
    fail: (err) => {
      console.error('跳转失败:', err)
      wx.showToast({
        title: '跳转失败，请重试',
        icon: 'none'
      })
    }
  })
},

  // 消息中心
  goToMessage() {
    wx.navigateTo({
      url: '/pages/message/message'
    })
  },

  // 个人中心
  goToProfile() {
    wx.switchTab({
      url: '/pages/profile/profile'
    })
  },

  // 刷新状态
  refreshStatus() {
    this.loadWasherStatus()
    wx.showToast({
      title: '刷新成功',
      icon: 'success'
    })
  },

  // 查看公告
  viewNotice(e) {
    const notice = e.currentTarget.dataset.notice
    wx.showModal({
      title: notice.title,
      content: notice.content,
      showCancel: false
    })
  },

  // 跳转到预约页面
  goToBooking() {
    wx.switchTab({
      url: '/pages/booking/booking'
    })
  }
})