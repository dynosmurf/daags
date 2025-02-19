import { Entity, Mutation, EntityDeps } from '@daags/core'
import { ICalDate, ICalMonth, CalMonth } from './dates'

/**
Create a modified push state method that triggers window events so we can update
state in response to url modifications
*/
const oldPushState = history.pushState
const myPushState = function (...args: any) {
  oldPushState.apply(history, args)
  const event = new Event('pushState', args)
  window.dispatchEvent(event)
}

export interface IEvent {
  id: number
  title: string
  date: Date
  startTime: Date
  endTime: Date
  description: string
}

export const getDefaultEvent = () => {
  return {
    id: 0,
    title: '',
    description: '',
    date: new Date(),
    startTime: new Date(),
    endTime: new Date()
  }
}

export interface ICalendar {
  id: number
  name: string
  color: string
  desc: string
}

/* urlState */

const urlState = new Entity('urlState' as const, [], () => window.location.href)

window.addEventListener('pushState', function () {
  // make sure whenever we navigate all children are notified of this change
  urlState.handleParentChange()
})

/* calendarId */

const getCalendarIdFromUrl = (url: string) => {
  const parsedUrl = new URL(url)
  return parseInt(parsedUrl.pathname.split('/')[2], 10)
}

const navigateToCalendarId = (currentUrl: string, calendarId: number) => {
  const url = new URL(currentUrl)
  const params = new URLSearchParams(url.search)
  myPushState({}, '', `/calendar/${calendarId}?${params.toString()}`)
}

const calendarId = new Entity(
  'calendarId' as const,
  [urlState],
  (deps: EntityDeps) => getCalendarIdFromUrl(deps[0].getState())
)

export const setCalendarId = new Mutation(
  'setCalendarId' as const,
  [urlState],
  (deps, calendarId: number) =>
    navigateToCalendarId(deps.urlState.getState() || '', calendarId)
)

export const clearCalendarId = new Mutation(
  'clearCalendarId' as const,
  [urlState],
  (deps) => {
    const url = new URL(deps.urlState.getState() || '')
    const params = new URLSearchParams(url.search)
    myPushState({}, '', `/calendar?${params.toString()}`)
  }
)

/* auth */

export const auth = new Entity('auth' as const, [], () => {
  return true
})

/* calendarAPI */

const calendarAPI = new Entity('calendarApi' as const, [], () => {})

/* calendars */

async function getCalendars() {
  // mock api call

  const request_promise = fetch('/api/calendars').then(async (response) => {
    const result = await response.json()
    return result
  })

  const calendars = await request_promise

  return calendars
}

export const calendars = new Entity(
  'calendars' as const,
  [calendarAPI, auth],
  getCalendars
)

/* eventAPI */

// TODO: this whole bit needs rethink
const eventTitles = [
  'Date Night',
  'Football Game',
  'Design Review',
  'Sales meeting',
  'Movie Night'
]
const eventsDB: Map<number, IEvent> = new Map()
for (let i = 0; i < 5; i++) {
  eventsDB.set(i, {
    id: i,
    title: eventTitles[i],
    date: new Date(
      `${new Date().toISOString().split('T')[0]}T0${i}:00:00.000Z`
    ),
    startTime: new Date(
      `${new Date().toISOString().split('T')[0]}T0${i}:00:00.000Z`
    ),
    endTime: new Date(
      `${new Date().toISOString().split('T')[0]}T0${i + 1}:00:00.000Z`
    ),
    description: `This is event ${i}`
  })
}

interface IAPIRequest<T> {
  promise: Promise<T>
  timestamp: number
  status: 'pending' | 'success' | 'error'
  id?: number
}

type APIRequestDict<T> = {
  [key: string]: IAPIRequest<T>
}

const createRequests: APIRequestDict<any> = {}
const deleteRequests: APIRequestDict<any> = {}
const updateRequests: APIRequestDict<any> = {}

function getUUID() {
  return Math.random().toString(36).substring(7)
}

const createEvent = async (calendarId: number, newEvent: IEvent) => {
  // mock request promise
  const requestId = getUUID()

  const requestPromise = fetch(`/api/calendars/${calendarId}/events`, {
    method: 'POST',
    body: JSON.stringify(newEvent)
  })
  createRequests[requestId] = {
    promise: requestPromise,
    timestamp: Date.now(),
    status: 'pending'
  }

  await requestPromise
  createRequests[requestId] = {
    ...createRequests[requestId],
    status: 'success'
  }

  return requestPromise
}

const deleteEvent = async (calendarId: number, eventId: number) => {
  // mock request promise
  const requestId = getUUID()

  const requestPromise = fetch(
    `/api/calendars/${calendarId}/events/${eventId}`,
    { method: 'DELETE' }
  )

  deleteRequests[requestId] = {
    promise: requestPromise,
    timestamp: Date.now(),
    status: 'pending',
    id: eventId
  }
  await requestPromise
  deleteRequests[requestId] = {
    ...deleteRequests[requestId],
    status: 'success'
  }

  return requestPromise
}

const updateEvent = async (calendarId: number, modifiedEvent: IEvent) => {
  // mock request promise
  const requestId = getUUID()
  const requestPromise = fetch(`/api/calendars/${calendarId}/events`, {
    method: 'PUT',
    body: JSON.stringify(modifiedEvent)
  })

  updateRequests[requestId] = {
    promise: requestPromise,
    timestamp: Date.now(),
    status: 'pending',
    id: modifiedEvent.id
  }
  await requestPromise
  updateRequests[requestId] = {
    ...updateRequests[requestId],
    status: 'success'
  }

  return requestPromise
}

const getEventApiState = () => {
  return {
    createRequests: { ...createRequests },
    deleteRequests: { ...deleteRequests },
    updateRequests: { ...updateRequests }
  }
}

export const eventAPI = new Entity('eventAPI' as const, [], getEventApiState)

export const createEventMutation = new Mutation(
  'createEvent' as const,
  [eventAPI],
  (deps, calendarId: number, event: IEvent) => {
    const p = createEvent(calendarId, event).then((e) => {
      deps.eventAPI.handleParentChange()
      return e
    })
    deps.eventAPI.handleParentChange()
    return p
  }
)
export const updateEventMutation = new Mutation(
  'updateEvent' as const,
  [eventAPI],
  (deps, calendarId: number, event: IEvent) => {
    const p = updateEvent(calendarId, event).then(() => {
      deps.eventAPI.handleParentChange()
    })
    deps.eventAPI.handleParentChange()
    return p
  }
)
export const deleteEventMutation = new Mutation(
  'deleteEvent' as const,
  [eventAPI],
  (deps, calendarId: number, eventId: number) => {
    const p = deleteEvent(calendarId, eventId).then(() => {
      deps.eventAPI.handleParentChange()
    })
    deps.eventAPI.handleParentChange()
    return p
  }
)

/* activeCalendar */

const getActiveCalendar = ([calendarId, calendars]: EntityDeps) => {
  const calendars_list = calendars.getState()
  if (calendars_list === null) {
    return null
  }

  return calendars_list.find((calendar: ICalendar) => {
    return calendar.id === calendarId.getState()
  })
}

export const activeCalendar = new Entity(
  'activeCalendar' as const,
  [calendarId, calendars],
  getActiveCalendar
)

/* activeMonth */

const getActiveMonthFromUrlParam = (url: string): ICalMonth | null => {
  const parsedUrl = new URL(url)
  const params = new URLSearchParams(parsedUrl.search)
  const activeDateString = params.get('activeMonth')
  if (!activeDateString) {
    return null
  }
  try {
    return new CalMonth(
      parseInt(activeDateString.split('-')[0], 10),
      parseInt(activeDateString.split('-')[1], 10)
    )
  } catch (e) {
    return null
  }
}

const navigateToActiveMonth = (
  url: string,
  activeDate: ICalMonth | ICalDate | null
) => {
  const parsedUrl = new URL(url)
  const params = new URLSearchParams(parsedUrl.search)
  if (activeDate === null) {
    params.delete('activeMonth')
  } else {
    params.set('activeMonth', `${activeDate.year}-${activeDate.month}`)
  }
  myPushState({}, '', `${parsedUrl.pathname}?${params.toString()}`)
}

export const activeMonth = new Entity(
  'activeMonth' as const,
  [urlState],
  (deps) => {
    return getActiveMonthFromUrlParam(deps[0].getState())
  }
)

export const setActiveMonth = new Mutation(
  'setActiveMonth' as const,
  [urlState],
  (deps, activeDate: ICalMonth | ICalDate | null) => {
    navigateToActiveMonth(deps.urlState.getState() || '', activeDate)
  }
)

/* currentMonthEvents */

const getEvents = async (calendarId: number | null) => {
  // mock api call
  if (calendarId === null || !isFinite(calendarId)) {
    return null
  }

  const request_promise = fetch(`/api/calendar/${calendarId}/events`).then(
    async (response) => {
      const result = (await response.json()) as any[]
      const formattedResult = []
      for (const event of result) {
        formattedResult.push({
          ...event,
          date: new Date(event.date),
          startTime: new Date(event.startTime),
          endTime: new Date(event.endTime)
        })
      }
      return formattedResult as IEvent[]
    }
  )

  const events = await request_promise

  return events
}

export const currentMonthEvents = new Entity(
  'currentMonthEvents' as const,
  [calendarId, activeMonth, eventAPI, auth],
  (deps) => {
    return getEvents(deps[0].getState())
  }
)

/* activeDate */

function getSearchFromPath(url: string) {
  const urlObj = new URL(url)
  const search = urlObj.search

  return search
}

const getActiveDateFromUrlParam = (url: string): ICalDate | null => {
  const params = new URLSearchParams(getSearchFromPath(url))
  const activeDateString = params.get('activeDate')
  if (!activeDateString) {
    return null
  }
  try {
    return {
      year: parseInt(activeDateString.split('-')[0], 10),
      month: parseInt(activeDateString.split('-')[1], 10),
      date: parseInt(activeDateString.split('-')[2], 10)
    }
  } catch (e) {
    return null
  }
}

const navigateToActiveDate = (url: string, activeDate: ICalDate | null) => {
  const parsedUrl = new URL(url)
  const params = new URLSearchParams(parsedUrl.search)
  if (activeDate === null) {
    params.delete('activeDate')
  } else {
    params.set(
      'activeDate',
      `${activeDate.year}-${activeDate.month}-${activeDate.date}`
    )
  }
  myPushState({}, '', `${parsedUrl.pathname}?${params.toString()}`)
}

export const activeDate = new Entity(
  'activeDate' as const,
  [urlState],
  (deps) => {
    return getActiveDateFromUrlParam(deps[0].getState())
  }
)

export const setActiveDate = new Mutation(
  'setActiveDate' as const,
  [urlState],
  (deps, activeDate: ICalDate | null) => {
    navigateToActiveDate(deps.urlState.getState() || '', activeDate)
  }
)

/* activeDateEvents */

const getActiveDateEvents = (activeDate: ICalDate, events: IEvent[]) => {
  if (events === null || activeDate === null) {
    return null
  }
  const r =
    events.filter((event: IEvent) => {
      return (
        event.date.getFullYear() === activeDate.year &&
        event.date.getMonth() + 1 === activeDate.month &&
        event.date.getDate() === activeDate.date
      )
    }) || null
  return r
}

export const activeDateEvents = new Entity(
  'activeDateEvents' as const,
  [activeDate, currentMonthEvents],
  (deps) => {
    return getActiveDateEvents(deps[0].getState(), deps[1].getState())
  }
)

/* importantEvents */

export const importantEvents = new Entity(
  'importantEvents' as const,
  [calendarId, eventAPI],
  () => []
)

/* activeEventId */

const getActiveEventIdFromUrlParam = (url: string) => {
  const params = new URLSearchParams(new URL(url).search)
  const activeEventIdString = params.get('activeEventId')
  if (!activeEventIdString) {
    return null
  }
  return parseInt(activeEventIdString, 10)
}

const navigateToActiveEventId = (url: string, activeEventId: number | null) => {
  const params = new URLSearchParams(new URL(url).search)
  if (activeEventId === null) {
    params.delete('activeEventId')
  } else {
    params.set('activeEventId', '' + activeEventId)
  }
  myPushState({}, '', `${location.pathname}?${params.toString()}`)
}

export const activeEventId = new Entity('activeEventId', [urlState], (deps) => {
  return getActiveEventIdFromUrlParam(deps[0].getState() || '')
})

export const setActiveEventId = new Mutation(
  'setActiveEventId' as const,
  [urlState],
  (deps, activeEventId: number | null) => {
    navigateToActiveEventId(deps.urlState.getState() || '', activeEventId)
  }
)

/* activeEvent */

const getActiveEvent = (activeEventId: number, events: IEvent[]) => {
  if (!events) {
    return null
  }
  return (
    events.find((event: IEvent) => {
      return event.id === activeEventId
    }) || null
  )
}

export const activeEvent = new Entity(
  'activeEvent',
  [activeEventId, currentMonthEvents],
  (deps) => {
    return getActiveEvent(deps[0].getState(), deps[1].getState())
  }
)

/* editingActiveEvent */

let isEditingActiveEvent = false

export const editingActiveEvent = new Entity(
  'editingActiveEvent' as const,
  [],
  () => isEditingActiveEvent
)

export const setEditingActiveEvent = new Mutation(
  'setEditingActiveEvent' as const,
  [editingActiveEvent],
  (deps, val: boolean) => {
    isEditingActiveEvent = val
    deps.editingActiveEvent.handleParentChange()
  }
)
