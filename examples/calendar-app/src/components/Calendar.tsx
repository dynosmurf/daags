import {
  IEvent,
  activeCalendar,
  currentMonthEvents,
  activeMonth,
  activeDate,
  setActiveMonth,
  setActiveDate,
  setEditingActiveEvent,
  setActiveEventId
} from '../entities'
import {
  ICalDate,
  monthNames,
  getDaysInMonth,
  datesMatch,
  CalMonth
} from '../dates'
import { useEntity, useMutation } from '@daags/hooks'
import { memo } from 'react'

function formatCount(date: ICalDate, events: IEvent[]) {
  const count = events.filter(
    (e) =>
      e.date.getFullYear() === date.year &&
      e.date.getMonth() + 1 === date.month &&
      e.date.getDate() === date.date
  ).length
  return count > 0 ? `(${count})` : ''
}

export const Calendar = memo(() => {
  const activeMonthVal = useEntity(activeMonth)
  const setActiveMonthFn = useMutation(setActiveMonth)
  const activeDateVal = useEntity(activeDate)
  const setActiveDateFn = useMutation(setActiveDate)
  const setEditingActiveEventFn = useMutation(setEditingActiveEvent)
  const setActiveEventIdFn = useMutation(setActiveEventId)

  const activeCalendarVal = useEntity(activeCalendar)
  const events = useEntity(currentMonthEvents)

  if (activeMonthVal === null) {
    return <>Must specify month to display.</>
  }
  if (activeCalendarVal === null) {
    return <>No matching calander found.</>
  }
  const eventList = events || []
  const daysInMonth = getDaysInMonth(activeMonthVal)

  return (
    <div className="flex flex-col">
      <h1 className="text-3xl text-center w-full">{activeCalendarVal.name}</h1>
      <h2 className="text-2xl text-center w-full">
        {monthNames[activeMonthVal.month - 1]} {activeMonthVal.year}
      </h2>

      <div className="w-full">
        {daysInMonth.map((week, i) => {
          return (
            <div key={i} className="grid grid-cols-7 w-full">
              {week.map((day, j) => {
                const isActive = activeDateVal && datesMatch(day, activeDateVal)
                const isPadding = day.month !== activeMonthVal?.month
                return (
                  <div
                    key={j}
                    onClick={() => {
                      setActiveDateFn(day)
                      setActiveEventIdFn(null)
                      setEditingActiveEventFn(false)
                      if (isPadding) {
                        setActiveMonthFn(new CalMonth(day.year, day.month))
                      }
                    }}
                    className="p-2"
                  >
                    <div
                      className={`border-solid border rounded-md border-indigo-600 h-24 p-4 grid place-content-center ${
                        isActive ? 'bg-[#e5e7eb]' : ''
                      } ${isPadding ? 'bg-[#ccc]' : ''}`}
                    >
                      <div className="font-mono">
                        {day.date} {formatCount(day, eventList)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="flex">
        <button
          className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => {
            setActiveMonthFn(activeMonthVal!.getPrev())
            setActiveDateFn(null)
          }}
        >
          Previous
        </button>
        <button
          className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => {
            setActiveMonthFn(activeMonthVal!.getNext())
            setActiveDateFn(null)
          }}
        >
          Next
        </button>
      </div>
    </div>
  )
})
