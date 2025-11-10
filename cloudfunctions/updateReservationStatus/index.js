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
        creditScore: currentScore,
        creditHistory: [],
        createdAt: now,
        updatedAt: now
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
    const { reservationId, action, operatorRole = 'user' } = event

    if (!reservationId || !action) {
      return {
        success: false,
        message: '缺少必要參數'
      }
    }

    const reservationDoc = await db.collection('reservations').doc(reservationId).get()
    if (!reservationDoc.data) {
      return {
        success: false,
        message: '預約記錄不存在'
      }
    }

    const reservation = reservationDoc.data
    const isOwner = reservation.userId === wxContext.OPENID
    const isOpenIdOwner = reservation._openid === wxContext.OPENID
    const isAdmin = operatorRole === 'admin'

    if (!isOwner && !isAdmin && !isOpenIdOwner) {
      return {
        success: false,
        message: '無權操作此預約'
      }
    }

    const now = db.serverDate()
    const nowDate = new Date()
    const historyEntry = {
      action,
      fromStatus: reservation.status,
      fromPaymentStatus: reservation.paymentStatus,
      operator: isAdmin ? 'admin' : 'user',
      timestamp: now
    }

    let updateData = {
      updateTime: now
    }
    let machineUpdate = null
    let creditChange = 0
    let creditReason = ''

    if (action === 'simulatePay') {
      if (reservation.paymentStatus === 'paid') {
        return {
          success: true,
          message: '已付款，無需重覆操作'
        }
      }

      updateData.paymentStatus = 'paid'
      updateData.paymentTime = now
      if (reservation.status === 'pending' || reservation.status === 'expired') {
        updateData.status = 'confirmed'
      }
    } else if (action === 'start') {
      if (reservation.paymentStatus !== 'paid') {
        return {
          success: false,
          message: '請先完成付款'
        }
      }

      if (reservation.status === 'working') {
        return {
          success: true,
          message: '洗衣已在進行中'
        }
      }

      updateData.status = 'working'
      const duration = reservation.duration || 60
      const actualEndServerDate = db.serverDate({
        offset: duration * 60 * 1000
      })
      updateData.workStartTime = now
      updateData.actualEndTime = actualEndServerDate
      updateData.endTime = actualEndServerDate
      machineUpdate = {
        status: 'working',
        updateTime: now
      }
    } else if (action === 'complete' || action === 'adminComplete') {
      if (reservation.status === 'completed') {
        return {
          success: true,
          message: '預約已完成'
        }
      }

      updateData.status = 'completed'
      updateData.completeTime = now

      if (reservation.paymentStatus !== 'paid') {
        updateData.paymentStatus = 'paid'
        updateData.paymentTime = now
      }

      machineUpdate = {
        status: 'available',
        updateTime: now
      }

      creditChange = 5
      creditReason = action === 'adminComplete' ? 'adminCompleteReservation' : 'completeReservation'
    } else {
      return {
        success: false,
        message: `不支援的操作：${action}`
      }
    }

    historyEntry.toStatus = updateData.status || reservation.status
    historyEntry.toPaymentStatus = updateData.paymentStatus || reservation.paymentStatus

    if (Array.isArray(reservation.statusHistory)) {
      updateData.statusHistory = _.push([historyEntry])
    } else {
      updateData.statusHistory = [historyEntry]
    }

    await db.collection('reservations').doc(reservationId).update({
      data: updateData
    })

    if (creditChange !== 0) {
      await adjustUserCredit({
        userId: reservation.userId,
        delta: creditChange,
        reason: creditReason,
        now
      })
    }

    if (machineUpdate && reservation.machineId) {
      try {
        await db.collection('machines').doc(reservation.machineId).update({
          data: machineUpdate
        })
      } catch (machineError) {
        console.error('更新洗衣機狀態失敗:', machineError)
      }
    }

    return {
      success: true,
      message: '操作成功',
      newStatus: updateData.status || reservation.status,
      paymentStatus: updateData.paymentStatus || reservation.paymentStatus
    }
  } catch (error) {
    console.error('更新預約狀態失敗:', error)
    return {
      success: false,
      message: '更新預約狀態失敗: ' + (error.message || '未知錯誤')
    }
  }
}

