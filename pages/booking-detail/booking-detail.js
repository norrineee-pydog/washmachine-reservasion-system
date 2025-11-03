// pages/booking-detail/booking-detail.js
Page({
  data: {
    booking: null,
    countdownTimer: null
  },

  onLoad(options) {
    console.log('预约详情页面加载', options)
    this.loadBookingDetail(options.id)
  },

  onShow() {
    if (this.data.booking) {
      this.startCountdown()
    }
  },

  onHide() {
    this.stopCountdown()
  },

  onUnload() {
    this.stopCountdown()
  },

  // 加载预约详情
  loadBookingDetail(id) {
    // 生成动态时间
    const now = new Date()
    const formattedTime = this.formatTime(now)
    const bookingId = `BK${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}001`
    
    // 模拟数据
    const mockBooking = {
      id: id || 1,
      bookingId: bookingId,
      buildingName: '东区1号楼',
      washerName: '洗衣机3',
      bookingTime: formattedTime,
      status: 'pending',
      statusText: '预约中',
      statusDesc: '等待设备就绪',
      statusIcon: '⏰',
      remainingTime: '还有15分钟',
      endTime: now.getTime() + 15 * 60 * 1000
    }
    
    this.setData({ booking: mockBooking })
    this.startCountdown()
  },

  // 格式化时间
  formatTime(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  },

  // 开始倒计时
  startCountdown() {
    this.stopCountdown()
    
    if (!this.data.booking || !this.data.booking.endTime) {
      return
    }
    
    const updateCountdown = () => {
      const now = Date.now()
      const endTime = this.data.booking.endTime
      const remaining = Math.max(0, endTime - now)
      
      if (remaining <= 0) {
        this.setData({
          'booking.status': 'expired',
          'booking.statusText': '已过期',
          'booking.statusDesc': '预约已过期',
          'booking.statusIcon': '❌',
          'booking.remainingTime': '已过期'
        })
        this.stopCountdown()
        return
      }
      
      const minutes = Math.floor(remaining / 60000)
      const seconds = Math.floor((remaining % 60000) / 1000)
      const remainingTime = `还有${minutes}分${seconds}秒`
      
      this.setData({
        'booking.remainingTime': remainingTime
      })
    }
    
    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    this.setData({ countdownTimer: timer })
  },

  // 停止倒计时
  stopCountdown() {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer)
      this.setData({ countdownTimer: null })
    }
  },

  // 取消预约
  cancelBooking() {
    wx.showModal({
      title: '取消预约',
      content: '确定要取消当前预约吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '取消中...' })
          
          setTimeout(() => {
            wx.hideLoading()
            wx.showToast({
              title: '已取消预约',
              icon: 'success'
            })
            
            // 返回上一页
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          }, 1000)
        }
      }
    })
  },

  // 开始洗衣
  startWashing() {
    wx.showLoading({ title: '启动中...' })
    
    setTimeout(() => {
      wx.hideLoading()
      this.setData({
        'booking.status': 'working',
        'booking.statusText': '洗衣中',
        'booking.statusDesc': '正在洗衣，请耐心等待',
        'booking.statusIcon': '🔄',
        'booking.remainingTime': '预计30分钟完成'
      })
      
      wx.showToast({
        title: '已开始洗衣',
        icon: 'success'
      })
    }, 1000)
  },

  // 完成洗衣
  completeWashing() {
    wx.showModal({
      title: '完成洗衣',
      content: '确定已完成洗衣并取走衣物吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' })
          
          setTimeout(() => {
            wx.hideLoading()
            wx.showToast({
              title: '洗衣完成',
              icon: 'success'
            })
            
            // 返回上一页
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          }, 1000)
        }
      }
    })
  }
})
