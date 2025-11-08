const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID

  if (!userId) {
    return {
      success: false,
      message: '用户未登录'
    }
  }

  const { action = 'get', profile = {} } = event
  const now = new Date()
  const userRef = db.collection('user').doc(userId)

  const ensureUser = async () => {
    try {
      const userDoc = await userRef.get()
      if (userDoc && userDoc.data) {
        return userDoc.data
      }
    } catch (error) {
      // ignore
    }

    const defaultProfile = {
      _id: userId,
      nickName: profile.nickName || '新用户',
      phone: profile.phone || '',
      buildingId: profile.buildingId || '',
      buildingName: profile.buildingName || '',
      roomNumber: profile.roomNumber || '',
      studentId: profile.studentId || '',
      creditScore: 100,
      creditHistory: [],
      createdAt: now,
      updatedAt: now
    }

    await userRef.set({
      data: defaultProfile
    })
    return defaultProfile
  }

  if (action === 'upsert') {
    try {
      // 确保用户存在
      await ensureUser()
      
      // 构建更新数据，排除_id字段
      const updatePayload = {}
      const fields = ['nickName', 'phone', 'buildingId', 'buildingName', 'roomNumber', 'studentId']
      
      fields.forEach((key) => {
        if (profile[key] !== undefined) {
          updatePayload[key] = profile[key]
        }
      })

      if (Object.keys(updatePayload).length > 0) {
        updatePayload.updatedAt = now
        
        // 使用update而不是set，避免包含_id字段
        await userRef.update({
          data: updatePayload
        })
      }

      // 获取更新后的用户数据
      const refreshed = await userRef.get()
      return {
        success: true,
        data: refreshed.data
      }
    } catch (error) {
      console.error('更新用户信息失败:', error)
      return {
        success: false,
        message: '更新用户信息失败: ' + (error.message || '未知错误')
      }
    }
  }

  // 默认获取用户信息
  try {
    const userDoc = await ensureUser()
    const refreshed = await userRef.get()
    return {
      success: true,
      data: refreshed.data || userDoc
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return {
      success: false,
      message: '获取用户信息失败: ' + (error.message || '未知错误')
    }
  }
}