// pages/booking-detail/booking-detail.js
Page({
  data: {
    booking: {
      id: 1,
      bookingId: 'BK20240115001',
      buildingName: '东区1号楼',
      washerName: '洗衣机3',
      bookingTime: '2024-01-15 14:30',
      status: 'pending',
      statusText: '预约中',
      statusDesc: '等待设备就绪',
      statusIcon: '⏰',
      remainingTime: '还有15分钟'
    }
  },

  onLoad(options) {
    console.log('预约详情页面加载', options)
    this.loadBookingDetail(options.id)
  },

  // 加载预约详情
  loadBookingDetail(id) {
    // 模拟数据
    const mockBooking = {
      id: id || 1,
      bookingId: 'BK20240115001',
      buildingName: '东区1号楼',
      washerName: '洗衣机3',
      bookingTime: '2024-01-15 14:30',
      status: 'pending',
      statusText: '预约中',
      statusDesc: '等待设备就绪',
      statusIcon: '⏰',
      remainingTime: '还有15分钟'
    }
    
    this.setData({ booking: mockBooking })
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
