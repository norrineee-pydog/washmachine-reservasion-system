// pages/my-booking/my-booking.js
const app = getApp()

Page({
  data: {
    loading: true,
    bookingList: [],
    filteredBookings: [], // 新增：存储筛选后的数据
    filterStatus: 'all',
    statusTabs: [
      { key: 'all', name: '全部' },
      { key: 'pending', name: '待确认' },
      { key: 'confirmed', name: '已确认' },
      { key: 'working', name: '洗衣中' },
      { key: 'completed', name: '已完成' },
      { key: 'cancelled', name: '已取消' }
    ],
    emptyText: '暂无预约记录'
  },

  onLoad() {
    console.log('我的预约页面加载')
    this.loadMyBookings()
  },

  onShow() {
    console.log('我的预约页面显示')
    this.loadMyBookings()
  },

  onPullDownRefresh() {
    this.loadMyBookings().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 加载我的预约数据
  async loadMyBookings() {
    this.setData({ loading: true })
    
    try {
      // 使用云函数查询预约记录（会自动使用OPENID）
      const result = await wx.cloud.callFunction({
        name: 'getMyReservations',
        data: {
          filterStatus: 'all'
        }
      })

      console.log('云函数返回结果:', result)

      if (!result.result.success) {
        throw new Error(result.result.message || '查询失败')
      }

      const resData = result.result.data || []
      console.log('获取预约数据成功，数据条数:', resData.length)

      const bookingList = resData.map(item => {
        console.log('处理数据项:', item)
        return {
          id: item._id,
          machineId: item.machineId,
          machineName: item.machineName || '未知设备',
          location: item.machineLocation || '未知位置',
          machineType: item.machineType || '未知类型',
          date: item.reservationDate || '未知日期',
          time: item.reservationTime || '未知时间',
          dateTime: item.reservationDateTime,
          endTime: item.endTime,
          duration: item.duration || 0,
          status: item.status || 'pending',
          statusText: this.getStatusText(item.status, item.paymentStatus),
          pricePerHour: item.pricePerHour || 0,
          totalPrice: item.totalPrice || 0,
          paymentStatus: item.paymentStatus || 'unpaid',
          createTime: item.createTime
        }
      })

      this.setData({ 
        bookingList: bookingList,
        loading: false,
        emptyText: bookingList.length === 0 ? '暂无预约记录' : '暂无预约记录'
      }, () => {
        // 数据设置完成后立即更新筛选结果
        this.updateFilteredBookings()
      })

    } catch (error) {
      console.error('获取预约数据失败:', error)
      this.setData({ 
        loading: false,
        emptyText: '加载失败，请下拉刷新',
        bookingList: [],
        filteredBookings: []
      })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 获取状态文本
  getStatusText(status, paymentStatus = 'paid') {
    if (paymentStatus === 'unpaid' && status === 'pending') {
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

  // 切换状态筛选
  onStatusTabChange(e) {
    const status = e.currentTarget.dataset.status
    this.setData({ 
      filterStatus: status 
    }, () => {
      this.updateFilteredBookings()
    })
  },

  // 更新筛选后的预约列表
  updateFilteredBookings() {
    const { bookingList, filterStatus } = this.data
    let filteredBookings = []
    
    if (filterStatus === 'all') {
      filteredBookings = bookingList
    } else {
      filteredBookings = bookingList.filter(item => item.status === filterStatus)
    }
    
    console.log('筛选后的数据:', filteredBookings)
    this.setData({ filteredBookings })
  },

  // 查看预约详情
  viewBookingDetail(e) {
    const booking = e.currentTarget.dataset.booking
    console.log('查看预约详情:', booking)
    wx.navigateTo({
      url: `/pages/booking-detail/booking-detail?id=${booking.id}`
    })
  },

  // 取消预约 - 使用云函数
  cancelBooking(e) {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation()
    }
    const booking = e.currentTarget.dataset.booking
    const that = this
    
    if (!booking) {
      return
    }
    
    console.log('取消预约数据:', booking)
    
    wx.showModal({
      title: '取消预约',
      content: `确定要取消「${booking.machineName}」的预约吗？`,
      confirmColor: '#ff4757',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '取消中...' })
            
            console.log('开始调用取消预约云函数...')
            
            const result = await wx.cloud.callFunction({
              name: 'cancelReservation',
              data: {
                reservationId: booking.id,
                machineId: booking.machineId
              }
            })
            
            console.log('云函数返回结果:', result)
            
            if (result.result.success) {
              console.log('取消成功，开始重新加载数据...')
              wx.hideLoading()
              wx.showToast({
                title: '取消成功',
                icon: 'success',
                duration: 2000
              })
              
              setTimeout(() => {
                that.loadMyBookings()
              }, 1000)
            } else {
              console.error('云函数返回失败:', result.result.message)
              throw new Error(result.result.message)
            }
            
          } catch (error) {
            console.error('取消预约失败:', error)
            wx.hideLoading()
            wx.showToast({
              title: error.message || '取消失败',
              icon: 'none',
              duration: 3000
            })
          }
        }
      }
    })
  },

  // 立即支付
  async payBooking(e) {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation()
    }
    const booking = e.currentTarget.dataset.booking
    if (!booking) {
      return
    }

    wx.showModal({
      title: '模拟付款',
      content: `支付金额：${booking.totalPrice}元`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '支付中...' })

            const result = await wx.cloud.callFunction({
              name: 'updateReservationStatus',
              data: {
                reservationId: booking.id,
                action: 'simulatePay'
              }
            })

            wx.hideLoading()

            if (!result.result || !result.result.success) {
              throw new Error(result.result?.message || '支付失败')
            }

            wx.showToast({
              title: '支付成功',
              icon: 'success'
            })

            this.loadMyBookings()
          } catch (error) {
            console.error('支付失败:', error)
            wx.hideLoading()
            wx.showToast({
              title: error.message || '支付失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  async startBooking(e) {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation()
    }
    const booking = e.currentTarget.dataset.booking
    if (!booking) {
      return
    }

    this.updateBookingStatus(booking, 'start', '启动中...', '已开始洗衣')
  },

  async completeBooking(e) {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation()
    }
    const booking = e.currentTarget.dataset.booking
    if (!booking) {
      return
    }

    wx.showModal({
      title: '完成洗衣',
      content: '确认洗衣已经完成吗？',
      success: (res) => {
        if (res.confirm) {
          this.updateBookingStatus(booking, 'complete', '处理中...', '已完成')
        }
      }
    })
  },

  async updateBookingStatus(booking, action, loadingText, successText) {
    try {
      wx.showLoading({ title: loadingText })

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

      this.loadMyBookings()
    } catch (error) {
      console.error('更新预约状态失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      })
    }
  },

  
  // 去预约页面
  goToBooking() {
    wx.navigateTo({
      url: '/pages/booking/booking'
    })
  },

  // 刷新数据
  onRefresh() {
    this.loadMyBookings()
  },

  // 返回上一页
  onBack() {
    wx.navigateBack()
  }
})