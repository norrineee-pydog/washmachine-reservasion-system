// pages/login/login.js
const app = getApp()

Page({
  data: {
    isWechatLogin: false,
    isInfoComplete: false,
    agreed: false,
    loading: false,
    loadingText: '登录中...',
    formData: {
      studentId: '',
      buildingId: '',
      roomNumber: '',
      phone: ''
    },
    buildingList: [
      { id: 1, name: '东区1号楼' },
      { id: 2, name: '东区2号楼' },
      { id: 3, name: '东区3号楼' },
      { id: 4, name: '西区1号楼' },
      { id: 5, name: '西区2号楼' },
      { id: 6, name: '南区1号楼' },
      { id: 7, name: '南区2号楼' },
      { id: 8, name: '北区1号楼' }
    ],
    buildingIndex: 0
  },

  onLoad() {
    console.log('登录页面加载')
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus() {
    if (app.globalData.isLogin) {
      // 已登录，跳转到首页
      wx.switchTab({
        url: '/pages/index/index'
      })
    }
  },

  // 微信登录
  onWechatLogin(e) {
    if (!this.data.agreed) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true, loadingText: '微信登录中...' })

    // 获取用户信息
    const userInfo = e.detail.userInfo
    if (userInfo) {
      // 模拟微信登录API调用
      setTimeout(() => {
        this.setData({
          isWechatLogin: true,
          loading: false,
          userInfo: userInfo
        })
        
        wx.showToast({
          title: '微信登录成功',
          icon: 'success'
        })
      }, 1500)
    } else {
      this.setData({ loading: false })
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      })
    }
  },

  // 学号输入
  onStudentIdInput(e) {
    this.setData({
      'formData.studentId': e.detail.value
    })
  },

  // 楼栋选择
  onBuildingChange(e) {
    const index = e.detail.value
    this.setData({
      buildingIndex: index,
      'formData.buildingId': this.data.buildingList[index].id
    })
  },

  // 房间号输入
  onRoomNumberInput(e) {
    this.setData({
      'formData.roomNumber': e.detail.value
    })
  },

  // 手机号输入
  onPhoneInput(e) {
    this.setData({
      'formData.phone': e.detail.value
    })
  },

  // 完善信息
  completeInfo() {
    const { formData } = this.data
    
    // 表单验证
    if (!formData.studentId) {
      wx.showToast({
        title: '请输入学号',
        icon: 'none'
      })
      return
    }
    
    if (!formData.buildingId) {
      wx.showToast({
        title: '请选择楼栋',
        icon: 'none'
      })
      return
    }
    
    if (!formData.roomNumber) {
      wx.showToast({
        title: '请输入房间号',
        icon: 'none'
      })
      return
    }
    
    if (!formData.phone) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      })
      return
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(formData.phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true, loadingText: '保存信息中...' })

    // 模拟保存用户信息API调用
    setTimeout(() => {
      this.setData({
        isInfoComplete: true,
        loading: false
      })
      
      wx.showToast({
        title: '信息保存成功',
        icon: 'success'
      })
    }, 1000)
  },

  // 开始使用
  startUsing() {
    this.setData({ loading: true, loadingText: '初始化中...' })

    // 构建完整的用户信息
    const userInfo = {
      ...this.data.userInfo,
      studentId: this.data.formData.studentId,
      buildingId: this.data.formData.buildingId,
      buildingName: this.data.buildingList[this.data.buildingIndex].name,
      roomNumber: this.data.formData.roomNumber,
      phone: this.data.formData.phone,
      creditScore: 100,
      level: '青铜',
      token: 'mock_token_' + Date.now()
    }

    // 模拟登录API调用
    setTimeout(() => {
      // 保存用户信息到全局
      app.login(userInfo)
      
      this.setData({ loading: false })
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })

      // 跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        })
      }, 1500)
    }, 1000)
  },

  // 切换协议同意状态
  toggleAgreement() {
    this.setData({
      agreed: !this.data.agreed
    })
  },

  // 查看用户协议
  viewUserAgreement() {
    wx.showModal({
      title: '用户协议',
      content: '这里是用户协议的内容...',
      showCancel: false
    })
  },

  // 查看隐私政策
  viewPrivacyPolicy() {
    wx.showModal({
      title: '隐私政策',
      content: '这里是隐私政策的内容...',
      showCancel: false
    })
  }
})
