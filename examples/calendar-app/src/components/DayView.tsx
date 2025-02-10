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
import { format } from 'date-fns'

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
    >
      <path
        fill="currentColor"
        d="M 10 2 L 9 3 L 4 3 L 4 5 L 5 5 L 5 20 C 5 20.522222 5.1913289 21.05461 5.5683594 21.431641 C 5.9453899 21.808671 6.4777778 22 7 22 L 17 22 C 17.522222 22 18.05461 21.808671 18.431641 21.431641 C 18.808671 21.05461 19 20.522222 19 20 L 19 5 L 20 5 L 20 3 L 15 3 L 14 2 L 10 2 z M 7 5 L 17 5 L 17 20 L 7 20 L 7 5 z M 9 7 L 9 18 L 11 18 L 11 7 L 9 7 z M 13 7 L 13 18 L 15 18 L 15 7 L 13 7 z"
      ></path>
    </svg>
  )
}

export function DayView() {
  const activeDateVal = useEntity(activeDate)
  const setActiveDateFn = useMutation(setActiveDate)
  const events = useEntity(activeDateEvents) || []
  const setActiveEventIdFn = useMutation(setActiveEventId)
  const eventAPIVal = useEntity(eventAPI)

  const deleteEventFn = useMutation(deleteEventMutation)
  const setEditingActiveEventFn = useMutation(setEditingActiveEvent)

  if (activeDateVal === null) {
    return null
  }

  const isDeletePending = useCallback(
    (id: number) => {
      return Object.values(eventAPIVal?.deleteRequests || {})
        .map((request) => {
          return request.id === id && request.status === 'pending'
        })
        .some((e) => e)
    },
    [eventAPIVal]
  )

  const activeDateObj = new Date(
    `${activeDateVal.year}-${activeDateVal.month}-${activeDateVal.date}`
  )
  return (
    <>
      <div className="flex items-start justify-between p-4 border-b rounded-t dark:border-gray-600">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          {format(activeDateObj, 'MMMM do, u')}
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

      <div className="py-4">
        {events.length === 0 && <div>No events</div>}
        {events.map((event) => {
          return (
            <div
              key={event.id}
              className="flex flex-row justify-between items-center py-1 border-radius-1"
            >
              <div
                onClick={() => setActiveEventIdFn(event.id)}
                className="hover:bg-blue-500 hover:text-white transition flex-1 px-2 py-1 rounded overflow-hidden cursor-pointer"
              >
                <div className="font-bold">{event.title}</div>
                <div className="font-thin">
                  {format(event.startTime, 'h:mm a')} -{' '}
                  {format(event.endTime, 'h:mm a')}
                </div>
              </div>
              {!isDeletePending(event.id) && (
                <div
                  onClick={() => deleteEventFn(event.id)}
                  className="flex px-2 aspect-square self-stretch hover:bg-blue-500 hover:text-white transition rounded cursor-pointer"
                >
                  <button>
                    <TrashIcon />
                  </button>
                </div>
              )}
              {isDeletePending(event.id) && (
                <div>
                  <Spinner />
                </div>
              )}
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
