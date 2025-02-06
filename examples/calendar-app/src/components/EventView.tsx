import { useCallback } from 'react'
import {
  activeEvent,
  setActiveEventId,
  setEditingActiveEvent
} from '../entities'
import { useEntity, useMutation } from '@daags/hooks'

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
          {event.title}
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

      <div className="flex flex-col">
        <div className="flex flex-row justify-between items-center">
          <div className="text-lg font-bold">
            {event.startTime.toDateString()}
          </div>
          <div className="text-lg font-bold">
            {event.endTime.toDateString()}
          </div>
        </div>
      </div>
      <div className="flex flex-row justify-between items-center">
        <div className="text-lg font-bold">{event.description}</div>
      </div>
      <div>
        <button onClick={handleEdit}>Edit</button>
      </div>
    </>
  )
}
