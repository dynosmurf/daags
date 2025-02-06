import { getTime } from '../dates'
import {
  activeDate,
  activeDateEvents,
  setActiveEventId,
  setActiveDate,
  deleteEventMutation,
  setEditingActiveEvent,
  eventAPI
} from '../entities'
import { useEntity, useMutation } from '@daags/hooks'
import { Spinner } from './ui/Spinner'
import { useCallback } from 'react'

export function DayView() {
  let activeDateVal = useEntity(activeDate)
  let setActiveDateFn = useMutation(setActiveDate)
  let events = useEntity(activeDateEvents) || []
  let setActiveEventIdFn = useMutation(setActiveEventId)
  let eventAPIVal = useEntity(eventAPI)

  let deleteEventFn = useMutation(deleteEventMutation)
  let setEditingActiveEventFn = useMutation(setEditingActiveEvent)

  if (activeDateVal == null) {
    return null
  }

  let isDeletePending = useCallback(
    (id: number) => {
      return Object.values(eventAPIVal?.deleteRequests || {})
        .map((request) => {
          return request.id === id && request.status === 'pending'
        })
        .some((e) => e)
    },
    [eventAPIVal]
  )

  return (
    <>
      <div className="flex items-start justify-between p-4 border-b rounded-t dark:border-gray-600">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          {activeDateVal.year}-{activeDateVal.month}-{activeDateVal.date}
        </h3>
        <button
          type="button"
          className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
          data-modal-hide="default-modal"
          onClick={() => setActiveDateFn(null)}
        >
          <svg
            className="w-3 h-3"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 14 14"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
              d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
            />
          </svg>
          <span className="sr-only">Close modal</span>
        </button>
      </div>

      <div className="p-6 space-y-6">
        {events.length === 0 && <div>No events</div>}
        {events.map((event, i) => {
          return (
            <div
              key={event.id}
              className="flex flex-row justify-between items-center"
            >
              <div onClick={() => setActiveEventIdFn(event.id)}>
                <div className="text-lg font-bold">{event.title}</div>
                <div className="text-lg font-bold">
                  {getTime(event.startTime)}
                </div>
                <div className="text-lg font-bold">
                  {getTime(event.endTime)}
                </div>
              </div>
              <div>
                <button onClick={() => deleteEventFn(event.id)}>x</button>
              </div>
              {isDeletePending(event.id) && <Spinner />}
            </div>
          )
        })}
      </div>

      <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b dark:border-gray-600">
        <button
          data-modal-hide="default-modal"
          type="button"
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
          onClick={() => {
            setEditingActiveEventFn(true)
          }}
        >
          Add Event
        </button>
      </div>
    </>
  )
}
