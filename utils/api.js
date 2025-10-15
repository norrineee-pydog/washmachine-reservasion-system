// utils/api.js
const app = getApp()

/**
 * 网络请求封装
 */
const request = (options) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: app.globalData.apiBaseUrl + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        'Authorization': app.globalData.userInfo ? `Bearer ${app.globalData.userInfo.token}` : '',
        ...options.header
      },
      success: (res) => {
        if (res.statusCode === 200) {
          if (res.data.code === 0) {
            resolve(res.data)
          } else {
            reject(res.data)
          }
        } else {
          reject(res)
        }
      },
      fail: reject
    })
  })
}

/**
 * 用户相关API
 */
const userApi = {
  // 微信登录
  wechatLogin: (code, userInfo) => {
    return request({
      url: '/user/wechat-login',
      method: 'POST',
      data: { code, userInfo }
    })
  },

  // 完善用户信息
  updateUserInfo: (userInfo) => {
    return request({
      url: '/user/update',
      method: 'POST',
      data: userInfo
    })
  },

  // 获取用户信息
  getUserInfo: () => {
    return request({
      url: '/user/info',
      method: 'GET'
    })
  }
}

/**
 * 楼栋相关API
 */
const buildingApi = {
  // 获取楼栋列表
  getBuildings: () => {
    return request({
      url: '/buildings',
      method: 'GET'
    })
  },

  // 根据位置获取楼栋
  getBuildingByLocation: (lat, lng) => {
    return request({
      url: '/buildings/location',
      method: 'GET',
      data: { lat, lng }
    })
  },

  // 获取楼栋详情
  getBuildingDetail: (buildingId) => {
    return request({
      url: `/buildings/${buildingId}`,
      method: 'GET'
    })
  }
}

/**
 * 洗衣机相关API
 */
const washerApi = {
  // 获取洗衣机列表
  getWashers: (buildingId, floor) => {
    return request({
      url: '/washers',
      method: 'GET',
      data: { buildingId, floor }
    })
  },

  // 获取洗衣机状态
  getWasherStatus: (washerId) => {
    return request({
      url: `/washers/${washerId}/status`,
      method: 'GET'
    })
  },

  // 更新洗衣机状态
  updateWasherStatus: (washerId, status) => {
    return request({
      url: `/washers/${washerId}/status`,
      method: 'PUT',
      data: { status }
    })
  }
}

/**
 * 预约相关API
 */
const bookingApi = {
  // 创建预约
  createBooking: (bookingData) => {
    return request({
      url: '/bookings',
      method: 'POST',
      data: bookingData
    })
  },

  // 获取预约列表
  getBookings: (status) => {
    return request({
      url: '/bookings',
      method: 'GET',
      data: { status }
    })
  },

  // 获取预约详情
  getBookingDetail: (bookingId) => {
    return request({
      url: `/bookings/${bookingId}`,
      method: 'GET'
    })
  },

  // 取消预约
  cancelBooking: (bookingId) => {
    return request({
      url: `/bookings/${bookingId}/cancel`,
      method: 'PUT'
    })
  },

  // 完成预约
  completeBooking: (bookingId) => {
    return request({
      url: `/bookings/${bookingId}/complete`,
      method: 'PUT'
    })
  }
}

/**
 * 消息相关API
 */
const messageApi = {
  // 获取消息列表
  getMessages: () => {
    return request({
      url: '/messages',
      method: 'GET'
    })
  },

  // 标记消息为已读
  markAsRead: (messageId) => {
    return request({
      url: `/messages/${messageId}/read`,
      method: 'PUT'
    })
  }
}

/**
 * 统计相关API
 */
const statisticsApi = {
  // 获取使用统计
  getUsageStats: () => {
    return request({
      url: '/statistics/usage',
      method: 'GET'
    })
  },

  // 获取推荐时段
  getRecommendations: (buildingId) => {
    return request({
      url: '/statistics/recommendations',
      method: 'GET',
      data: { buildingId }
    })
  }
}

module.exports = {
  request,
  userApi,
  buildingApi,
  washerApi,
  bookingApi,
  messageApi,
  statisticsApi
}
