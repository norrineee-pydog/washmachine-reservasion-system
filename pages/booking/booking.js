// pages/booking/booking.js
const app = getApp()

Page({
  data: {
    currentBooking: null,
    recommendations: [],
    bookingHistory: [],
    statistics: {
      totalBookings: 0,
      successRate: 0,
      avgWaitTime: 0,
      creditScore: 100
    },
    showTimePicker: false,
    showWasherPicker: false,
    selectedDate: null,
    selectedTimeSlot: null,
    selectedWasher: null,
    availableDates: [],
    timeSlots: [],
    availableWashers: []
  },

  onLoad() {
    console.log('预约页面加载')
    this.initPage()
  },

  onShow() {
    console.log('预约页面显示')
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData()
    wx.stopPullDownRefresh()
  },

  // 初始化页面
  initPage() {
    this.loadCurrentBooking()
    this.loadRecommendations()
    this.loadBookingHistory()
    this.loadStatistics()
    this.initAvailableDates()
  },

  // 加载数据
  loadData() {
    this.loadCurrentBooking()
    this.loadRecommendations()
    this.loadBookingHistory()
  },

  // 加载当前预约
  loadCurrentBooking() {
    // 模拟当前预约数据
    const mockBooking = {
      id: 1,
      buildingName: '东区1号楼',
      washerName: '洗衣机3',
      bookingTime: '2024-01-15 14:30',
      status: 'pending',
      statusText: '预约中',
      remainingTime: '还有15分钟'
    }
    
    this.setData({ currentBooking: mockBooking })
  },

  // 加载推荐信息
  loadRecommendations() {
    const recommendations = [
      {
        id: 1,
        time: '14:00-15:00',
        date: '今天',
        score: 85,
        description: '当前时段使用率较低，推荐预约'
      },
      {
        id: 2,
        time: '20:00-21:00',
        date: '今天',
        score: 92,
        description: '晚间高峰时段，建议提前预约'
      },
      {
        id: 3,
        time: '10:00-11:00',
        date: '明天',
        score: 78,
        description: '上午时段，使用率适中'
      }
    ]
    
    this.setData({ recommendations })
  },

  // 加载预约历史
  loadBookingHistory() {
    const history = [
      {
        id: 1,
        bookingTime: '2024-01-14 16:30',
        buildingName: '东区1号楼',
        washerName: '洗衣机5',
        status: 'completed',
        statusText: '已完成'
      },
      {
        id: 2,
        bookingTime: '2024-01-13 20:00',
        buildingName: '东区2号楼',
        washerName: '洗衣机2',
        status: 'completed',
        statusText: '已完成'
      },
      {
        id: 3,
        bookingTime: '2024-01-12 14:00',
        buildingName: '西区1号楼',
        washerName: '洗衣机8',
        status: 'cancelled',
        statusText: '已取消'
      }
    ]
    
    this.setData({ bookingHistory: history })
  },

  // 加载统计数据
  loadStatistics() {
    const userInfo = app.globalData.userInfo
    const statistics = {
      totalBookings: 25,
      successRate: 88,
      avgWaitTime: '5分钟',
      creditScore: userInfo ? userInfo.creditScore : 100
    }
    
    this.setData({ statistics })
  },

  // 初始化可用日期
  initAvailableDates() {
    const dates = []
    const today = new Date()
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      
      dates.push({
        date: date.toISOString().split('T')[0],
        dateText: `${date.getMonth() + 1}/${date.getDate()}`,
        dayText: i === 0 ? '今天' : i === 1 ? '明天' : `周${['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}`
      })
    }
    
    this.setData({ 
      availableDates: dates,
      selectedDate: dates[0]
    })
  },

  // 快速预约
  quickBook(e) {
    const type = e.currentTarget.dataset.type
    
    if (type === 'immediate') {
      this.showWasherPicker()
    } else if (type === 'schedule') {
      this.showTimePicker()
    }
  },

  // 显示时间选择器
  showTimePicker() {
    this.generateTimeSlots()
    this.setData({ showTimePicker: true })
  },

  // 关闭时间选择器
  closeTimePicker() {
    this.setData({ 
      showTimePicker: false,
      selectedTimeSlot: null
    })
  },

  // 显示洗衣机选择器
  showWasherPicker() {
    this.loadAvailableWashers()
    this.setData({ showWasherPicker: true })
  },

  // 关闭洗衣机选择器
  closeWasherPicker() {
    this.setData({ 
      showWasherPicker: false,
      selectedWasher: null
    })
  },

  // 生成时间段
  generateTimeSlots() {
    const slots = []
    const startHour = 8
    const endHour = 22
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const available = Math.random() > 0.3 // 模拟70%可用率
        
        slots.push({
          id: `${hour}-${minute}`,
          time: time,
          available: available
        })
      }
    }
    
    this.setData({ timeSlots: slots })
  },

  // 加载可用洗衣机
  loadAvailableWashers() {
    const washers = [
      {
        id: 1,
        name: '洗衣机1',
        location: '1楼洗衣房',
        status: 'idle',
        statusText: '空闲',
        distance: 50
      },
      {
        id: 2,
        name: '洗衣机2',
        location: '1楼洗衣房',
        status: 'idle',
        statusText: '空闲',
        distance: 60
      },
      {
        id: 3,
        name: '洗衣机3',
        location: '2楼洗衣房',
        status: 'working',
        statusText: '使用中',
        distance: 80
      },
      {
        id: 4,
        name: '洗衣机4',
        location: '2楼洗衣房',
        status: 'idle',
        statusText: '空闲',
        distance: 90
      }
    ]
    
    this.setData({ availableWashers: washers })
  },

  // 选择日期
  selectDate(e) {
    const date = e.currentTarget.dataset.date
    this.setData({ selectedDate: date })
    this.generateTimeSlots()
  },

  // 选择时间段
  selectTimeSlot(e) {
    const slot = e.currentTarget.dataset.slot
    if (slot.available) {
      this.setData({ selectedTimeSlot: slot })
    }
  },

  // 选择洗衣机
  selectWasher(e) {
    const washer = e.currentTarget.dataset.washer
    if (washer.status === 'idle') {
      this.setData({ selectedWasher: washer })
    }
  },

  // 确认时间预约
  confirmTimeBooking() {
    const { selectedDate, selectedTimeSlot } = this.data
    
    if (!selectedTimeSlot) {
      wx.showToast({
        title: '请选择时间段',
        icon: 'none'
      })
      return
    }
    
    wx.showLoading({ title: '预约中...' })
    
    // 模拟预约API调用
    setTimeout(() => {
      wx.hideLoading()
      this.closeTimePicker()
      
      wx.showToast({
        title: '预约成功',
        icon: 'success'
      })
      
      // 跳转到预约详情页面
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/booking-detail/booking-detail'
        })
      }, 1500)
    }, 1000)
  },

  // 确认洗衣机预约
  confirmWasherBooking() {
    const { selectedWasher } = this.data
    
    if (!selectedWasher) {
      wx.showToast({
        title: '请选择洗衣机',
        icon: 'none'
      })
      return
    }
    
    wx.showLoading({ title: '预约中...' })
    
    // 模拟预约API调用
    setTimeout(() => {
      wx.hideLoading()
      this.closeWasherPicker()
      
      wx.showToast({
        title: '预约成功',
        icon: 'success'
      })
      
      // 跳转到预约详情页面
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/booking-detail/booking-detail'
        })
      }, 1500)
    }, 1000)
  },

  // 选择推荐
  selectRecommendation(e) {
    const recommendation = e.currentTarget.dataset.recommendation
    wx.showModal({
      title: '确认预约',
      content: `确定预约${recommendation.time}时段吗？`,
      success: (res) => {
        if (res.confirm) {
          this.confirmTimeBooking()
        }
      }
    })
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
            this.setData({ currentBooking: null })
            
            wx.showToast({
              title: '已取消预约',
              icon: 'success'
            })
          }, 1000)
        }
      }
    })
  },

  // 查看预约详情
  viewBookingDetail() {
    wx.navigateTo({
      url: '/pages/booking-detail/booking-detail'
    })
  },

  // 查看历史详情
  viewHistoryDetail(e) {
    const booking = e.currentTarget.dataset.booking
    wx.navigateTo({
      url: `/pages/booking-detail/booking-detail?id=${booking.id}`
    })
  },

  // 查看全部历史
  viewAllHistory() {
    wx.navigateTo({
      url: '/pages/booking-detail/booking-detail?type=history'
    })
  },

  // 防止弹窗关闭
  preventClose() {
    // 空函数，防止点击内容区域关闭弹窗
  }
})
