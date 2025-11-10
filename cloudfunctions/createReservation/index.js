const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const db = cloud.database()
  const wxContext = cloud.getWXContext()
  
  try {
    const {
      machineId,
      machineName,
      machineLocation,
      machineType,
      reservationDate,
      reservationTime,
      duration = 60,
      pricePerHour,
      payDuration = 15, // 默认15分钟付款时间
      userId
    } = event
    
    console.log('📦 云函数接收数据:', event)
    
    // 验证必要参数
    if (!machineId || !machineName) {
      return {
        success: false,
        message: '缺少必要参数：machineId 或 machineName'
      }
    }

    // 处理时间格式
    let startTime = reservationTime
    let endTimeStr = null
    if (reservationTime.includes('-')) {
      const parts = reservationTime.split('-')
      startTime = parts[0]
      endTimeStr = parts[1]
    }

    // 验证时间格式
    const timePattern = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
    if (!timePattern.test(startTime)) {
      return {
        success: false,
        message: `时间格式错误：${startTime}，应为 HH:mm 格式`
      }
    }

    // 创建预约时间对象
    const reservationDateTime = new Date(`${reservationDate} ${startTime}`)
    const now = new Date()

    // 检查预约时间是否在过去（允许1分钟误差）
    if (reservationDateTime.getTime() < now.getTime() - 60000) {
      return {
        success: false,
        message: '预约时间不能是过去的时间'
      }
    }


    // 根据 duration 计算使用结束时间
    const usageEndTime = new Date(reservationDateTime.getTime() + duration * 60000)
    
    // 根据 payDuration 计算付款截止时间（从当前时间开始计算）
    const paymentDeadline = new Date(now.getTime() + payDuration * 60000)

    console.log('⏰ 时间计算:', {
      预约时间: reservationDateTime.toString(),
      使用结束时间: usageEndTime.toString(),
      付款截止时间: paymentDeadline.toString(),
      洗衣时长: duration + '分钟',
      付款时长: payDuration + '分钟'
    })

    // 检查时间冲突
    const conflictCheck = await db.collection('reservations')
      .where({
        machineId: machineId,
        status: 'pending',
        reservationDate: reservationDate,
        reservationTime: startTime
      })
      .get()

    if (conflictCheck.data.length > 0) {
      return {
        success: false,
        message: '该时段已被预约，请选择其他时间'
      }
    }

    // 计算总价
    const usageRatio = duration / 60
    const rawPrice = parseFloat((pricePerHour * usageRatio).toFixed(2))
    const totalPrice = parseFloat((usageRatio >= 1 ? rawPrice : Math.max(pricePerHour, rawPrice)).toFixed(2))

    // 创建预约记录
    const endHourText = String(usageEndTime.getHours()).padStart(2, '0')
    const endMinuteText = String(usageEndTime.getMinutes()).padStart(2, '0')
    const computedTimeRange = `${startTime}-${endHourText}:${endMinuteText}`

    const reservationData = {
      userId: userId || wxContext.OPENID,
      machineId: machineId,
      machineName: machineName,
      machineLocation: machineLocation,
      machineType: machineType,
      reservationDate: reservationDate,
      reservationTime: startTime,
      timeRange: endTimeStr ? `${startTime}-${endTimeStr}` : computedTimeRange,
      reservationTimeRange: endTimeStr ? `${startTime}-${endTimeStr}` : computedTimeRange,
      reservationDateTime: reservationDateTime,
      endTime: usageEndTime, // 使用结束时间
      paymentDeadline: paymentDeadline, // 付款截止时间
      duration: duration,
      payDuration: payDuration, // 付款时长
      status: 'pending',
      pricePerHour: pricePerHour,
      totalPrice: totalPrice,
      paymentStatus: 'unpaid',
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      statusHistory: [
        {
          action: 'create',
          toStatus: 'pending',
          toPaymentStatus: 'unpaid',
          operator: 'system',
          timestamp: new Date().toISOString()
        }
      ],
      latestDisplayTime: `${reservationDate} ${endTimeStr ? `${startTime}-${endTimeStr}` : computedTimeRange}`
    }

    console.log('📝 最终预约数据:', reservationData)

    // 插入预约记录
    const result = await db.collection('reservations').add({
      data: reservationData
    })

    console.log('✅ 数据库插入成功，ID:', result._id)

    // 更新洗衣机状态为已预约
    try {
      await db.collection('machines').doc(machineId).update({
        data: {
          status: 'reserved',
          updateTime: new Date().toISOString()
        }
      })
      console.log('🔄 洗衣机状态更新成功')
    } catch (updateError) {
      console.error('⚠️ 更新洗衣机状态失败:', updateError)
      // 不抛出错误，因为预约已经创建成功
    }

    return {
      success: true,
      reservationId: result._id,
      message: '预约成功，请在15分钟内完成付款',
      paymentDeadline: paymentDeadline.toISOString() // 返回付款截止时间给前端
    }
    
  } catch (error) {
    console.error('❌ 创建预约失败:', error)
    return {
      success: false,
      message: `预约失败: ${error.message}`
    }
  }
}