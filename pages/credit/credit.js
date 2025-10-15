// pages/credit/credit.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    creditProgress: 0
  },

  onLoad() {
    console.log('信用中心页面加载')
    this.loadUserInfo()
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = app.globalData.userInfo
    this.setData({ userInfo })
    
    if (userInfo) {
      this.calculateCreditProgress(userInfo.creditScore)
    }
  },

  // 计算信用积分进度
  calculateCreditProgress(creditScore) {
    let progress = 0
    
    if (creditScore >= 96) {
      progress = ((creditScore - 96) / 4) * 100
    } else if (creditScore >= 90) {
      progress = ((creditScore - 90) / 6) * 100
    } else if (creditScore >= 80) {
      progress = ((creditScore - 80) / 10) * 100
    } else {
      progress = (creditScore / 80) * 100
    }
    
    this.setData({ creditProgress: Math.round(progress) })
  }
})
