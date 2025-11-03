// pages/message/message.js
Page({
  data: {
    messageList: []
  },

  onLoad() {
    console.log('消息页面加载')
    this.loadMessages()
  },

  onShow() {
    console.log('消息页面显示')
    this.loadMessages()
  },

  // 加载消息列表
  loadMessages() {
    // 从本地存储读取已读消息ID列表
    const readMessages = wx.getStorageSync('readMessages') || []
    
    const messages = [
      {
        id: 1,
        type: 'booking',
        icon: '📅',
        title: '预约成功',
        content: '您已成功预约东区1号楼洗衣机3，预约时间：14:30',
        time: '2小时前',
        read: readMessages.includes(1)
      },
      {
        id: 2,
        type: 'system',
        icon: '🔔',
        title: '系统通知',
        content: '系统将于今晚22:00-24:00进行维护升级',
        time: '昨天',
        read: readMessages.includes(2)
      },
      {
        id: 3,
        type: 'warning',
        icon: '⚠️',
        title: '预约提醒',
        content: '您的预约还有15分钟开始，请及时前往',
        time: '3天前',
        read: readMessages.includes(3)
      }
    ]
    
    this.setData({ messageList: messages })
  },

  // 查看消息详情
  viewMessage(e) {
    const message = e.currentTarget.dataset.message
    
    // 标记为已读
    const messageList = this.data.messageList.map(item => {
      if (item.id === message.id) {
        item.read = true
      }
      return item
    })
    
    this.setData({ messageList })
    
    // 保存已读状态到本地存储
    const readMessages = wx.getStorageSync('readMessages') || []
    if (!readMessages.includes(message.id)) {
      readMessages.push(message.id)
      wx.setStorageSync('readMessages', readMessages)
    }
    
    wx.showModal({
      title: message.title,
      content: message.content,
      showCancel: false
    })
  }
})
