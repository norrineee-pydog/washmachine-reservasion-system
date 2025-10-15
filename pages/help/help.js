// pages/help/help.js
Page({
  data: {
    faqList: [
      {
        id: 1,
        question: '如何预约洗衣机？',
        answer: '在首页选择楼栋，然后选择空闲的洗衣机，点击"立即预约"即可完成预约。',
        expanded: false
      },
      {
        id: 2,
        question: '预约后多久需要到达？',
        answer: '预约成功后，请在15分钟内到达指定洗衣机位置，超时预约将自动取消。',
        expanded: false
      },
      {
        id: 3,
        question: '如何取消预约？',
        answer: '在预约详情页面点击"取消预约"按钮，或在预约开始前15分钟以上取消不扣积分。',
        expanded: false
      },
      {
        id: 4,
        question: '信用积分如何计算？',
        answer: '按时使用预约+2分，预约超时-5分，占用超时-10分，恶意行为-20分。',
        expanded: false
      },
      {
        id: 5,
        question: '洗衣机故障怎么办？',
        answer: '如遇洗衣机故障，请及时联系宿管或通过小程序报修，我们会尽快处理。',
        expanded: false
      }
    ]
  },

  onLoad() {
    console.log('帮助页面加载')
  },

  // 跳转到分类
  goToCategory(e) {
    const category = e.currentTarget.dataset.category
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 切换FAQ展开状态
  toggleFaq(e) {
    const id = e.currentTarget.dataset.id
    const faqList = this.data.faqList.map(item => {
      if (item.id === id) {
        item.expanded = !item.expanded
      } else {
        item.expanded = false
      }
      return item
    })
    
    this.setData({ faqList })
  },

  // 拨打电话
  makeCall() {
    wx.makePhoneCall({
      phoneNumber: '400-123-4567'
    })
  },

  // 发送邮件
  sendEmail() {
    wx.showToast({
      title: '请手动发送邮件',
      icon: 'none'
    })
  },

  // 打开微信
  openWechat() {
    wx.showToast({
      title: '请手动添加微信',
      icon: 'none'
    })
  }
})
