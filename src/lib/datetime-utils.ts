/**
 * DateTime Utilities
 * Xử lý chuyển đổi datetime giữa client và API
 */

/**
 * Chuyển đổi datetime-local input thành ISO string cho API
 * @param dateTimeLocal - Giá trị từ input datetime-local
 * @returns ISO string với timezone hoặc empty string
 */
export const formatDateTimeForAPI = (dateTimeLocal: string): string => {
  if (!dateTimeLocal) return ''
  
  try {
    // Tạo Date object từ datetime-local input
    // datetime-local format: YYYY-MM-DDTHH:mm
    const date = new Date(dateTimeLocal)
    
    // Kiểm tra date hợp lệ
    if (isNaN(date.getTime())) {
      console.error('Invalid datetime:', dateTimeLocal)
      return ''
    }
    
    // Trả về ISO string với timezone (format: YYYY-MM-DDTHH:mm:ss.sssZ)
    const isoString = date.toISOString()
    
    // Log để debug
    if (process.env.NODE_ENV === 'development') {
      console.log(`🕐 [DATETIME] formatDateTimeForAPI:`, {
        input: dateTimeLocal,
        output: isoString,
        isValid: !isNaN(date.getTime())
      })
    }
    
    return isoString
  } catch (error) {
    console.error('Error formatting datetime for API:', error)
    return ''
  }
}

/**
 * Chuyển đổi ISO string từ API thành datetime-local format
 * @param isoString - ISO string từ API
 * @returns Format cho datetime-local input
 */
export const formatDateTimeForInput = (isoString: string): string => {
  if (!isoString) return ''
  
  try {
    const date = new Date(isoString)
    
    if (isNaN(date.getTime())) {
      console.error('Invalid ISO string:', isoString)
      return ''
    }
    
    // Format cho datetime-local input (YYYY-MM-DDTHH:mm)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    return `${year}-${month}-${day}T${hours}:${minutes}`
  } catch (error) {
    console.error('Error formatting datetime for input:', error)
    return ''
  }
}

/**
 * Lấy thời gian Việt Nam hiện tại
 * @returns Date object với timezone Việt Nam
 */
export const getVietnamTime = (date?: Date): Date => {
  const now = date || new Date()
  return new Date(now.toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}))
}

/**
 * Format thời gian hiển thị theo múi giờ Việt Nam
 * @param date - Date object hoặc ISO string
 * @returns Chuỗi thời gian định dạng Việt Nam
 */
export const formatDisplayTime = (date: Date | string): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) {
      return 'Thời gian không hợp lệ'
    }
    
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short'
    }).format(dateObj)
  } catch (error) {
    console.error('Error formatting display time:', error)
    return 'Lỗi hiển thị thời gian'
  }
}

/**
 * Validate datetime string
 * @param dateTimeString - Chuỗi datetime cần validate
 * @returns Boolean indicating if valid
 */
export const isValidDateTime = (dateTimeString: string): boolean => {
  if (!dateTimeString) return false
  
  try {
    const date = new Date(dateTimeString)
    return !isNaN(date.getTime())
  } catch {
    return false
  }
}

/**
 * So sánh hai datetime
 * @param date1 - Datetime thứ nhất
 * @param date2 - Datetime thứ hai  
 * @returns -1 nếu date1 < date2, 0 nếu bằng nhau, 1 nếu date1 > date2
 */
export const compareDateTimes = (date1: string | Date, date2: string | Date): number => {
  try {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2
    
    if (d1.getTime() < d2.getTime()) return -1
    if (d1.getTime() > d2.getTime()) return 1
    return 0
  } catch (error) {
    console.error('Error comparing datetimes:', error)
    return 0
  }
}

/**
 * Logging helper cho datetime operations
 * @param operation - Tên operation
 * @param input - Input data
 * @param output - Output data
 */
export const logDateTimeOperation = (
  operation: string, 
  input: any, 
  output: any
): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🕐 [DATETIME] ${operation}:`, {
      input,
      output,
      timestamp: new Date().toISOString()
    })
  }
}
