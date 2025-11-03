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
    availableWashers: [],
    availableWasherCount: 0,
    countdownTimer: null
  },

  onLoad() {
    console.log('预约页面加载')
    this.initPage()
  },

  onShow() {
    console.log('预约页面显示')
    this.loadData()
    // 延迟启动倒计时，确保数据已加载
    setTimeout(() => {
      this.startCountdown()
    }, 100)
  },

  onHide() {
    this.stopCountdown()
  },

  onUnload() {
    this.stopCountdown()
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
    this.loadAvailableWashers() // 加载可用洗衣机数量
  },

  // 加载数据
  loadData() {
    this.loadCurrentBooking()
    this.loadRecommendations()
    this.loadBookingHistory()
  },

  // 加载当前预约
  loadCurrentBooking() {
    // 从本地存储读取取消状态
    const cancelledId = wx.getStorageSync('cancelledBookingId')
    
    // 如果当前预约已被取消，则不显示
    if (cancelledId === 1) {
      this.setData({ currentBooking: null })
      return
    }
    
    // 模拟当前预约数据，设置15分钟后到期
    const now = new Date()
    const endTime = new Date(now.getTime() + 15 * 60 * 1000) // 15分钟后
    
    // 格式化当前时间
    const formatTime = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}`
    }
    
    const mockBooking = {
      id: 1,
      buildingName: '东区1号楼',
      washerName: '洗衣机3',
      bookingTime: formatTime(now),
      status: 'pending',
      statusText: '预约中',
      remainingTime: '还有15分钟',
      endTime: endTime.getTime()
    }
    
    this.setData({ currentBooking: mockBooking })
  },

  // 开始倒计时
  startCountdown() {
    this.stopCountdown() // 先清除之前的定时器
    
    if (!this.data.currentBooking || !this.data.currentBooking.endTime) {
      return
    }
    
    const updateCountdown = () => {
      const now = Date.now()
      const endTime = this.data.currentBooking.endTime
      const remaining = Math.max(0, endTime - now)
      
      if (remaining <= 0) {
        // 倒计时结束
        this.setData({
          currentBooking: null
        })
        this.stopCountdown()
        return
      }
      
      // 计算剩余分钟
      const minutes = Math.floor(remaining / 60000)
      const seconds = Math.floor((remaining % 60000) / 1000)
      
      const remainingTime = `还有${minutes}分${seconds}秒`
      
      // 更新倒计时
      this.setData({
        'currentBooking.remainingTime': remainingTime
      })
    }
    
    // 立即更新一次
    updateCountdown()
    
    // 每秒更新一次
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

  // 加载推荐信息
  loadRecommendations() {
    const now = new Date()
    const currentHour = now.getHours()
    
    // 动态生成推荐时段
    const recommendations = []
    
    // 推荐1: 当前时间后2小时
    const rec1Hour = currentHour + 2
    if (rec1Hour < 22) {
      const endHour = rec1Hour + 1
      recommendations.push({
        id: 1,
        time: `${String(rec1Hour).padStart(2, '0')}:00-${String(endHour).padStart(2, '0')}:00`,
        date: '今天',
        dateValue: now.toISOString().split('T')[0],
        hour: rec1Hour,
        score: 85,
        description: '当前时段使用率较低，推荐预约'
      })
    }
    
    // 推荐2: 今天晚上黄金时段
    if (currentHour < 20) {
      recommendations.push({
        id: 2,
        time: '20:00-21:00',
        date: '今天',
        dateValue: now.toISOString().split('T')[0],
        hour: 20,
        score: 92,
        description: '晚间高峰时段，建议提前预约'
      })
    }
    
    // 推荐3: 明天上午
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    recommendations.push({
      id: 3,
      time: '10:00-11:00',
      date: `${tomorrow.getMonth() + 1}/${tomorrow.getDate()}`,
      dateValue: tomorrow.toISOString().split('T')[0],
      hour: 10,
      score: 78,
      description: '上午时段，使用率适中'
    })
    
    this.setData({ recommendations })
  },

  // 加载预约历史
  loadBookingHistory() {
    // 生成基于当前时间的最近预约历史
    const now = new Date()
    const history = []
    
    const formatTime = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}`
    }
    
    // 2小时前
    const time1 = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    history.push({
      id: 1,
      bookingTime: formatTime(time1),
      buildingName: '东区1号楼',
      washerName: '洗衣机5',
      status: 'completed',
      statusText: '已完成'
    })
    
    // 1天前
    const time2 = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    history.push({
      id: 2,
      bookingTime: formatTime(time2),
      buildingName: '东区2号楼',
      washerName: '洗衣机2',
      status: 'completed',
      statusText: '已完成'
    })
    
    // 3天前
    const time3 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    history.push({
      id: 3,
      bookingTime: formatTime(time3),
      buildingName: '西区1号楼',
      washerName: '洗衣机8',
      status: 'cancelled',
      statusText: '已取消'
    })
    
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
    const now = new Date()
    const selectedDate = this.data.selectedDate || this.data.availableDates[0]
    const isToday = selectedDate.date === now.toISOString().split('T')[0]
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        
        // 如果是今天，过滤掉过去的时间
        let available = true
        if (isToday) {
          const currentMinutes = now.getHours() * 60 + now.getMinutes()
          const slotMinutes = hour * 60 + minute
          if (slotMinutes <= currentMinutes) {
            available = false
          }
        }
        
        // 70%的时段可用，确保有足够选择
        if (available && Math.random() > 0.3) {
          available = true
        } else if (available) {
          available = false
        }
        
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
    
    // 计算空闲洗衣机数量
    const idleCount = washers.filter(w => w.status === 'idle').length
    
    this.setData({ 
      availableWashers: washers,
      availableWasherCount: idleCount
    })
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
          // 从推荐中解析时间段
          const times = recommendation.time.split('-')
          const [startHour, startMinute] = times[0].split(':')
          
          // 创建或查找对应的日期
          const targetDate = this.data.availableDates.find(d => d.date === recommendation.dateValue) || this.data.availableDates[0]
          
          // 创建一个时间段对象
          const timeSlot = {
            id: `${startHour}-${startMinute}`,
            time: recommendation.time,
            available: true
          }
          
          // 设置选择的时间段并直接预约
          this.setData({ 
            selectedTimeSlot: timeSlot,
            selectedDate: targetDate
          }, () => {
            this.confirmTimeBooking()
          })
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
            // 保存取消状态到本地存储
            wx.setStorageSync('cancelledBookingId', this.data.currentBooking.id)
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
