// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    creditProgress: 0,
    bookingCount: 0,
    messageCount: 0,
    statistics: {
      totalBookings: 0,
      successRate: 0,
      avgWaitTime: 0,
      totalTime: 0
    },
    recentActivities: [],
    myReservations: [] // 新增：我的预约列表
  },

  onLoad() {
    console.log('个人中心页面加载')
    this.initPage()
  },

  onShow() {
    console.log('个人中心页面显示')
    this.loadUserData()
    this.loadMyReservations() // 新增：加载我的预约
  },

  onPullDownRefresh() {
    this.loadUserData()
    this.loadMyReservations()
    wx.stopPullDownRefresh()
  },

  // 初始化页面
  initPage() {
    this.loadUserData()
    this.loadStatistics()
    this.loadRecentActivities()
    this.loadMyReservations()
  },

  // 加载用户数据
  loadUserData() {
    const userInfo = app.globalData.userInfo
    this.setData({ userInfo })
    
    if (userInfo) {
      this.calculateCreditProgress(userInfo.creditScore)
      this.loadBadgeCounts()
    }
  },

  // 加载我的预约 - 新增方法
  loadMyReservations() {
    if (!this.data.userInfo) {
      console.log('用户未登录，不加载预约数据')
      return
    }

    const db = wx.cloud.database()
    
    // 查询当前用户的所有预约，按时间倒序排列
    db.collection('reservations')
      .where({
        userId: this.data.userInfo.userId || 'user_001' // 使用实际用户ID
      })
      .orderBy('reservationDateTime', 'desc')
      .get()
      .then(res => {
        console.log('获取我的预约成功:', res.data)
        
        const reservations = res.data.map(item => {
          return {
            id: item._id,
            machineName: item.machineName,
            location: item.machineLocation,
            date: item.reservationDate,
            time: item.reservationTime,
            status: item.status,
            statusText: this.getReservationStatusText(item.status),
            duration: item.duration,
            totalPrice: item.totalPrice
          }
        })
        
        this.setData({
          myReservations: reservations,
          bookingCount: reservations.filter(r => r.status === 'pending').length
        })
      })
      .catch(err => {
        console.error('获取我的预约失败:', err)
        // 使用模拟数据
        this.fallbackToMockReservations()
      })
  },

  // 获取预约状态文本
  getReservationStatusText(status) {
    const statusMap = {
      'pending': '待确认',
      'confirmed': '已确认',
      'completed': '已完成',
      'cancelled': '已取消'
    }
    return statusMap[status] || '未知状态'
  },

  // 备用模拟预约数据
  fallbackToMockReservations() {
    const mockReservations = [
      {
        id: 1,
        machineName: '滚筒洗衣机A',
        location: '一楼洗衣房',
        date: '2024-01-20',
        time: '14:00-15:00',
        status: 'pending',
        statusText: '待确认',
        duration: 60,
        totalPrice: 5
      },
      {
        id: 2,
        machineName: '波轮洗衣机B',
        location: '二楼洗衣房',
        date: '2024-01-19',
        time: '10:00-11:00',
        status: 'completed',
        statusText: '已完成',
        duration: 60,
        totalPrice: 5
      }
    ]
    
    this.setData({
      myReservations: mockReservations,
      bookingCount: mockReservations.filter(r => r.status === 'pending').length
    })
  },

  // 计算信用积分进度
  calculateCreditProgress(creditScore) {
    let progress = 0
    let level = '青铜'
    
    if (creditScore >= 96) {
      level = '钻石'
      progress = ((creditScore - 96) / 4) * 100
    } else if (creditScore >= 90) {
      level = '黄金'
      progress = ((creditScore - 90) / 6) * 100
    } else if (creditScore >= 80) {
      level = '白银'
      progress = ((creditScore - 80) / 10) * 100
    } else {
      level = '青铜'
      progress = (creditScore / 80) * 100
    }
    
    this.setData({ creditProgress: progress })
  },

  // 加载徽章数量
  loadBadgeCounts() {
    // 从本地存储读取已读消息ID列表
    const readMessages = wx.getStorageSync('readMessages') || []
    
    // 未读消息数量
    const messageCount = readMessages.includes(1) ? 0 : 1
    
    this.setData({
      messageCount
    })
  },

  // 加载统计数据
  loadStatistics() {
    // 基于实际预约数据计算统计
    const totalBookings = this.data.myReservations.length
    const completedBookings = this.data.myReservations.filter(r => r.status === 'completed').length
    const successRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0
    
    const statistics = {
      totalBookings: totalBookings,
      successRate: successRate,
      avgWaitTime: '5分钟',
      totalTime: `${totalBookings}小时`
    }
    
    this.setData({ statistics })
  },

  // 加载最近活动 - 修改为基于预约数据
  loadRecentActivities() {
    const activities = this.data.myReservations.slice(0, 4).map(reservation => {
      let type, icon, title
      
      switch(reservation.status) {
        case 'completed':
          type = 'completed'
          icon = '✅'
          title = `预约完成 - ${reservation.machineName}`
          break
        case 'pending':
          type = 'booking'
          icon = '📅'
          title = `新建预约 - ${reservation.machineName}`
          break
        case 'cancelled':
          type = 'cancelled'
          icon = '❌'
          title = `取消预约 - ${reservation.machineName}`
          break
        default:
          type = 'booking'
          icon = '📅'
          title = `预约更新 - ${reservation.machineName}`
      }
      
      return {
        id: reservation.id,
        type: type,
        icon: icon,
        title: title,
        time: reservation.date,
        status: reservation.statusText
      }
    })
    
    // 如果预约数据为空，使用默认活动
    if (activities.length === 0) {
      this.setData({ 
        recentActivities: this.getDefaultActivities() 
      })
    } else {
      this.setData({ recentActivities: activities })
    }
  },

  // 获取默认活动数据
  getDefaultActivities() {
    return [
      {
        id: 1,
        type: 'completed',
        icon: '✅',
        title: '预约完成',
        time: '2小时前',
        status: '已完成'
      },
      {
        id: 2,
        type: 'booking',
        icon: '📅',
        title: '新建预约',
        time: '昨天',
        status: '预约中'
      }
    ]
  },

  // 查看预约详情
  viewReservationDetail(e) {
    const reservation = e.currentTarget.dataset.reservation
    wx.navigateTo({
      url: `/pages/booking-detail/booking-detail?id=${reservation.id}`
    })
  },

  // 页面跳转
  goToPage(e) {
    const url = e.currentTarget.dataset.url
    
    if (!this.data.userInfo && url !== '/pages/help/help' && url !== '/pages/about/about') {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    if (url === '/pages/settings/settings' || url === '/pages/about/about') {
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      })
      return
    }
    
    wx.navigateTo({
      url: url
    })
  },

  // 跳转到登录页面
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.logout()
          this.setData({
            userInfo: null,
            creditProgress: 0,
            bookingCount: 0,
            messageCount: 0,
            myReservations: []
          })
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  },

  // 查看全部活动
  viewAllActivity() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  }
})