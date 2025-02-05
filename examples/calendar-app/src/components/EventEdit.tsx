import { useState } from 'react'
import { getTime, setTime } from '../dates'
import { useCallback } from 'react'
import {
  IEvent,
  activeEvent,
  activeEventId,
  setEditingActiveEvent,
  createEventMutation,
  updateEventMutation,
  setActiveEventId,
  getDefaultEvent,
  eventAPI,
} from '../entities'
import { useEntity, useMutation } from '@daags/hooks'
import { Spinner } from './ui/Spinner'


export function EventEdit() {

  let event = useEntity(activeEvent)
  let activeEventIdVal = useEntity(activeEventId)
  let isNew = activeEventIdVal === null
  let setEditingActiveEventFn = useMutation(setEditingActiveEvent)
  let createEvent = useMutation(createEventMutation)
  let updateEvent = useMutation(updateEventMutation)
  let setActiveEventIdFn = useMutation(setActiveEventId)
  let eventAPIVal = useEntity(eventAPI)

  let isRequestPending = Object.values(eventAPIVal?.updateRequests || {}).map((request) => {
    return event && request.id === event.id && request.status === "pending"
  }).some((e) => e) || Object.values(eventAPIVal?.createRequests || {}).map((request) => {
    return request.status === "pending"
  }).some((e) => e);


  let handleUnfocus = useCallback(() => {
    setEditingActiveEventFn(false)
  }, [setEditingActiveEvent])

  let [localEvent, setLocalEvent] = useState<IEvent>(event ?? getDefaultEvent())

  let handleSave = useCallback(() => {
    if (isNew) {
      createEvent(localEvent).then((newEvent: IEvent) => {
        setActiveEventIdFn(null)
        setLocalEvent(newEvent)
        setEditingActiveEventFn(false)
      })
    } else {
      updateEvent(localEvent).then(() => {
        setEditingActiveEventFn(false)
      })
    }
  }, [isNew, localEvent])

  return (
    <>
      <div className="flex items-start justify-between p-4 border-b rounded-t dark:border-gray-600">
        {isNew &&
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Create Event
        </h3>
        }
        {!isNew &&
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Edit Event
        </h3>
        }
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
      <div>
        <div className="flex flex-col justify-between items-center p-4">
          <input
            type="text"
            className="border rounded-sm m-2 w-full p-2"
            placeholder="Title"
            value={localEvent.title}
            onChange={(e) =>
              setLocalEvent({ ...localEvent, title: e.target.value })
            }
          />
          <div className="flex flex-col justify-between items-center">
            <div className="text-lg font-bold">
              <label className="font-normal">Start Time</label>
              <input
                type="time"
                value={getTime(localEvent.startTime)}
                onChange={(e) =>
                  setLocalEvent({
                    ...localEvent,
                    startTime: setTime(localEvent.date, e.target.value)
                  })
                }
              />
            </div>
            <div className="text-lg font-bold">
              <label className="font-normal">End Time</label>
              <input
                type="time"
                value={getTime(localEvent.endTime)}
                onChange={(e) =>
                  setLocalEvent({
                    ...localEvent,
                    endTime: setTime(localEvent.date, e.target.value)
                  })
                }
              />
            </div>
          </div>
          <textarea
            placeholder="Description"
            className="border rounded-sm m-2 w-full p-2"
            value={localEvent.description}
            onChange={(e) =>
              setLocalEvent({ ...localEvent, description: e.target.value })
            }
          />
        </div>
        <div className="p-4 border-t rounded-b dark:border-gray-600">
          <button
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={handleSave}
          >
            Save
            {isRequestPending && 
                <Spinner />
            }
          </button>
        </div>
      </div>
    </>
  )
}
