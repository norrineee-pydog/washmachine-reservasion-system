// pages/washer/washer.js
const app = getApp()

Page({
  data: {
    building: { id: null, name: '' },
    floorOptions: [],
    floorIndex: 0,
    washers: [],
    displayWashers: [],
    filterStatus: 'all',
    sortAsc: true,
    summary: { idle: 0, working: 0, booking: 0, ready: 0 }
  },

  onLoad(options) {
    const buildingId = Number(options.buildingId) || (app.globalData.currentBuilding && app.globalData.currentBuilding.id) || 1
    const floor = Number(options.floor) || 1
    const buildingName = (app.globalData.currentBuilding && app.globalData.currentBuilding.name) || '东区1号楼'
    const floors = (app.globalData.currentBuilding && app.globalData.currentBuilding.floors) || 6

    const floorOptions = Array.from({ length: floors }, (_, i) => `${i + 1} 楼`)
    const floorIndex = Math.min(Math.max(floor - 1, 0), floors - 1)

    this.setData({
      building: { id: buildingId, name: buildingName },
      floorOptions,
      floorIndex
    })

    this.loadWashers()
  },

  onPullDownRefresh() {
    this.loadWashers()
    wx.stopPullDownRefresh()
  },

  // 加载洗衣机列表（模拟）
  loadWashers() {
    const statusList = ['idle', 'working', 'booking', 'ready']
    const statusTextMap = { idle: '空闲', working: '使用中', booking: '预约中', ready: '待取衣' }
    const currentFloor = this.data.floorIndex + 1
    const washers = []
    for (let i = 1; i <= 12; i++) {
      const status = statusList[Math.floor(Math.random() * statusList.length)]
      washers.push({
        id: i,
        name: `洗衣机${currentFloor}-${i}`,
        location: `${currentFloor}楼洗衣房`,
        status,
        statusText: statusTextMap[status],
        remainingTime: this.mockRemain(status)
      })
    }
    const summary = this.calcSummary(washers)
    this.setData({ washers, summary })
    this.applyFilterAndSort()
  },

  mockRemain(status) {
    if (status === 'working') return `${10 + Math.floor(Math.random() * 30)}分钟`
    if (status === 'booking') return '约15分钟后可用'
    if (status === 'ready') return '已完成'
    return ''
  },

  calcSummary(list) {
    const s = { idle: 0, working: 0, booking: 0, ready: 0 }
    list.forEach(w => { if (s[w.status] !== undefined) s[w.status]++ })
    return s
  },

  onFloorChange(e) {
    this.setData({ floorIndex: Number(e.detail.value) })
    this.loadWashers()
  },

  onFilterStatus(e) {
    const status = e.currentTarget.dataset.status
    this.setData({ filterStatus: status })
    this.applyFilterAndSort()
  },

  toggleSort() {
    this.setData({ sortAsc: !this.data.sortAsc })
    this.applyFilterAndSort()
  },

  applyFilterAndSort() {
    const { washers, filterStatus, sortAsc } = this.data
    let list = washers
    if (filterStatus !== 'all') {
      list = list.filter(w => w.status === filterStatus)
    }
    // 将可用时间估算为排序权重：空闲最优，其它根据remainingTime数字排序
    const parseRemain = w => {
      if (w.status === 'idle') return 0
      const match = (w.remainingTime || '').match(/(\d+)/)
      return match ? Number(match[1]) : 999
    }
    list = list.slice().sort((a, b) => parseRemain(a) - parseRemain(b))
    if (!sortAsc) list.reverse()
    this.setData({ displayWashers: list })
  },

  onSelectWasher(e) {
    const washer = e.currentTarget.dataset.washer
    if (washer.status !== 'idle') {
      wx.showToast({ title: '该设备不可预约', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/booking/booking?washerId=${washer.id}&washerName=${washer.name}`
    })
  }
})


