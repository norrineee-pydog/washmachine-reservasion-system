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
    loading: false
  },

  onLoad() {
    console.log('首页加载')
    this.initPage()
  },

  onShow() {
    console.log('首页显示')
    this.refreshData()
  },

  onPullDownRefresh() {
    this.refreshData()
    wx.stopPullDownRefresh()
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
  refreshData() {
    this.loadWasherStatus()
    this.loadRecommendations()
    this.loadNotices()
  },

  // 加载天气信息
  loadWeather() {
    // 模拟天气数据
    this.setData({
      weather: {
        temp: 22,
        desc: '多云'
      }
    })
  },

  // 加载洗衣机状态 - 修改为从云数据库获取
  loadWasherStatus() {
    this.setData({ loading: true })
    
    const db = wx.cloud.database()
    
    // 查询当前楼栋的洗衣机
    db.collection('washing_machines')
      .where({
        building: this.data.currentBuilding ? this.data.currentBuilding.name : '东区1号楼'
      })
      .get()
      .then(res => {
        console.log('获取洗衣机数据成功:', res.data)
        
        const washerList = res.data.map(machine => {
          // 转换数据库字段为前端需要的格式
          return {
            id: machine._id,
            name: machine.machineName || machine.name,
            location: machine.machineLocation || machine.location,
            status: this.mapStatus(machine.status),
            statusText: this.getStatusText(machine.status),
            remainingTime: this.getRemainingTime(machine.status, machine.endTime),
            machineData: machine // 保留原始数据
          }
        })
        
        this.setData({
          washerList: washerList,
          statusSummary: this.calculateStatusSummary(washerList),
          loading: false
        })
      })
      .catch(err => {
        console.error('获取洗衣机数据失败:', err)
        // 失败时使用模拟数据
        this.fallbackToMockData()
      })
  },

  // 映射状态到前端状态
  mapStatus(dbStatus) {
    const statusMap = {
      'available': 'idle',
      'reserved': 'booking', 
      'in_use': 'working',
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
      'completed': '待取衣',
      'maintenance': '故障'
    }
    return statusTextMap[dbStatus] || '空闲'
  },

  // 获取剩余时间
  getRemainingTime(status, endTime) {
    if (status === 'reserved') {
      return '15分钟后可用'
    } else if (status === 'in_use' && endTime) {
      // 计算剩余时间
      const now = new Date()
      const end = new Date(endTime)
      const diff = Math.max(0, Math.floor((end - now) / (1000 * 60))) // 分钟
      return `${diff}分钟`
    } else if (status === 'completed') {
      return '已完成'
    }
    return null
  },

  // 备用模拟数据
  fallbackToMockData() {
    const mockData = this.getMockWasherData()
    this.setData({
      washerList: mockData,
      statusSummary: this.calculateStatusSummary(mockData),
      loading: false
    })
  },

  // 获取模拟洗衣机数据（备用）
  getMockWasherData() {
    const statuses = ['idle', 'booking', 'working', 'ready', 'fault']
    const statusTexts = {
      'idle': '空闲',
      'booking': '预约中',
      'working': '工作中',
      'ready': '待取衣',
      'fault': '故障'
    }
    
    const washers = []
    for (let i = 1; i <= 12; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)]
      const washer = {
        id: i,
        name: `洗衣机${i}`,
        location: `${Math.ceil(i / 2)}楼洗衣房`,
        status: status,
        statusText: statusTexts[status],
        remainingTime: this.getRemainingTime(status)
      }
      washers.push(washer)
    }
    
    return washers
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
  loadNotices() {
    const notices = [
      {
        id: 1,
        title: '系统维护通知',
        time: '2024-01-15',
        content: '系统将于今晚22:00-24:00进行维护升级'
      },
      {
        id: 2,
        title: '新增功能上线',
        time: '2024-01-10',
        content: '智能推荐功能已上线，为您推荐最佳洗衣时段'
      }
    ]
    
    this.setData({ notices })
  },

  // 选择洗衣机
  selectWasher(e) {
    const washer = e.currentTarget.dataset.washer
    if (washer.status === 'idle') {
      wx.navigateTo({
        url: `/pages/booking/booking?washerId=${washer.id}&washerName=${washer.name}`
      })
    } else {
      wx.showToast({
        title: '该洗衣机暂不可用',
        icon: 'none'
      })
    }
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

  // 跳转到楼栋页面
  goToBuilding() {
    wx.switchTab({
      url: '/pages/building/building'
    })
  },

  // 跳转到预约页面
  goToBooking() {
    wx.switchTab({
      url: '/pages/booking/booking'
    })
  },

  // 跳转到消息页面
  goToMessage() {
    wx.navigateTo({
      url: '/pages/message/message'
    })
  },

  // 跳转到个人中心
  goToProfile() {
    wx.switchTab({
      url: '/pages/profile/profile'
    })
  }
})