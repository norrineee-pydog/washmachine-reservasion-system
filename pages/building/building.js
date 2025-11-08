// pages/building/building.js
const app = getApp()

Page({
  data: {
    searchKeyword: '',
    currentBuilding: null,
    favoriteBuildings: [],
    allBuildings: [],
    filteredBuildings: [],
    showDetailModal: false,
    selectedBuilding: null
  },

  onLoad() {
    console.log('楼栋页面加载')
    this.initPage()
  },

  onShow() {
    console.log('楼栋页面显示')
    this.loadBuildings()
  },

  onPullDownRefresh() {
    this.loadBuildings()
    wx.stopPullDownRefresh()
  },

  // 初始化页面
  initPage() {
    this.setData({
      currentBuilding: app.globalData.currentBuilding
    })
    this.loadBuildings()
    this.loadFavorites()
  },

  // 加载楼栋数据
  loadBuildings() {
    // 模拟API调用
    const mockBuildings = this.getMockBuildings()
    this.setData({
      allBuildings: mockBuildings,
      filteredBuildings: mockBuildings
    })
  },

  // 获取模拟楼栋数据
  getMockBuildings() {
    const buildings = [
      {
        id: 1,
        name: '东区1号楼',
        floors: 6,
        washerCount: 12,
        idleCount: 8,
        workingCount: 4,
        idleRate: 67,
        distance: 50,
        latitude: 31.2756,
        longitude: 121.5000,
        isFavorite: false,
        floorDetails: [
          { floor: 1, washerCount: 2, idleCount: 1 },
          { floor: 2, washerCount: 2, idleCount: 2 },
          { floor: 3, washerCount: 2, idleCount: 1 },
          { floor: 4, washerCount: 2, idleCount: 2 },
          { floor: 5, washerCount: 2, idleCount: 1 },
          { floor: 6, washerCount: 2, idleCount: 1 }
        ]
      },
      {
        id: 2,
        name: '东区2号楼',
        floors: 6,
        washerCount: 12,
        idleCount: 6,
        workingCount: 6,
        idleRate: 50,
        distance: 120,
        latitude: 31.2758,
        longitude: 121.5002,
        isFavorite: true,
        floorDetails: [
          { floor: 1, washerCount: 2, idleCount: 1 },
          { floor: 2, washerCount: 2, idleCount: 1 },
          { floor: 3, washerCount: 2, idleCount: 1 },
          { floor: 4, washerCount: 2, idleCount: 1 },
          { floor: 5, washerCount: 2, idleCount: 1 },
          { floor: 6, washerCount: 2, idleCount: 1 }
        ]
      },
      {
        id: 3,
        name: '西区1号楼',
        floors: 8,
        washerCount: 16,
        idleCount: 10,
        workingCount: 6,
        idleRate: 63,
        distance: 200,
        latitude: 31.2750,
        longitude: 121.4998,
        isFavorite: false,
        floorDetails: [
          { floor: 1, washerCount: 2, idleCount: 1 },
          { floor: 2, washerCount: 2, idleCount: 2 },
          { floor: 3, washerCount: 2, idleCount: 1 },
          { floor: 4, washerCount: 2, idleCount: 1 },
          { floor: 5, washerCount: 2, idleCount: 2 },
          { floor: 6, washerCount: 2, idleCount: 1 },
          { floor: 7, washerCount: 2, idleCount: 1 },
          { floor: 8, washerCount: 2, idleCount: 1 }
        ]
      },
      {
        id: 4,
        name: '南区1号楼',
        floors: 6,
        washerCount: 12,
        idleCount: 9,
        workingCount: 3,
        idleRate: 75,
        distance: 300,
        latitude: 31.2752,
        longitude: 121.5005,
        isFavorite: false,
        floorDetails: [
          { floor: 1, washerCount: 2, idleCount: 2 },
          { floor: 2, washerCount: 2, idleCount: 2 },
          { floor: 3, washerCount: 2, idleCount: 1 },
          { floor: 4, washerCount: 2, idleCount: 2 },
          { floor: 5, washerCount: 2, idleCount: 1 },
          { floor: 6, washerCount: 2, idleCount: 1 }
        ]
      }
    ]
    
    return buildings
  },

  // 加载收藏楼栋
  loadFavorites() {
    const favorites = wx.getStorageSync('favoriteBuildings') || []
    this.setData({ favoriteBuildings: favorites })
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value
    this.setData({ searchKeyword: keyword })
    this.filterBuildings(keyword)
  },

  // 清除搜索
  clearSearch() {
    this.setData({ searchKeyword: '' })
    this.filterBuildings('')
  },

  // 过滤楼栋
  filterBuildings(keyword) {
    const { allBuildings } = this.data
    let filtered = allBuildings
    
    if (keyword) {
      filtered = allBuildings.filter(building => 
        building.name.includes(keyword)
      )
    }
    
    this.setData({ filteredBuildings: filtered })
  },

  // 选择楼栋
  selectBuilding(e) {
    const building = e.currentTarget.dataset.building
    this.setData({
      selectedBuilding: building,
      showDetailModal: true
    })
  },

  // 确认选择楼栋
  confirmSelectBuilding() {
    const { selectedBuilding } = this.data
    
    // 更新全局当前楼栋
    app.globalData.currentBuilding = selectedBuilding
    
    this.setData({
      currentBuilding: selectedBuilding,
      showDetailModal: false
    })
    
    wx.showToast({
      title: `已切换到${selectedBuilding.name}`,
      icon: 'success'
    })
    
    // 不再跳转到首页，只关闭弹窗
  },

  // 关闭详情弹窗
  closeDetailModal() {
    this.setData({
      showDetailModal: false,
      selectedBuilding: null
    })
  },

  // 防止弹窗关闭
  preventClose() {
    // 空函数，防止点击内容区域关闭弹窗
  },

  // 切换收藏状态
  toggleFavorite(e) {
    const building = e.currentTarget.dataset.building
    const { favoriteBuildings, allBuildings } = this.data
    
    let newFavorites = [...favoriteBuildings]
    let newBuildings = [...allBuildings]
    
    const favoriteIndex = newFavorites.findIndex(fav => fav.id === building.id)
    const buildingIndex = newBuildings.findIndex(b => b.id === building.id)
    
    if (favoriteIndex > -1) {
      // 取消收藏
      newFavorites.splice(favoriteIndex, 1)
      newBuildings[buildingIndex].isFavorite = false
    } else {
      // 添加收藏
      newFavorites.push({ ...building, isFavorite: true })
      newBuildings[buildingIndex].isFavorite = true
    }
    
    this.setData({
      favoriteBuildings: newFavorites,
      allBuildings: newBuildings
    })
    
    // 保存到本地存储
    wx.setStorageSync('favoriteBuildings', newFavorites)
    
    wx.showToast({
      title: building.isFavorite ? '已取消收藏' : '已添加收藏',
      icon: 'success'
    })
  },

  // 移除收藏
  removeFavorite(e) {
    const building = e.currentTarget.dataset.building
    this.toggleFavorite(e)
  },

  // 刷新位置
  refreshLocation() {
    // 直接刷新楼栋数据，不显示定位
    this.loadBuildings()
    wx.showToast({
      title: '刷新成功',
      icon: 'success'
    })
  },

  // 跳转到楼层
  goToFloor(e) {
    const floor = e.currentTarget.dataset.floor
    wx.navigateTo({
      url: `/pages/washer/washer?buildingId=${this.data.selectedBuilding.id}&floor=${floor}`
    })
  }
})
