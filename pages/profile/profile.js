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
  },

  onPullDownRefresh() {
    this.loadUserData()
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
    // 模拟数据
    this.setData({
      bookingCount: 1,
      messageCount: 3
    })
  },

  // 加载统计数据
  loadStatistics() {
    const statistics = {
      totalBookings: 25,
      successRate: 88,
      avgWaitTime: '5分钟',
      totalTime: '12小时'
    }
    
    this.setData({ statistics })
  },

  // 加载最近活动
  loadRecentActivities() {
    const activities = [
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
      },
      {
        id: 3,
        type: 'cancelled',
        icon: '❌',
        title: '取消预约',
        time: '3天前',
        status: '已取消'
      },
      {
        id: 4,
        type: 'completed',
        icon: '✅',
        title: '预约完成',
        time: '1周前',
        status: '已完成'
      }
    ]
    
    this.setData({ recentActivities: activities })
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
