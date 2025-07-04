import { format, previousSunday, addDays } from 'date-fns'

export function setTime(date: Date, time: string) {
  const [hours, minutes] = time.split(':')
  date = new Date(date)
  date.setHours(parseInt(hours))
  date.setMinutes(parseInt(minutes))
  date.setSeconds(0)
  return date
}

export function getTime(date: Date) {
  return format(date, 'HH:mm:ss')
}

export const getCurrentMonth = () => {
  const d = new Date()
  return new CalMonth(parseInt(format(d, 'u')), parseInt(format(d, 'M')))
}
export const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

export const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export interface ICalMonth {
  year: number
  month: number
  getNext(): ICalMonth
  getPrev(): ICalMonth
}

export interface ICalDate {
  year: number
  month: number
  date: number
}

export class CalDate implements ICalDate {
  year: number
  month: number
  date: number
  constructor(year: number, month: number, date: number) {
    this.year = year
    this.month = month
    this.date = date
  }
}

export function datesMatch(a: ICalDate | null, b: ICalDate | null) {
  if (a !== null && b !== null) {
    return a.year === b.year && a.month === b.month && a.date === b.date
  }
  return false
}

export class CalMonth implements ICalMonth {
  year: number
  month: number

  constructor(year: number, month: number) {
    this.year = year
    this.month = month
  }

  public getFirstDay() {
    return new CalDate(this.year, this.month - 1, 1)
  }

  public getNext() {
    if (this.month === 12) {
      return new CalMonth(this.year + 1, 1)
    } else {
      return new CalMonth(this.year, this.month + 1)
    }
  }

  public getPrev() {
    if (this.month === 1) {
      return new CalMonth(this.year - 1, 12)
    } else {
      return new CalMonth(this.year, this.month - 1)
    }
  }
}

export function getDaysInMonth(month: ICalMonth) {
  const calendarDays: ICalDate[][] = []

  // date of sunday of first week of month, may be in previous month
  const date = new Date(month.year, month.month - 1, 1)
  const firstDay = previousSunday(
    new Date(date.getFullYear(), date.getMonth(), 1)
  )

  let currentDay = firstDay
  let j = 0
  while (currentDay.getMonth() === date.getMonth() || j < 7) {
    const currentWeek = []
    for (let i = 0; i < 7; i++) {
      currentWeek.push({
        year: currentDay.getFullYear(),
        month: currentDay.getMonth() + 1,
        date: currentDay.getDate()
      })
      currentDay = addDays(currentDay, 1)
      j++
    }
    calendarDays.push(currentWeek)
  }
  return calendarDays
}
