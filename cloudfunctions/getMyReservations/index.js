const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  const wxContext = cloud.getWXContext()
  
  try {
    // 验证用户OPENID
    if (!wxContext.OPENID) {
      return {
        success: false,
        message: '用户未登录，请先登录',
        data: [],
        total: 0
      }
    }
    
    const { filterStatus = 'all' } = event

    const userMatch = _.or([
      { userId: wxContext.OPENID },
      { _openid: wxContext.OPENID }
    ])

    let queryCondition = userMatch

    if (filterStatus === 'active') {
      queryCondition = _.and([
        userMatch,
        { status: _.in(['pending', 'confirmed', 'working']) }
      ])
    } else if (filterStatus !== 'all') {
      queryCondition = _.and([
        userMatch,
        { status: filterStatus }
      ])
    }

    const res = await db.collection('reservations')
      .where(queryCondition)
      .orderBy('reservationDateTime', 'desc')
      .get()
    
    return {
      success: true,
      data: res.data,
      total: res.data.length,
      openid: wxContext.OPENID // 返回OPENID用于调试
    }
    
  } catch (error) {
    console.error('获取预约记录失败:', error)
    return {
      success: false,
      message: '获取预约记录失败: ' + (error.message || '未知错误'),
      data: [],
      total: 0
    }
  }
}