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

  // 刷新用户资料 - 现在正确包含在Page对象内
  async refreshUserProfile() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'userProfile',
        data: { action: 'get' }
      })

      if (res.result && res.result.success && res.result.data) {
        const app = getApp()
        app.globalData.userInfo = res.result.data
        app.globalData.isLogin = true
        wx.setStorageSync('userInfo', res.result.data)
      }
    } catch (error) {
      console.error('刷新用户资料失败:', error)
    }
  },

  // 加载预约详情
  async loadBookingDetail(id) {
    if (!id) {
      wx.showToast({
        title: '预约ID不存在',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    wx.showLoading({ title: '加载中...' })

    try {
      const db = wx.cloud.database()
      const result = await db.collection('reservations').doc(id).get()

      if (!result.data) {
        throw new Error('预约记录不存在')
      }

      const booking = result.data
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

      const shouldCountdownPayment = booking.paymentStatus === 'unpaid' && booking.status === 'pending'
      const shouldCountdownUsage = ['pending', 'confirmed', 'working'].includes(booking.status)
      const countdownEndTime = (shouldCountdownPayment ? paymentDeadline.getTime() : null) || (shouldCountdownUsage ? usageEndTime.getTime() : null)

      const bookingId = `BK${reservationDateTime.getFullYear()}${String(reservationDateTime.getMonth() + 1).padStart(2, '0')}${String(reservationDateTime.getDate()).padStart(2, '0')}${String(id).slice(-3).padStart(3, '0')}`
      const statusInfo = this.getStatusInfo(booking.status, booking.paymentStatus)
      const remainingTime = this.getRemainingTimeText(countdownEndTime, booking.paymentStatus, booking.status)

      const bookingDetail = {
        id: booking._id,
        bookingId,
        buildingName: booking.machineLocation || '未知位置',
        washerName: booking.machineName,
        bookingTime: this.formatTime(reservationDateTime),
        reservationTimeRange: booking.reservationTimeRange || booking.reservationTime,
        duration: booking.duration || 60,
        pricePerHour: booking.pricePerHour || 0,
        totalPrice: booking.totalPrice || 0,
        status: booking.status,
        paymentStatus: booking.paymentStatus || 'unpaid',
        statusText: statusInfo.text,
        statusDesc: statusInfo.desc,
        statusIcon: statusInfo.icon,
        remainingTime,
        countdownEndTime,
        endTime: countdownEndTime,
        usageEndTime: usageEndTime.getTime(),
        paymentDeadline: paymentDeadline.getTime(),
        reservationData: booking
      }

      this.setData({ booking: bookingDetail })
      wx.hideLoading()
      this.startCountdown()
    } catch (error) {
      console.error('加载预约详情失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 获取状态信息
  getStatusInfo(status, paymentStatus) {
    if (paymentStatus === 'unpaid') {
      return {
        text: '待付款',
        desc: '请尽快完成付款',
        icon: '💰'
      }
    }

    const statusMap = {
      pending: {
        text: '待确认',
        desc: '等待设备就绪',
        icon: '⏰'
      },
      confirmed: {
        text: '已确认',
        desc: '预约已确认',
        icon: '✅'
      },
      working: {
        text: '洗衣中',
        desc: '正在洗衣，请耐心等待',
        icon: '🔄'
      },
      completed: {
        text: '已完成',
        desc: '洗衣已完成',
        icon: '✔️'
      },
      cancelled: {
        text: '已取消',
        desc: '预约已取消',
        icon: '❌'
      },
      expired: {
        text: '已过期',
        desc: '预约已过期',
        icon: '❌'
      }
    }

    return statusMap[status] || {
      text: '未知状态',
      desc: '状态未知',
      icon: '❓'
    }
  },

  // 统一时间解析
  parseTime(timeValue) {
    if (!timeValue) {
      return new Date()
    }

    try {
      if (typeof timeValue === 'string') {
        if (timeValue.includes('T')) {
          return new Date(timeValue)
        }
        return new Date(timeValue.replace(' ', 'T'))
      }

      if (typeof timeValue === 'number') {
        return new Date(timeValue)
      }

      if (timeValue instanceof Date) {
        return timeValue
      }

      if (typeof timeValue === 'object') {
        if (timeValue.$date) {
          return new Date(timeValue.$date)
        }
        if (typeof timeValue.seconds === 'number') {
          const milliseconds = timeValue.seconds * 1000 + Math.floor((timeValue.nanoseconds || 0) / 1e6)
          return new Date(milliseconds)
        }
      }
    } catch (error) {
      console.error('解析时间失败:', error)
    }

    return new Date()
  },

  // 计算倒计时文本
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

    const target = typeof endTime === 'number' ? endTime : this.parseTime(endTime).getTime()
    const remaining = Math.max(0, target - Date.now())

    if (remaining <= 0) {
      return status === 'working' ? '洗衣已完成' : '已过期'
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

    const booking = this.data.booking
    if (!booking) {
      return
    }

    if (['completed', 'cancelled'].includes(booking.status)) {
      return
    }

    const countdownEndTime = booking?.countdownEndTime || booking?.endTime
    if (!countdownEndTime) {
      return
    }

    const updateCountdown = () => {
      const updatedBooking = this.data.booking
      if (!updatedBooking) {
        this.stopCountdown()
        return
      }

      const remaining = Math.max(0, countdownEndTime - Date.now())

      if (remaining <= 0) {
        const updates = {
          'booking.remainingTime': updatedBooking.status === 'working' ? '洗衣已完成' : '已过期'
        }

        if (updatedBooking.paymentStatus === 'unpaid' && updatedBooking.status === 'pending') {
          updates['booking.status'] = 'expired'
          updates['booking.statusText'] = '已过期'
          updates['booking.statusDesc'] = '预约已过期'
          updates['booking.statusIcon'] = '❌'
        }

        this.setData(updates)
        this.stopCountdown()
        return
      }

      const remainingTime = this.getRemainingTimeText(
        countdownEndTime,
        updatedBooking.paymentStatus,
        updatedBooking.status
      )

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
  async cancelBooking() {
    const { booking } = this.data

    if (!booking) return

    wx.showModal({
      title: '取消预约',
      content: '确定要取消当前预约吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '取消中...' })

          try {
            const result = await wx.cloud.callFunction({
              name: 'cancelReservation',
              data: {
                reservationId: booking.id,
                machineId: booking.reservationData?.machineId
              }
            })

            if (result.result.success) {
              wx.hideLoading()
              wx.showToast({
                title: '已取消预约',
                icon: 'success'
              })

              setTimeout(() => {
                wx.navigateBack()
              }, 1500)
            } else {
              throw new Error(result.result.message || '取消失败')
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

  // 开始洗衣
  startWashing() {
    if (!this.data.booking) {
      return
    }

    this.updateReservationStatus('start', {
      loadingText: '启动中...',
      successText: '已开始洗衣'
    })
  },

  // 完成洗衣
  completeWashing() {
    if (!this.data.booking) {
      return
    }

    wx.showModal({
      title: '完成洗衣',
      content: '确定已完成洗衣并取走衣物吗？',
      success: (res) => {
        if (res.confirm) {
          this.updateReservationStatus('complete', {
            loadingText: '处理中...',
            successText: '洗衣完成'
          })
        }
      }
    })
  },

  // 模拟付款
  simulatePayment() {
    const { booking } = this.data
    if (!booking) {
      return
    }

    const totalPrice = booking.reservationData?.totalPrice || booking.totalPrice || 0

    wx.showModal({
      title: '模拟付款',
      content: `确认支付 ¥${totalPrice} 吗？`,
      success: (res) => {
        if (res.confirm) {
          this.updateReservationStatus('simulatePay', {
            loadingText: '支付中...',
            successText: '付款成功'
          })
        }
      }
    })
  },

  async updateReservationStatus(action, { loadingText = '处理中...', successText = '操作成功' } = {}) {
    const { booking } = this.data
    if (!booking) {
      return
    }

    wx.showLoading({ title: loadingText })

    try {
      const result = await wx.cloud.callFunction({
        name: 'updateReservationStatus',
        data: {
          reservationId: booking.id,
          action
        }
      })

      wx.hideLoading()

      if (!result.result || !result.result.success) {
        throw new Error(result.result?.message || '操作失败')
      }

      wx.showToast({
        title: successText,
        icon: 'success'
      })

      await this.refreshUserProfile()
      this.loadBookingDetail(booking.id)
    } catch (error) {
      console.error('更新预约状态失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      })
    }
  }
})