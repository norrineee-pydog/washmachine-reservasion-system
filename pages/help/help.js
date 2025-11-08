// pages/help/help.js
Page({
  data: {
    categoryContents: {
      usage: '① 完成登录并完善宿舍信息；② 在首页或预约管理选择洗衣机；③ 根据提示完成预约、付款、开始和结束操作；④ 结束后及时取走衣物，以免占用。',
      booking: '预约流程：\n1. 选择“立即预约”或“时段预约”；\n2. 选择洗衣时长（25/45/60分钟）与目标时段；\n3. 挑选空闲洗衣机并确认预约；\n4. 在 15 分钟内完成付款（模拟付款），到达现场后点击开始洗衣；\n5. 使用完成后点击“完成洗衣”结束。',
      credit: '信用积分规则：\n• 初始分：100 分，范围 0~200；\n• 成功完成一次预约 +5 分；\n• 主动取消预约 -8 分；\n• 信用低于 60 分可能限制预约；\n• 信用记录可在“预约管理-统计”与“我的预约”查看。',
      troubleshoot: '常见故障处理：\n• 设备无法启动：确认电源与门锁是否关闭，可在详情页点击“取消预约”后重新预约；\n• 洗程中断：请及时联系宿舍管理员或客服电话；\n• 取消失败：检查网络与账号是否一致，必要时重新登录后再试。'
    },
    faqList: [
      {
        id: 1,
        question: '如何快速了解预约指南？',
        answer: '登录→选择洗衣机→确认时段→模拟付款→按时开始和完成。详细步骤可在帮助中心的“使用指南”查看。',
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
        answer: '在“当前预约”或“预约详情”页点击“取消预约”即可，取消后时段立即释放给其他用户。',
        expanded: false
      },
      {
        id: 4,
        question: '信用积分如何计算？',
        answer: '完成一次预约 +5 分；取消预约 -8 分；其他惡意行為將視情況扣分。信用值會影響後續是否能快速預約。',
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
    const content = this.data.categoryContents[category]
    if (!content) {
      wx.showToast({
        title: '敬请期待',
        icon: 'none'
      })
      return
    }
    const titleMap = {
      usage: '使用指南',
      booking: '预约流程',
      credit: '信用积分',
      troubleshoot: '故障排查'
    }
    wx.showModal({
      title: titleMap[category] || '帮助',
      content,
      showCancel: false
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
