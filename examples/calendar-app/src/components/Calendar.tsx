import {
  activeCalendar,
  currentMonthEvents,
  activeMonth,
  activeDate,
  setActiveMonth,
  setActiveDate,
  setEditingActiveEvent,
  setActiveEventId,
  clearCalendarId
} from '../entities'
import {
  monthNames,
  dayNames,
  getDaysInMonth,
  datesMatch,
  CalMonth,
  getCurrentMonth
} from '../dates'
import { useEntity, useMutation } from '@daags/hooks'
import { memo } from 'react'
import { format } from 'date-fns'

export const Calendar = memo(() => {
  const activeMonthVal = useEntity(activeMonth) || getCurrentMonth()
  const setActiveMonthFn = useMutation(setActiveMonth)
  const activeDateVal = useEntity(activeDate)
  const setActiveDateFn = useMutation(setActiveDate)
  const setEditingActiveEventFn = useMutation(setEditingActiveEvent)
  const setActiveEventIdFn = useMutation(setActiveEventId)
  const clearActiveCalendar = useMutation(clearCalendarId)

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
      <div className="py-2 px-4">
        <div className="flex">
          <h1
            className="text-3xl text-left w-full cursor-pointer"
            onClick={clearActiveCalendar}
          >
            {activeCalendarVal.name}
          </h1>
        </div>
        <div className="flex">
          <div className="w-1/2 content-center">
            <h2 className="text-xl text-left w-full">
              {monthNames[activeMonthVal.month - 1]} {activeMonthVal.year}
            </h2>
          </div>
          <div className="w-1/2 flex content-center justify-end">
            <div className="self-center">
              <button
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                onClick={() => {
                  setActiveMonthFn(activeMonthVal!.getPrev())
                  setActiveDateFn(null)
                }}
              >
                Previous
              </button>
            </div>
            <div className="pl-2">
              <button
                className=" rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                onClick={() => {
                  setActiveMonthFn(activeMonthVal!.getNext())
                  setActiveDateFn(null)
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="w-full rounded-lg border border-gray-200 overflow-hidden bg-gray-200">
          <div className="grid grid-cols-7 w-full gap-[1px]">
            {dayNames.map((day) => {
              return <div className="py-1 text-center bg-white">{day}</div>
            })}
            {daysInMonth.map((week, i) => {
              return week.map((day, j) => {
                const isActive = activeDateVal && datesMatch(day, activeDateVal)
                const isPadding = day.month !== activeMonthVal?.month
                let bgColor = 'bg-white'
                bgColor = isPadding ? 'bg-[#f8f8f8]' : bgColor
                const textColor = isPadding ? 'text-gray-400' : ''

                const currentDayEvents = eventList.filter(
                  (event) => format(event.date, 'd') === `${day.date}`
                )
                const displayEvents = currentDayEvents.slice(0, 4)
                const moreCount = currentDayEvents.length - displayEvents.length
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
                    className=""
                  >
                    <div
                      className={`px-3 py-2 h-32 cursor-pointer hover:bg-blue-500 hover:text-white transition  ${bgColor} ${textColor}`}
                    >
                      <div className="pb-1.5">
                        <div
                          className={
                            isActive
                              ? 'aspect-square flex justify-center items-center w-7 bg-indigo-600 text-white rounded-full text-small'
                              : 'font-thin w-7 aspect-square'
                          }
                        >
                          {day.date}
                        </div>
                      </div>
                      <div className="text-xs">
                        {displayEvents.map((event, i) => {
                          return (
                            <div
                              className="flex"
                              key={`${i}-${event.title}-${format(
                                event.startTime,
                                'ha'
                              )}`}
                            >
                              <div className="truncate flex-grow">
                                {event.title}
                              </div>{' '}
                              <div className="font-thin">
                                {format(event.startTime, 'ha')}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {moreCount > 0 && (
                        <div className="text-xs text-center">
                          ... {moreCount} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            })}
          </div>
        </div>
      </div>
    </div>
  )
})
