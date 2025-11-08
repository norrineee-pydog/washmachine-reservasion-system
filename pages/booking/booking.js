// pages/booking/booking.js
const app = getApp()
const { formatDate } = require('../../utils/util')

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
    availableSlotsCount: 0, 
    availableWashers: [],
    availableWasherCount: 0,
    countdownTimer: null,
    searchKeyword: '',
    showSearch: false,
    filteredHistory: [],
    loadingHistory: false,
    availableTimeSlots: [],
    reservationData: [],
    pageType: '',
    durationOptions: [
      { label: '25分钟快洗', value: 25 },
      { label: '45分钟标准', value: 45 },
      { label: '60分钟深度', value: 60 }
    ],
    selectedDuration: 45,
    reservationWatcher: null
  },

  onLoad(options) {
    console.log('预约页面加载', options)
    this.setData({
      pageType: options.type || 'immediate'
    })
    
    this.initPage()
    this.startReservationWatcher()
    
    if (options.washerId) {
      this.setData({
        selectedWasher: {
          id: options.washerId,
          name: options.washerName,
          type: options.type,
          pricePerHour: options.price
        }
      })
      if (this.data.pageType === 'immediate') {
        this.showWasherPicker()
      } else {
        this.showTimePicker()
      }
    }
  },

  onShow() {
    console.log('预约页面显示')
    this.loadData()
    this.startReservationWatcher()
    setTimeout(() => {
      this.startCountdown()
    }, 100)
  },

  onHide() {
    this.stopCountdown()
    this.stopReservationWatcher()
  },

  onUnload() {
    this.stopCountdown()
    this.stopReservationWatcher()
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 初始化页面
  initPage() {
    this.loadCurrentBooking()
    this.loadRecommendations()
    this.loadBookingHistory()
    this.loadStatistics()
    this.initAvailableDates()
    this.loadAvailableWashers()
    this.loadReservationData()
  },

  startReservationWatcher() {
    if (this.data.reservationWatcher) {
      return
    }

    const db = wx.cloud.database()
    const _ = db.command

    try {
      const watcher = db.collection('reservations')
        .where({
          status: _.in(['pending', 'confirmed', 'working', 'cancelled'])
        })
        .watch({
          onChange: (snapshot) => {
            if (!snapshot || snapshot.type === 'init') {
              return
            }
            console.log('监听到预约变更:', snapshot)
            this.loadReservationData()
            this.generateRealTimeSlots()
            this.loadAvailableWashers()
          },
          onError: (error) => {
            console.error('预约监听错误:', error)
            this.stopReservationWatcher()
            setTimeout(() => {
              this.startReservationWatcher()
            }, 5000)
          }
        })

      this.setData({ reservationWatcher: watcher })
    } catch (error) {
      console.error('启动预约监听失败:', error)
    }
  },

  stopReservationWatcher() {
    const watcher = this.data.reservationWatcher
    if (watcher) {
      try {
        watcher.close()
      } catch (error) {
        console.warn('关闭预约监听失败:', error)
      }
      this.setData({ reservationWatcher: null })
    }
  },

  // 加载数据
  async loadData() {
    await Promise.all([
      this.loadCurrentBooking(),
      this.loadRecommendations(),
      this.loadBookingHistory(),
      this.loadStatistics(),
      this.loadReservationData()
    ])
  },

  // 加载预约数据（用于检查时间段可用性）
  async loadReservationData() {
    try {
      const db = wx.cloud.database()
      const _ = db.command
      // 查询所有待确认的预约，用于检查时间段冲突
      const res = await db.collection('reservations')
        .where({
          status: _.in(['pending', 'confirmed', 'working'])
        })
        .get()
      this.setData({ reservationData: res.data })
    } catch (error) {
      console.error('加载预约数据失败:', error)
    }
  },

  // 统一时间解析函数
  parseTime(timeValue) {
    console.log('解析时间:', timeValue, '类型:', typeof timeValue)
    
    if (!timeValue) {
      console.log('时间值为空，返回当前时间')
      return new Date()
    }
    
    try {
      // 处理云函数返回的日期对象
      if (typeof timeValue === 'object' && timeValue.$date) {
        const date = new Date(timeValue.$date)
        console.log('云数据库 $date 解析结果:', date)
        return date
      }

      if (typeof timeValue === 'object' && typeof timeValue.seconds === 'number') {
        const milliseconds = timeValue.seconds * 1000 + Math.floor((timeValue.nanoseconds || 0) / 1e6)
        const date = new Date(milliseconds)
        console.log('时间戳对象解析结果:', date)
        return date
      }

      // 如果是 ISO 字符串 (包含 'T')
      if (typeof timeValue === 'string' && timeValue.includes('T')) {
        const date = new Date(timeValue)
        console.log('ISO 字符串解析结果:', date)
        return date
      }
      
      // 如果是 "YYYY-MM-DD HH:mm:ss" 格式
      if (typeof timeValue === 'string' && timeValue.includes(' ')) {
        // 转换为 ISO 格式: "2025-11-06 21:00:00" -> "2025-11-06T21:00:00"
        const isoString = timeValue.replace(' ', 'T')
        const date = new Date(isoString)
        console.log('普通字符串解析结果:', date)
        return date
      }
      
      // 如果是数字（时间戳）
      if (typeof timeValue === 'number') {
        const date = new Date(timeValue)
        console.log('时间戳解析结果:', date)
        return date
      }
      
      // 如果是 Date 对象
      if (timeValue instanceof Date) {
        console.log('已经是 Date 对象:', timeValue)
        return timeValue
      }
      
      console.log('无法解析的时间格式，返回当前时间')
      return new Date()
    } catch (error) {
      console.error('时间解析错误:', error)
      return new Date()
    }
  },

  // 计算剩余时间文本 - 修改为15分钟
  getRemainingTimeText(endTime, paymentStatus = 'unpaid', status = 'pending') {
    if (!endTime) {
      if (status === 'completed') {
        return '已完成'
      }
      if (status === 'cancelled') {
        return '已取消'
      }
      return paymentStatus === 'unpaid' ? '已过期' : '时间已结束'
    }

    if (['completed', 'cancelled'].includes(status)) {
      return status === 'completed' ? '已完成' : '已取消'
    }

    const end = this.parseTime(endTime)
    const now = new Date()
    const remaining = Math.max(0, end.getTime() - now.getTime())
    
    if (remaining <= 0) {
      return '已过期'
    }
    
    const minutes = Math.floor(remaining / 60000)
    const seconds = Math.floor((remaining % 60000) / 1000)
    
    if (paymentStatus === 'unpaid' && status === 'pending') {
      return `等待付款 - ${minutes}分${seconds}秒内有效`
    }

    if (status === 'working') {
      return `洗衣剩余 ${minutes}分${seconds}秒`
    }

    return `还有${minutes}分${seconds}秒`
  },

  // 加载当前预约 - 修复时间解析
  async loadCurrentBooking() {
    const cancelledId = wx.getStorageSync('cancelledBookingId')
    
    if (cancelledId) {
      this.setData({ currentBooking: null })
      return
    }
    
    try {
      // 使用云函数查询当前用户的待确认预约
      const result = await wx.cloud.callFunction({
        name: 'getMyReservations',
        data: {
          filterStatus: 'active'
        }
      })
      
      if (result.result.success && result.result.data && result.result.data.length > 0) {
        const booking = result.result.data[0] // 获取最新的待确认预约
        
        console.log('📋 原始预约数据:', booking)
        console.log('⏰ endTime 原始值:', booking.endTime, '类型:', typeof booking.endTime)
        console.log('⏰ reservationDateTime 原始值:', booking.reservationDateTime, '类型:', typeof booking.reservationDateTime)
        
        // 使用统一时间解析函数
        const reservationDateTime = this.parseTime(booking.reservationDateTime)
        const usageDuration = booking.duration || 60
        const usageEndTime = booking.endTime
          ? this.parseTime(booking.endTime)
          : new Date(reservationDateTime.getTime() + usageDuration * 60 * 1000)

        const paymentDeadline = booking.paymentDeadline
          ? this.parseTime(booking.paymentDeadline)
          : (() => {
              const baseTime = booking.createTime ? this.parseTime(booking.createTime) : new Date()
              const payMinutes = booking.payDuration || 15
              return new Date(baseTime.getTime() + payMinutes * 60 * 1000)
            })()

        const shouldUsePaymentCountdown = booking.paymentStatus === 'unpaid' && booking.status === 'pending'
        const countdownEndTime = shouldUsePaymentCountdown
          ? paymentDeadline.getTime()
          : usageEndTime.getTime()

        console.log('🔄 处理后的时间:', {
          reservationDateTime: reservationDateTime.toString(),
          usageEndTime: usageEndTime.toString(),
          paymentDeadline: paymentDeadline.toString()
        })

        const currentBooking = {
          id: booking._id,
          buildingName: booking.machineLocation || '一楼洗衣房',
          washerName: booking.machineName,
          bookingTime: this.formatTime(reservationDateTime),
          status: booking.status || 'pending',
          paymentStatus: booking.paymentStatus || 'unpaid',
          statusText: this.getStatusText(booking.status, booking.paymentStatus),
          remainingTime: this.getRemainingTimeText(countdownEndTime, booking.paymentStatus, booking.status),
          endTime: countdownEndTime, // 用于倒计时展示
          usageEndTime: usageEndTime.getTime(),
          paymentDeadline: paymentDeadline.getTime(),
          reservationData: booking
        }
        
        console.log('🎉 最终当前预约对象:', currentBooking)
        this.setData({ currentBooking })
        return
      }
    } catch (error) {
      console.error('获取当前预约失败:', error)
    }
    
    this.setData({ currentBooking: null })
  },

  // 开始倒计时 - 修复版本
  startCountdown() {
    this.stopCountdown()
    
    if (!this.data.currentBooking || !this.data.currentBooking.endTime) {
      console.log('⏰ 没有有效的当前预约或结束时间，停止倒计时')
      return
    }
    
    console.log('⏱️ 开始倒计时，结束时间:', new Date(this.data.currentBooking.endTime))
    
    const updateCountdown = () => {
      const currentBooking = this.data.currentBooking
      const now = Date.now()
      const endTime = currentBooking.endTime
      
      if (!endTime) {
        console.log('❌ 结束时间无效')
        this.stopCountdown()
        return
      }
      
      const remaining = Math.max(0, endTime - now)
      
      console.log('⏳ 剩余时间:', remaining, 'ms')
      
      if (remaining <= 0) {
        console.log('⏰ 倒计时结束')
        const statusText = currentBooking.status === 'working' ? '洗衣已完成' : '已过期'
        this.setData({
          'currentBooking.remainingTime': statusText
        })
        this.stopCountdown()
        
        // 重新加载数据以更新状态
        this.loadCurrentBooking()
        return
      }
      
      const remainingTime = this.getRemainingTimeText(
        endTime,
        currentBooking.paymentStatus,
        currentBooking.status
      )

      this.setData({
        'currentBooking.remainingTime': remainingTime
      })
    }
    
    // 立即更新一次
    updateCountdown()
    
    // 每秒更新一次
    const timer = setInterval(updateCountdown, 1000)
    this.setData({ countdownTimer: timer })
    
    console.log('✅ 倒计时已启动')
  },

  // 停止倒计时
  stopCountdown() {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer)
      this.setData({ countdownTimer: null })
      console.log('⏹️ 倒计时已停止')
    }
  },

  // 加载推荐信息
  loadRecommendations() {
    const now = new Date()
    const currentHour = now.getHours()
    
    const recommendations = []
    
    const todayDate = formatDate(now)

    if (currentHour + 2 < 22) {
      const rec1Hour = currentHour + 2
      const endHour = rec1Hour + 1
      recommendations.push({
        id: 1,
        time: `${String(rec1Hour).padStart(2, '0')}:00-${String(endHour).padStart(2, '0')}:00`,
        date: '今天',
        dateValue: todayDate,
        hour: rec1Hour,
        score: 85,
        description: '当前时段使用率较低，推荐预约'
      })
    }
    
    if (currentHour < 20) {
      recommendations.push({
        id: 2,
        time: '20:00-21:00',
        date: '今天',
        dateValue: todayDate,
        hour: 20,
        score: 92,
        description: '晚间高峰时段，建议提前预约'
      })
    }
    
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const tomorrowDate = formatDate(tomorrow)
    recommendations.push({
      id: 3,
      time: '10:00-11:00',
      date: `${tomorrow.getMonth() + 1}/${tomorrow.getDate()}`,
      dateValue: tomorrowDate,
      hour: 10,
      score: 78,
      description: '上午时段，使用率适中'
    })
    
    this.setData({ recommendations })
  },

  // 加载预约历史
  async loadBookingHistory() {
    this.setData({ loadingHistory: true })
    
    try {
      // 使用云函数查询所有预约记录
      const result = await wx.cloud.callFunction({
        name: 'getMyReservations',
        data: {
          filterStatus: 'all'
        }
      })
      
      if (result.result.success) {
        const allBookings = result.result.data || []
        const totalCount = result.result.total || 0
        
        console.log('加载到的预约数据:', allBookings)
        console.log('总预约记录数:', totalCount)
        
        // 只显示前20条用于展示
        const displayBookings = allBookings.slice(0, 20)
        
        if (displayBookings.length > 0) {
          const history = displayBookings.map(booking => {
            // 使用统一时间解析
            const reservationDateTime = this.parseTime(booking.reservationDateTime)
            const reservationDate = booking.reservationDate
            const timeRange = booking.reservationTimeRange || booking.timeRange || booking.reservationTime
            const bookingTimeDisplay = reservationDate && timeRange
              ? `${reservationDate} ${timeRange}`
              : this.formatTime(reservationDateTime)
            
            return {
              id: booking._id,
              bookingTime: bookingTimeDisplay,
              buildingName: booking.machineLocation || '洗衣房',
              washerName: booking.machineName,
              status: booking.status,
              paymentStatus: booking.paymentStatus,
              statusText: this.getStatusText(booking.status, booking.paymentStatus),
              reservationDate: booking.reservationDate,
              totalPrice: booking.totalPrice,
              machineLocation: booking.machineLocation,
              canCancel: this.canCancelReservation(booking.status, booking.paymentStatus),
              rawData: booking
            }
          })
          
          this.setData({ 
            bookingHistory: history,
            filteredHistory: history,
            loadingHistory: false
          })
          
          // 使用总数更新统计
          await this.updateStatisticsWithTotal(totalCount, allBookings)
        } else {
          this.setData({ 
            bookingHistory: [],
            filteredHistory: [],
            loadingHistory: false
          })
          
          // 即使没有记录，也要更新统计
          await this.updateStatisticsWithTotal(0, [])
        }
        return
      } else {
        throw new Error(result.result.message || '查询失败')
      }
    } catch (error) {
      console.error('获取预约历史失败:', error)
      wx.showToast({
        title: '加载历史记录失败',
        icon: 'none'
      })
    }
    
    this.setData({ 
      bookingHistory: [],
      filteredHistory: [],
      loadingHistory: false
    })
    
    // 确保即使出错也更新统计
    await this.updateStatisticsWithTotal(0, [])
  },

  async refreshUserCredit() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'userProfile',
        data: { action: 'get' }
      })

      if (res.result && res.result.success && res.result.data) {
        app.globalData.userInfo = res.result.data
        app.globalData.isLogin = true
        wx.setStorageSync('userInfo', res.result.data)
        return res.result.data.creditScore || 100
      }
    } catch (error) {
      console.error('刷新信用分失败:', error)
    }

    return app.globalData.userInfo?.creditScore || 100
  },

  // 更新统计数据 - 使用总数和已加载的记录
  async updateStatisticsWithTotal(totalCount, history) {
    // 总预约显示为所有预约记录的总和
    const totalBookings = totalCount
    
    // 直接使用已加载的记录计算完成数（因为云函数已经返回了所有记录）
    const completedBookings = history.filter(item => 
      item.status === 'completed' || item.status === 'confirmed' || item.status === 'working'
    ).length
    
    const successRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0
    
    const creditScore = await this.refreshUserCredit()

    this.setData({
      statistics: {
        totalBookings: totalBookings, // 总预约 = 所有预约记录的总和
        successRate: successRate,
        avgWaitTime: '5分钟',
        creditScore
      }
    })
  },

  // 获取状态文本
  getStatusText(status, paymentStatus) {
    if (paymentStatus === 'unpaid') {
      return '待付款'
    }
    const statusMap = {
      'pending': '待确认',
      'confirmed': '已确认',
      'working': '洗衣中',
      'completed': '已完成',
      'cancelled': '已取消',
      'expired': '已过期'
    }
    return statusMap[status] || '未知状态'
  },

  canCancelReservation(status, paymentStatus) {
    if (status === 'completed' || status === 'cancelled' || status === 'expired') {
      return false
    }
    if (status === 'working') {
      return false
    }
    if (paymentStatus === 'paid' && status === 'confirmed') {
      return false
    }
    return true
  },

  // 加载统计数据
  async loadStatistics() {
    const creditScore = await this.refreshUserCredit()
    this.setData({
      statistics: {
        totalBookings: this.data.bookingHistory.length,
        successRate: 88,
        avgWaitTime: '5分钟',
        creditScore
      }
    })
  },

  // 初始化可用日期
  initAvailableDates() {
    const dates = []
    const today = new Date()
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      
      dates.push({
        date: formatDate(date),
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
    this.generateRealTimeSlots()
    this.setData({ showTimePicker: true })
  },

  // 关闭时间选择器
  closeTimePicker() {
    this.setData({ 
      showTimePicker: false,
      selectedTimeSlot: null
    })
    this.resetDuration()
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
    this.resetDuration()
  },

  // 生成真实的时间段 - 修复今天时段显示问题
  async generateRealTimeSlots() {
    wx.showLoading({ title: '加载时段...' })
    
    try {
      const db = wx.cloud.database()
      const _ = db.command
      const now = new Date()
      const selectedDate = this.data.selectedDate || this.data.availableDates[0]
      const todayDate = formatDate(now)
      const isToday = selectedDate.date === todayDate
      
      console.log('当前日期:', selectedDate.date, '是否是今天:', isToday)
      
      // 获取所有可用的洗衣机
      const machinesRes = await db.collection('machines')
        .where({
          status: 'available'
        })
        .get()
      
      console.log('可用洗衣机数量:', machinesRes.data.length)
      
      // 获取已预约的时间段
      const reservationsRes = await db.collection('reservations')
        .where({
          reservationDate: selectedDate.date,
          status: _.in(['pending', 'confirmed', 'working'])
        })
        .get()
      
      console.log('已预约数量:', reservationsRes.data.length)
      
      const availableMachines = machinesRes.data
      const bookedSlots = reservationsRes.data
      
      const slots = []
      const startHour = 8
      const endHour = 22
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 60) {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          const endHourTime = hour + 1
          const timeRange = `${time}-${endHourTime.toString().padStart(2, '0')}:00`
          
          let available = true
          
          // 修复：如果是今天，只过滤掉已经过去的时间段
          if (isToday) {
            // 当前时间的小时和分钟
            const currentTotalMinutes = currentHour * 60 + currentMinute
            const slotTotalMinutes = hour * 60 + minute
            
            // 如果时间段在当前时间之前，则不可用
            if (slotTotalMinutes < currentTotalMinutes) {
              available = false
              console.log(`时间段 ${timeRange} 已过期，当前时间: ${currentHour}:${currentMinute}`)
            }
          }
          
          // 检查该时段是否有可用洗衣机
          if (available) {
            // 计算该时段被预约的洗衣机数量
            const bookedInThisSlot = bookedSlots.filter(booking => {
              return booking.reservationTime === time
            }).length
            
            console.log(`时间段 ${timeRange} 已预约数量:`, bookedInThisSlot, '可用机器数量:', availableMachines.length)
            
            // 如果被预约的数量大于等于可用洗衣机数量，则该时段不可用
            available = bookedInThisSlot < availableMachines.length
          }
          
          slots.push({
            id: `${hour}-${minute}`,
            time: timeRange,
            available: available,
            availableCount: available ? availableMachines.length - bookedSlots.filter(booking => 
              booking.reservationTime === time
            ).length : 0,
            isPeakTime: hour >= 18 && hour < 21
          })
        }
      }
      
      const availableCount = slots.filter(item => item.available).length
      console.log('总时段数量:', slots.length, '可用时段数量:', availableCount)
      
      this.setData({ 
        timeSlots: slots,
        availableSlotsCount: availableCount
      })
      wx.hideLoading()
      
    } catch (error) {
      console.error('生成时间段失败:', error)
      wx.hideLoading()
      this.generateFallbackTimeSlots()
    }
  },

  // 备用时间段生成
  generateFallbackTimeSlots() {
    const slots = []
    const startHour = 8
    const endHour = 22
    const now = new Date()
    const selectedDate = this.data.selectedDate || this.data.availableDates[0]
    const isToday = selectedDate.date === formatDate(now)
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 60) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const endHourTime = hour + 1
        const timeRange = `${time}-${endHourTime.toString().padStart(2, '0')}:00`
        
        let available = true
        
        // 修复今天时段显示
        if (isToday) {
          const currentTotalMinutes = currentHour * 60 + currentMinute
          const slotTotalMinutes = hour * 60 + minute
          if (slotTotalMinutes < currentTotalMinutes) {
            available = false
          }
        }
        
        // 确保至少70%的时段可用
        if (available) {
          const random = Math.random()
          available = random > 0.3
        }
        
        slots.push({
          id: `${hour}-${minute}`,
          time: timeRange,
          available: available,
          availableCount: available ? Math.floor(Math.random() * 3) + 1 : 0,
          isPeakTime: hour >= 18 && hour < 21
        })
      }
    }
    
    this.setData({ 
      timeSlots: slots,
      availableSlotsCount: slots.filter(item => item.available).length  
    })
  },

  selectDuration(e) {
    const { duration } = e.currentTarget.dataset
    const value = Number(duration)

    if (!value) {
      return
    }

    this.setData({ selectedDuration: value })
  },

  resetDuration() {
    this.setData({ selectedDuration: 45 })
  },

  // 加载可用洗衣机 - 修复机器状态显示和数量计算
  async loadAvailableWashers() {
    try {
      const db = wx.cloud.database()
      
      // 获取所有洗衣机，包括已预约的
      const res = await db.collection('machines').get()
      
      if (res.data.length > 0) {
        // 计算真正可用的洗衣机数量
        const availableWashers = res.data.filter(machine => machine.status === 'available')
        
        const washers = res.data.map(machine => ({
          id: machine._id,
          name: machine.name,
          location: machine.location,
          type: machine.type,
          capacity: machine.capacity,
          pricePerHour: machine.pricePerHour,
          status: machine.status,
          statusText: this.getMachineStatusText(machine.status),
          description: machine.description,
          canBook: machine.status === 'available'
        }))
        
        console.log('洗衣机状态:', washers.map(w => ({name: w.name, status: w.status, canBook: w.canBook})))
        console.log('可用洗衣机数量:', availableWashers.length)
        
        this.setData({ 
          availableWashers: washers,
          availableWasherCount: availableWashers.length // 只计算可用的数量
        })
        return
      }
    } catch (error) {
      console.error('获取洗衣机失败:', error)
    }
    
    this.setData({ 
      availableWashers: [],
      availableWasherCount: 0
    })
  },

  // 获取洗衣机状态文本
  getMachineStatusText(status) {
    const statusMap = {
      'available': '空闲',
      'reserved': '已预约',
      'working': '工作中',
      'maintenance': '维修中'
    }
    return statusMap[status] || '未知状态'
  },

  // 选择日期
  selectDate(e) {
    const date = e.currentTarget.dataset.date
    this.setData({ selectedDate: date })
    if (this.data.showTimePicker) {
      this.generateRealTimeSlots()
    }
  },

  // 选择时间段 - 添加确认步骤
  selectTimeSlot(e) {
    const slot = e.currentTarget.dataset.slot;
    if (slot && slot.available) {
      // 显示确认对话框
      wx.showModal({
        title: '确认预约时段',
        content: `确定要预约 ${slot.time} 时段吗？\n剩余可用机器：${slot.availableCount}台`,
        success: (res) => {
          if (res.confirm) {
            this.setData({ selectedTimeSlot: slot })
            // 选择时段后显示洗衣机选择器
            this.showWasherPickerAfterTimeSelect()
          }
        }
      })
    } else if (slot && !slot.available) {
      wx.showToast({
        title: '该时段不可用',
        icon: 'none'
      })
    }
  },

  // 选择时段后显示洗衣机选择器
  showWasherPickerAfterTimeSelect() {
    this.loadAvailableWashersForTimeSlot()
    this.setData({ showWasherPicker: true })
  },

  // 为特定时段加载可用洗衣机
  async loadAvailableWashersForTimeSlot() {
    try {
      const db = wx.cloud.database()
      const _ = db.command
      const { selectedDate, selectedTimeSlot } = this.data
      
      if (!selectedTimeSlot) return
      
      // 获取该时段已预约的洗衣机ID
      const reservationsRes = await db.collection('reservations')
        .where({
          reservationDate: selectedDate.date,
          reservationTime: selectedTimeSlot.time.split('-')[0],
          status: _.in(['pending', 'confirmed', 'working'])
        })
        .get()
      
      const bookedMachineIds = reservationsRes.data.map(booking => booking.machineId)
      console.log('已预约的机器ID:', bookedMachineIds)
      
      // 获取所有可用的洗衣机
      const machinesRes = await db.collection('machines')
        .where({
          status: 'available'
        })
        .get()
      
      // 过滤出该时段可用的洗衣机
      const availableWashers = machinesRes.data
        .filter(machine => !bookedMachineIds.includes(machine._id))
        .map(machine => ({
          id: machine._id,
          name: machine.name,
          location: machine.location,
          type: machine.type,
          capacity: machine.capacity,
          pricePerHour: machine.pricePerHour,
          status: 'available',
          statusText: '空闲',
          description: machine.description,
          canBook: true
        }))
      
      console.log('该时段可用洗衣机:', availableWashers)
      
      this.setData({ 
        availableWashers: availableWashers,
        availableWasherCount: availableWashers.length
      })
      
    } catch (error) {
      console.error('加载时段可用洗衣机失败:', error)
      this.loadAvailableWashers() // 降级到普通加载
    }
  },

  // 选择洗衣机 - 添加确认步骤
  selectWasher(e) {
    const washer = e.currentTarget.dataset.washer
    
    if (!washer.canBook) {
      wx.showToast({
        title: '该洗衣机暂不可用',
        icon: 'none'
      })
      return
    }
    
    // 显示确认对话框
    wx.showModal({
      title: '确认预约',
      content: `确定要预约 ${washer.name} 吗？\n位置：${washer.location}\n价格：${washer.pricePerHour}元/小时`,
      success: (res) => {
        if (res.confirm) {
          this.setData({ selectedWasher: washer })
          if (this.data.selectedTimeSlot) {
            this.processTimeBooking()
          } else {
            this.processWasherBooking(washer)
          }
        }
      }
    })
  },

  // 处理洗衣机预约 - 使用云函数
  async processWasherBooking(washer) {
    wx.showLoading({ title: '预约中...' })
    
    try {
      const userInfo = app.globalData.userInfo
      const now = new Date()
      const duration = this.data.selectedDuration || 45
      
      // 使用当前实时时间作为预约时间
      const reservationDateTime = now
      const reservationDate = formatDate(now)
      const reservationTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      
      console.log('🕐 实时预约时间:', {
        reservationDateTime: reservationDateTime.toString(),
        reservationDate,
        reservationTime
      })
      
      // 调用云函数创建预约
      const result = await wx.cloud.callFunction({
        name: 'createReservation',
        data: {
          machineId: washer.id,
          machineName: washer.name,
          machineLocation: washer.location,
          machineType: washer.type,
          reservationDate: reservationDate,
          reservationTime: reservationTime,
          duration,
          pricePerHour: washer.pricePerHour,
          payDuration: 15 // 付款时长15分钟
        }
      })
      
      console.log('云函数返回:', result)
      
      if (result.result.success) {
        wx.hideLoading()
        this.closeWasherPicker()
        
        // 显示成功提示
        wx.showModal({
          title: '预约成功',
          content: `您已成功预约 ${washer.name}\n位置：${washer.location}\n洗衣时长：${duration}分钟\n请在15分钟内完成付款`,
          showCancel: false,
          confirmText: '立即付款',
          success: (res) => {
            if (res.confirm) {
              // 刷新数据
              this.loadCurrentBooking()
              this.loadBookingHistory()
              this.loadAvailableWashers() // 刷新洗衣机状态
              
              // 跳转到预约详情进行付款
              setTimeout(() => {
                wx.navigateTo({
                  url: `/pages/booking-detail/booking-detail?id=${result.result.reservationId}`
                }).catch(err => {
                  console.log('跳转失败:', err)
                  wx.navigateBack()
                })
              }, 500)
            }
          }
        })
      } else {
        throw new Error(result.result.message)
      }
      
    } catch (error) {
      console.error('预约失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '预约失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 处理时间预约 - 使用云函数
  async processTimeBooking() {
    const { selectedDate, selectedTimeSlot, selectedWasher } = this.data
    
    if (!selectedWasher) {
      wx.showToast({
        title: '请选择洗衣机',
        icon: 'none'
      })
      return
    }
    
    wx.showLoading({ title: '预约中...' })
    
    try {
      const reservationDate = selectedDate.date
      const timeSlotStr = selectedTimeSlot.time
      const now = new Date()
      
      // 计算预约时长（分钟）
      let slotDuration = 60
      let slotStartTime = timeSlotStr
      if (timeSlotStr.includes('-')) {
        // 时间段格式，计算实际时长
        const [startTime, endTime] = timeSlotStr.split('-')
        slotStartTime = startTime
        const [startHour, startMin] = startTime.split(':').map(Number)
        const [endHour, endMin] = endTime.split(':').map(Number)
        const startMinutes = startHour * 60 + startMin
        const endMinutes = endHour * 60 + endMin
        slotDuration = endMinutes - startMinutes
      }

      const selectedDuration = this.data.selectedDuration || slotDuration
      const duration = Math.min(selectedDuration, slotDuration)

      const [startHourStr, startMinuteStr] = slotStartTime.split(':')
      const startHour = Number(startHourStr)
      const startMinute = Number(startMinuteStr)
      const startMinutesAbsolute = startHour * 60 + startMinute
      const endMinutesAbsolute = startMinutesAbsolute + duration
      const endHour = Math.floor(endMinutesAbsolute / 60)
      const endMinute = endMinutesAbsolute % 60
      const endTimeText = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`
      const timeRange = `${slotStartTime}-${endTimeText}`
      
      console.log('🕐 定时预约时间:', {
        reservationDate,
        timeSlotStr,
        duration
      })
      
      // 调用云函数创建预约
      // 传递完整的时间段格式，让云函数处理
      const result = await wx.cloud.callFunction({
        name: 'createReservation',
        data: {
          machineId: selectedWasher.id,
          machineName: selectedWasher.name,
          machineLocation: selectedWasher.location,
          machineType: selectedWasher.type,
          reservationDate: reservationDate,
          reservationTime: slotStartTime,
          reservationTimeRange: timeRange,
          duration: duration, // 单位：分钟
          pricePerHour: selectedWasher.pricePerHour,
          payDuration: 15 // 付款时长15分钟
        }
      })
      
      console.log('云函数返回:', result)
      
      if (result.result.success) {
        wx.hideLoading()
        this.closeTimePicker()
        this.closeWasherPicker()

        // 显示成功提示
        wx.showModal({
          title: '预约成功',
          content: `您已成功预约 ${timeRange} 时段\n洗衣机：${selectedWasher.name}\n洗衣时长：${duration}分钟\n请在15分钟内完成付款`,
          showCancel: false,
          confirmText: '立即付款',
          success: (res) => {
            if (res.confirm) {
              this.loadCurrentBooking()
              this.loadBookingHistory()
              this.loadAvailableWashers() // 刷新洗衣机状态
              
              setTimeout(() => {
                wx.navigateTo({
                  url: `/pages/booking-detail/booking-detail?id=${result.result.reservationId}`
                })
              }, 500)
            }
          }
        })
      } else {
        throw new Error(result.result.message)
      }
      
    } catch (error) {
      console.error('预约失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '预约失败',
        icon: 'none'
      })
    }
  },

  // 选择推荐 - 添加确认步骤
  selectRecommendation(e) {
    const recommendation = e.currentTarget.dataset.recommendation
    
    wx.showModal({
      title: '确认预约',
      content: `确定预约${recommendation.time}时段吗？`,
      success: (res) => {
        if (res.confirm) {
          const times = recommendation.time.split('-')
          const [startHour, startMinute] = times[0].split(':')
          
          const targetDate = this.data.availableDates.find(d => d.date === recommendation.dateValue) || this.data.availableDates[0]
          
          const timeSlot = {
            id: `${startHour}-${startMinute}`,
            time: recommendation.time,
            available: true,
            availableCount: 1
          }
          
          this.setData({ 
            selectedTimeSlot: timeSlot,
            selectedDate: targetDate
          }, () => {
            this.showWasherPickerAfterTimeSelect()
          })
        }
      }
    })
  },

  // 取消预约 - 使用云函数
  async cancelBooking() {
    const { currentBooking } = this.data
    
    if (!currentBooking) return
    
    wx.showModal({
      title: '取消预约',
      content: '确定要取消当前预约吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '取消中...' })
          
          try {
            console.log('开始取消当前预约...')
            
            // 调用云函数取消预约
            const result = await wx.cloud.callFunction({
              name: 'cancelReservation',
              data: {
                reservationId: currentBooking.id,
                machineId: currentBooking.reservationData?.machineId
              }
            })
            
            console.log('取消预约云函数返回:', result)
            
            if (result.result.success) {
              wx.hideLoading()
              
              // 立即更新本地状态
              this.setData({ currentBooking: null })
              
              wx.showToast({
                title: '已取消预约',
                icon: 'success'
              })
              
              // 刷新数据
              this.loadAvailableWashers()
              this.loadCurrentBooking() // 重新加载当前预约状态
              this.loadBookingHistory() // 刷新历史记录
              
            } else {
              throw new Error(result.result.message)
            }
            
          } catch (error) {
            console.error('取消预约失败:', error)
            wx.hideLoading()
            wx.showToast({
              title: '取消失败，请重试',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  async cancelHistoryBooking(e) {
    const booking = e.currentTarget.dataset.booking
    if (!booking) {
      return
    }

    wx.showModal({
      title: '取消预约',
      content: `确定要取消「${booking.washerName}」的预约吗？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '取消中...' })
          try {
            const result = await wx.cloud.callFunction({
              name: 'cancelReservation',
              data: {
                reservationId: booking.id,
                machineId: booking.rawData?.machineId
              }
            })

            if (result.result.success) {
              wx.hideLoading()
              wx.showToast({
                title: '已取消预约',
                icon: 'success'
              })
              this.loadCurrentBooking()
              this.loadBookingHistory()
              this.loadAvailableWashers()
            } else {
              throw new Error(result.result.message || '取消失败')
            }
          } catch (error) {
            console.error('取消预约失败:', error)
            wx.hideLoading()
            wx.showToast({
              title: error.message || '取消失败，请重试',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 查看预约详情
  viewBookingDetail() {
    if (this.data.currentBooking) {
      wx.navigateTo({
        url: `/pages/booking-detail/booking-detail?id=${this.data.currentBooking.id}`
      })
    } else {
      wx.showToast({
        title: '没有当前预约',
        icon: 'none'
      })
    }
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

  // 搜索功能
  onSearchInput(e) {
    const keyword = e.detail.value
    this.setData({ searchKeyword: keyword })
    this.filterBookings(keyword)
  },

  filterBookings(keyword) {
    const { bookingHistory } = this.data
    let filtered = bookingHistory
    
    if (keyword) {
      filtered = bookingHistory.filter(booking => 
        booking.washerName.includes(keyword) ||
        booking.buildingName.includes(keyword) ||
        booking.bookingTime.includes(keyword) ||
        booking.statusText.includes(keyword) ||
        (booking.machineLocation && booking.machineLocation.includes(keyword))
      )
    }
    
    this.setData({ filteredHistory: filtered })
  },

  showSearch() {
    this.setData({ 
      showSearch: true,
      filteredHistory: this.data.bookingHistory
    })
  },

  hideSearch() {
    this.setData({ 
      showSearch: false,
      searchKeyword: '',
      filteredHistory: []
    })
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

  // 防止弹窗关闭
  preventClose() {
    // 空函数，防止点击内容区域关闭弹窗
  },

  // 测试预约功能
  testBooking() {
    const testWasher = {
      id: 'test_machine_001',
      name: '测试洗衣机',
      location: '一楼测试区',
      type: '滚筒',
      pricePerHour: 5,
      canBook: true
    }
    
    wx.showModal({
      title: '测试预约',
      content: '确定要创建测试预约吗？',
      success: (res) => {
        if (res.confirm) {
          this.processWasherBooking(testWasher)
        }
      }
    })
  }
})