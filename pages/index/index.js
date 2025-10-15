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

  // 加载洗衣机状态
  loadWasherStatus() {
    this.setData({ loading: true })
    
    // 模拟API调用
    setTimeout(() => {
      const mockData = this.getMockWasherData()
      this.setData({
        washerList: mockData,
        statusSummary: this.calculateStatusSummary(mockData),
        loading: false
      })
    }, 1000)
  },

  // 获取模拟洗衣机数据
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

  // 获取剩余时间
  getRemainingTime(status) {
    switch (status) {
      case 'booking':
        return '15分钟后可用'
      case 'working':
        return `${Math.floor(Math.random() * 30) + 10}分钟`
      case 'ready':
        return '已完成'
      default:
        return null
    }
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
