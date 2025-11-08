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
    recentActivities: []
  },

  onLoad() {
    console.log('个人中心页面加载')
    this.initPage()
  },

  onShow() {
    console.log('个人中心页面显示')
    this.loadUserData()
    this.loadStatistics() // 加载统计数据
  },

  onPullDownRefresh() {
    this.loadUserData()
    this.loadStatistics()
    wx.stopPullDownRefresh()
  },

  // 初始化页面
  initPage() {
    this.loadUserData()
    this.loadStatistics()
    this.loadRecentActivities()
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
  async loadBadgeCounts() {
    // 从本地存储读取已读消息ID列表
    const readMessages = wx.getStorageSync('readMessages') || []
    
    // 未读消息数量
    const messageCount = readMessages.includes(1) ? 0 : 1
    
    // 从数据库加载待确认的预约数量
    let bookingCount = 0
    try {
      const db = wx.cloud.database()
      const userInfo = app.globalData.userInfo
      
      if (userInfo && userInfo._id) {
        const res = await db.collection('reservations')
          .where({
            userId: userInfo._id,
            status: 'pending'
          })
          .count()
        
        bookingCount = res.total || 0
      }
    } catch (error) {
      console.error('加载预约数量失败:', error)
    }
    
    this.setData({
      messageCount,
      bookingCount
    })
  },

  // 加载统计数据
  async loadStatistics() {
    try {
      const userInfo = app.globalData.userInfo
      
      if (!userInfo) {
        this.setData({
          statistics: {
            totalBookings: 0,
            successRate: 0,
            avgWaitTime: '0分钟',
            totalTime: '0小时'
          }
        })
        return
      }
      
      const res = await wx.cloud.callFunction({
        name: 'getMyReservations',
        data: {
          filterStatus: 'all'
        }
      })
      
      const allReservations = (res.result && res.result.data) ? res.result.data : []
      
      const totalBookings = allReservations.length
      const completedBookings = allReservations.filter(r =>
        r.status === 'completed' || r.status === 'confirmed' || r.status === 'working'
      ).length
      const successRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0
      
      const totalDuration = allReservations
        .filter(r => r.duration)
        .reduce((sum, r) => sum + Number(r.duration || 0), 0)
      const totalHours = totalDuration > 0 ? (totalDuration / 60).toFixed(1) : '0'
      
      this.setData({
        statistics: {
          totalBookings: totalBookings,
          successRate: successRate,
          avgWaitTime: '5分钟',
          totalTime: `${totalHours}小时`
        }
      })
    } catch (error) {
      console.error('加载统计数据失败:', error)
      // 使用默认值
      this.setData({
        statistics: {
          totalBookings: 0,
          successRate: 0,
          avgWaitTime: '0分钟',
          totalTime: '0小时'
        }
      })
    }
  },

  // 加载最近活动 - 修改为基于预约数据
  async loadRecentActivities() {
    try {
      const db = wx.cloud.database()
      const userInfo = app.globalData.userInfo
      
      if (!userInfo || !userInfo._id) {
        this.setData({ 
          recentActivities: this.getDefaultActivities() 
        })
        return
      }
      
      // 从数据库加载最近的预约记录
      const res = await db.collection('reservations')
        .where({
          userId: userInfo._id
        })
        .orderBy('reservationDateTime', 'desc')
        .limit(4)
        .get()
      
      if (res.data && res.data.length > 0) {
        const activities = res.data.map(reservation => {
          let type, icon, title
          
          switch(reservation.status) {
            case 'completed':
              type = 'completed'
              icon = '✅'
              title = `预约完成 - ${reservation.machineName || '洗衣机'}`
              break
            case 'pending':
              type = 'booking'
              icon = '📅'
              title = `新建预约 - ${reservation.machineName || '洗衣机'}`
              break
            case 'cancelled':
              type = 'cancelled'
              icon = '❌'
              title = `取消预约 - ${reservation.machineName || '洗衣机'}`
              break
            default:
              type = 'booking'
              icon = '📅'
              title = `预约更新 - ${reservation.machineName || '洗衣机'}`
          }
          
          return {
            id: reservation._id,
            type: type,
            icon: icon,
            title: title,
            time: reservation.reservationDate || '未知时间',
            status: this.getReservationStatusText(reservation.status)
          }
        })
        
        this.setData({ recentActivities: activities })
      } else {
        this.setData({ 
          recentActivities: this.getDefaultActivities() 
        })
      }
    } catch (error) {
      console.error('加载最近活动失败:', error)
      this.setData({ 
        recentActivities: this.getDefaultActivities() 
      })
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
            messageCount: 0
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