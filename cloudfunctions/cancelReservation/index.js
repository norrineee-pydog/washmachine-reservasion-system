const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  const wxContext = cloud.getWXContext()
  
  const adjustUserCredit = async ({ userId, delta, reason, now }) => {
    if (!userId || typeof delta !== 'number') {
      return
    }

    const userRef = db.collection('user').doc(userId)
    let currentScore = 100

    try {
      const doc = await userRef.get()
      if (doc.data) {
        currentScore = typeof doc.data.creditScore === 'number' ? doc.data.creditScore : 100
      }
    } catch (error) {
      await userRef.set({
        data: {
          creditScore: currentScore,
          creditHistory: [],
          createdAt: now,
          updatedAt: now
        }
      })
    }

    const newScore = Math.max(0, Math.min(200, currentScore + delta))

    await userRef.update({
      data: {
        creditScore: newScore,
        creditHistory: _.push([{
          reason,
          delta,
          scoreAfter: newScore,
          timestamp: now
        }]),
        updatedAt: now
      }
    })
  }
  
  try {
    // 参数验证
    const { reservationId, machineId } = event
    
    if (!reservationId) {
      return {
        success: false,
        message: '缺少必要参数：reservationId 为必填项'
      }
    }
    
    // 验证用户OPENID
    if (!wxContext.OPENID) {
      return {
        success: false,
        message: '用户未登录，请先登录'
      }
    }
    
    // 检查预约记录是否存在且属于当前用户
    let reservation
    try {
      const reservationDoc = await db.collection('reservations').doc(reservationId).get()
      if (!reservationDoc.data) {
        return {
          success: false,
          message: '预约记录不存在'
        }
      }
      
      reservation = reservationDoc.data
      
      // 验证预约是否属于当前用户
      const isOwner = reservation.userId === wxContext.OPENID
      const isOpenIdOwner = reservation._openid === wxContext.OPENID
      if (!isOwner && !isOpenIdOwner) {
        return {
          success: false,
          message: '无权取消此预约'
        }
      }
      
      // 检查预约状态是否可以取消
      if (reservation.status === 'cancelled') {
        return {
          success: false,
          message: '该预约已取消'
        }
      }
      
      if (reservation.status === 'completed') {
        return {
          success: false,
          message: '已完成的预约无法取消'
        }
      }
      
    } catch (error) {
      console.error('查询预约记录失败:', error)
      return {
        success: false,
        message: '查询预约记录失败：' + error.message
      }
    }
    
    // 更新预约状态
    try {
      const now = new Date()
      await db.collection('reservations').doc(reservationId).update({
        data: {
          status: 'cancelled',
          updateTime: db.serverDate(),
          statusHistory: _.push([{ action: 'cancel', fromStatus: reservation.status, toStatus: 'cancelled', operator: 'user', timestamp: db.serverDate() }])
        }
      })

      let creditDelta = -8
      let reason = 'cancelReservation'

      const createTime = reservation.createTime ? new Date(reservation.createTime) : null
      const paymentDeadline = reservation.paymentDeadline ? new Date(reservation.paymentDeadline) : null
      const isUnpaid = reservation.paymentStatus !== 'paid'
      const isPending = reservation.status === 'pending'

      if (isUnpaid && isPending && createTime && paymentDeadline) {
        const timeSinceCreate = now.getTime() - createTime.getTime()
        const paymentWindow = paymentDeadline.getTime() - createTime.getTime()
        if (timeSinceCreate <= paymentWindow) {
          creditDelta = 0
          reason = 'cancelReservationEarly'
        }
      }

      if (creditDelta !== 0) {
        await adjustUserCredit({
          userId: reservation.userId,
          delta: creditDelta,
          reason,
          now
        })
      }
    } catch (error) {
      console.error('更新预约状态失败:', error)
      return {
        success: false,
        message: '更新预约状态失败：' + error.message
      }
    }
    
    // 更新洗衣机状态为可用（如果失败，记录错误但不影响取消操作）
    const targetMachineId = machineId || reservation.machineId
    if (targetMachineId) {
      try {
        await db.collection('machines').doc(targetMachineId).update({
          data: {
            status: 'available',
            updateTime: db.serverDate()
          }
        })
      } catch (error) {
        console.error('更新洗衣机状态失败:', error)
        // 记录错误但不影响取消操作，可以后续手动修复
      }
    }
    
    return {
      success: true,
      message: '取消预约成功'
    }
    
  } catch (error) {
    console.error('取消预约失败:', error)
    return {
      success: false,
      message: '取消预约失败: ' + (error.message || '未知错误')
    }
  }
}