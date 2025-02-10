import { useCallback } from 'react'
import {
  activeEvent,
  setActiveEventId,
  setEditingActiveEvent
} from '../entities'
import { useEntity, useMutation } from '@daags/hooks'
import { format } from 'date-fns'

export function EventView() {
  const event = useEntity(activeEvent)
  const setActiveEventIdFn = useMutation(setActiveEventId)
  const setEditingActiveEventFn = useMutation(setEditingActiveEvent)

  const handleUnfocus = useCallback(() => {
    setActiveEventIdFn(null)
  }, [setActiveEventId])

  const handleEdit = useCallback(() => {
    setEditingActiveEventFn(true)
  }, [setEditingActiveEvent])

  if (event === null) {
    return null
  }

  return (
    <>
      <div className="flex items-start justify-between p-4 border-b rounded-t dark:border-gray-600">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Event Details
        </h3>
        <button
          type="button"
          className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
          data-modal-hide="default-modal"
          onClick={handleUnfocus}
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

      <div className="px-4 py-2">
        <div className="my-2">
          <h3 className="text-lg font-bold">{event.title}</h3>
        </div>
        <div className="my-2">
          <div>
            <span className="font-thin">On:</span>{' '}
            {format(event.date, 'MMMM do, u')}
          </div>
          <div className="">
            <span className="font-thin">From:</span>{' '}
            {format(event.startTime, 'h:mm a')}
          </div>
          <div className="">
            <span className="font-thin">To:</span>{' '}
            {format(event.endTime, 'h:mm a')}
          </div>
        </div>
        <div className="my-2">
          <div>
            <span className="font-thin">Notes:</span> {event.description}
          </div>
        </div>
      </div>
      <div className="my-2 flex items-center py-2 space-x-2 border-t border-gray-200 rounded-b dark:border-gray-600 justify-end">
        <button
          data-modal-hide="default-modal"
          type="button"
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
          onClick={handleEdit}
        >
          Edit Event
        </button>
      </div>
    </>
  )
}
