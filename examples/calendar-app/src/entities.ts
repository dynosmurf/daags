import { Entity, Mutation, EntityDeps } from '@daags/core'
import { ICalDate, ICalMonth, CalMonth } from './dates';

/**
Create a modified push state method that triggers window events so we can update
state in response to url modifications
*/
var oldPushState = history.pushState;
let myPushState = function (...args: any) {
    oldPushState.apply(history, args);
    let event = new Event("pushState", args)
    window.dispatchEvent(event);
};

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

let urlState = new Entity("urlState" as const, [], () => window.location.href)

window.addEventListener('pushState', function (event) {
    // make sure whenever we navigate all children are notified of this change
    urlState.handleParentChange()
});

let setUrlState = new Mutation("setUrlState" as const, [], (deps, url: string) => myPushState({}, '', url))

/* calendarId */

let getCalendarIdFromUrl = (url: string) => { 
    let parsedUrl = new URL(url)
    return parseInt(parsedUrl.pathname.split('/')[2], 10) 
};

let navigateToCalendarId = (currentUrl: string, calendarId: number) => {
    let url = new URL(currentUrl)
    let params = new URLSearchParams(url.search)
    myPushState({}, '', `/calendar/${calendarId}?${params.toString()}`);
}

let calendarId = new Entity("calendarId" as const, [urlState], (deps: EntityDeps) => getCalendarIdFromUrl(deps[0].getState())); 

let setCalendarId = new Mutation(
    "setCalendarId" as const,
    [urlState], 
    (deps, calendarId: number) => navigateToCalendarId(deps.urlState.getState() || '', calendarId)
)

/* auth */

export const auth = new Entity("auth" as const, [], () => { return true });


/* calendarAPI */

let calendarAPI = new Entity("calendarApi" as const, [], () => {});


/* calendars */

let calendarDB: Map<number, ICalendar> = new Map()
for (let i = 0; i < 5; i++) {
    calendarDB.set(i, 
        {
            id: i,
            name: `Calendar ${i}`,
            color: '#000000',
            desc: `This is calendar ${i}`
        }
    )
}

async function getCalendars () { 
    // mock api call

    let request_promise = new Promise<ICalendar[]>((resolve, reject) => {
        setTimeout(() => {
            resolve([...calendarDB.values()])
        }, 600)
    })

    let calendars = await request_promise;

    return calendars;
};

export const calendars = new Entity("calendars" as const, [calendarAPI, auth], getCalendars); 


/* eventAPI */

// TODO: this whole bit needs rethink

let eventsDB: Map<number, IEvent> = new Map()
for (let i = 0; i < 5; i++) {
    eventsDB.set(i, {
        id: i,
        title: `Event ${i}`,
        date: new Date(`${(new Date()).toISOString().split('T')[0]}T00:00:00.000Z`),
        startTime: new Date(),
        endTime: new Date(),
        description: `This is event ${i}`
    })
}

interface IAPIRequest<T> {
    promise: Promise<T>,
    timestamp: number,
    status: 'pending' | 'success' | 'error'
    id?: number
}

type APIRequestDict<T> = {
    [key: string]: IAPIRequest<T>
}

let createRequests: APIRequestDict<any>  = {}
let deleteRequests: APIRequestDict<any> = {}
let updateRequests: APIRequestDict<any> = {}

function getUUID() {
    return Math.random().toString(36).substring(7);
}

const createEvent = (newEvent: IEvent) => {
    // mock request promise
    let requestId = getUUID(); 
    let request_promise = new Promise<IEvent>((resolve, reject) => {
        setTimeout(() => {
            let nextId = Math.max(...eventsDB.keys()) + 1;
            newEvent = { ...newEvent, id: nextId }
            eventsDB.set(nextId, newEvent);
            createRequests[requestId] = {
                ...createRequests[requestId],
                status: 'success'
            }
            resolve(newEvent)
        }, 800)
    })
    createRequests[requestId] = {
        promise: request_promise,
        timestamp: Date.now(),
        status: 'pending'
    }

    return request_promise
}

const deleteEvent = (eventId: number) => {
    // mock request promise
    let requestId = getUUID();
    let request_promise = new Promise<number>((resolve, reject) => {
        setTimeout(() => {
            eventsDB.delete(eventId);
            deleteRequests[requestId].status = 'success'
            resolve(eventId)
        }, 800)
    })
    deleteRequests[requestId] = {
        promise: request_promise,
        timestamp: Date.now(),
        status: 'pending',
        id: eventId
    }
    return request_promise
}

const updateEvent = (modifiedEvent: IEvent) => {
    // mock request promise
    let requestId = getUUID();
    let request_promise = new Promise<IEvent>((resolve, reject) => {
        setTimeout(() => {
            let eventId = modifiedEvent.id;
            updateRequests[requestId].status = 'success'
            eventsDB.set(eventId, modifiedEvent);
            resolve(modifiedEvent)
        }, 800)
    })
    updateRequests[requestId] = {
        promise: request_promise,
        timestamp: Date.now(),
        status: 'pending',
        id: modifiedEvent.id
    }
    return request_promise 
}


const getEventApiState = (deps: EntityDeps) => {
    return {
        createRequests: { ...createRequests},
        deleteRequests: { ...deleteRequests},
        updateRequests: { ...updateRequests}
    }
}

export const eventAPI = new Entity("eventAPI" as const, [], getEventApiState);

export const createEventMutation = new Mutation(
    "createEvent" as const,
    [eventAPI], (deps, event) => { 
    let p = createEvent(event).then((e) => {
        deps.eventAPI.handleParentChange()
        return e
    })
    deps.eventAPI.handleParentChange()
    return p
 });
export const updateEventMutation = new Mutation(
    "updateEvent" as const,
    [eventAPI], 
    (deps, event) => { 
        let p = updateEvent(event).then(() => {
            deps.eventAPI.handleParentChange()
        })
        deps.eventAPI.handleParentChange()
        return p
    }
);
export const deleteEventMutation = new Mutation(
    "deleteEvent" as const,
    [eventAPI], (deps, eventId) => {
    let p = deleteEvent(eventId).then(() => {
        deps.eventAPI.handleParentChange()
    })
    deps.eventAPI.handleParentChange()
    return p
});

/* activeCalendar */

let getActiveCalendar = ([calendarId, calendars]: EntityDeps) => {
    let calendars_list = calendars.getState()
    if (calendars_list == null) return null

    return calendars_list.find((calendar: ICalendar) => {
        return calendar.id === calendarId.getState()
    })
}

export const activeCalendar = new Entity("activeCalendar" as const, [calendarId, calendars], getActiveCalendar)


/* activeMonth */

let getActiveMonthFromUrlParam = (url: string): ICalMonth | null => {
    let parsedUrl = new URL(url)
    let params = new URLSearchParams(parsedUrl.search)
    let activeDateString = params.get("activeMonth")
    if (!activeDateString) return null;
    try {
        return new CalMonth(
            parseInt(activeDateString.split('-')[0], 10), 
            parseInt(activeDateString.split('-')[1], 10)
        );
    } catch (e) {
        return null;
    }
}

let navigateToActiveMonth = (url: string, activeDate: ICalMonth | ICalDate | null) => {
    let parsedUrl = new URL(url)
    let params = new URLSearchParams(parsedUrl.search)
    if (activeDate === null) {
        params.delete("activeMonth")
    } else {
        params.set("activeMonth", `${activeDate.year}-${activeDate.month}`)
    }
    myPushState({}, '', `${parsedUrl.pathname}?${params.toString()}`);
}

export const activeMonth = new Entity("activeMonth" as const, [urlState], (deps) => {
    return getActiveMonthFromUrlParam(deps[0].getState())
});

export const setActiveMonth = new Mutation(
    "setActiveMonth" as const,
    [urlState],
    (deps, activeDate: ICalMonth | ICalDate | null) => {
        navigateToActiveMonth(deps.urlState.getState() || '', activeDate)
    })

/* currentMonthEvents */

let getEvents = async (calendarId: number) => {
    // mock api call

    let request_promise = new Promise<IEvent[]>((resolve, reject) => {
        setTimeout(() => {
            if (calendarId === 4) {
                resolve([...eventsDB.values()])
            } else {
                resolve([])
            }
        }, 800)
    })

    let events = await request_promise;

    return events;
}

export const currentMonthEvents = new Entity(
    "currentMonthEvents" as const,
    [calendarId, activeMonth, eventAPI, auth], (deps) => {
        return getEvents(deps[0].getState())
    });


/* activeDate */

function getSearchFromPath(url: string) {
    const urlObj = new URL(url);
    const search = urlObj.search;
  
    return search;
}

let getActiveDateFromUrlParam = (url: string): ICalDate | null => {
    let params = new URLSearchParams(getSearchFromPath(url))
    let activeDateString = params.get("activeDate")
    if (!activeDateString) return null;
    try {
        return {
            year: parseInt(activeDateString.split('-')[0], 10), 
            month: parseInt(activeDateString.split('-')[1], 10),
            date: parseInt(activeDateString.split('-')[2], 10)
        };
    } catch (e) {
        return null;
    }
}

let navigateToActiveDate = (url: string, activeDate: ICalDate | null) => {
    let parsedUrl = new URL(url)
    let params = new URLSearchParams(parsedUrl.search)
    if (activeDate === null) {
        params.delete("activeDate")
    } else {
        params.set("activeDate", `${activeDate.year}-${activeDate.month}-${activeDate.date}`)
    }
    myPushState({}, '', `${parsedUrl.pathname}?${params.toString()}`);
}

export const activeDate = new Entity("activeDate" as const, [urlState], (deps) => {
    return getActiveDateFromUrlParam(deps[0].getState())
});

export const setActiveDate = new Mutation(
    "setActiveDate" as const,
    [urlState], 
    (deps, activeDate: ICalDate | null) => {
    navigateToActiveDate(deps.urlState.getState() || '', activeDate)
})


/* activeDateEvents */

let getActiveDateEvents = (activeDate: ICalDate, events: IEvent[]) => {
  if (events == null || activeDate == null) return null
  let r =
    events.filter((event: IEvent) => {
      return (
        event.date.getFullYear() === activeDate.year &&
        event.date.getMonth() + 1 === activeDate.month &&
        event.date.getDate() === activeDate.date
      )
    }) || null
  return r
}

export const activeDateEvents = new Entity("activeDateEvents" as const, [activeDate, currentMonthEvents], (deps) => {
    return getActiveDateEvents(deps[0].getState(), deps[1].getState())
});


/* importantEvents */

export const importantEvents = new Entity("importantEvents" as const, [calendarId, eventAPI], () => []);


/* activeEventId */

let getActiveEventIdFromUrlParam = (url: string) => {
    let params = new URLSearchParams(new URL(url).search)
    let activeEventIdString = params.get("activeEventId")
    if (!activeEventIdString) return null;
    return parseInt(activeEventIdString, 10);
}

let navigateToActiveEventId = (url: string, activeEventId: number | null) => {
    let params = new URLSearchParams(new URL(url).search)
    if (activeEventId === null) {
        params.delete("activeEventId")
    } else {
        params.set("activeEventId", "" + activeEventId)
    }
    myPushState({}, '', `${location.pathname}?${params.toString()}`);
}

export const activeEventId = new Entity("activeEventId", [urlState], (deps) => {
    return getActiveEventIdFromUrlParam(deps[0].getState() || '');
});

export const setActiveEventId = new Mutation(
    "setActiveEventId" as const,
    [urlState], (deps, activeEventId: number | null) => {
    navigateToActiveEventId(deps.urlState.getState() || '', activeEventId)
})

/* activeEvent */

let getActiveEvent = (activeEventId: number, events: IEvent[]) => {
    if (!events) {
        return null
    }
    return events.find((event: IEvent) => {
        return event.id === activeEventId 
    }) || null
}

export const activeEvent = new Entity("activeEvent", [activeEventId, currentMonthEvents], (deps) => {
    return getActiveEvent(deps[0].getState(), deps[1].getState());
});


/* page */

export const page = new Entity("page" as const, [], () => { return "calendar" });


/* editingActiveEvent */

let isEditingActiveEvent = false 

export const editingActiveEvent = new Entity("editingActiveEvent" as const, [], () => isEditingActiveEvent)  

export const setEditingActiveEvent = new Mutation(
    "setEditingActiveEvent" as const,
    [editingActiveEvent], (deps, val: boolean) => {
    isEditingActiveEvent = val 
    deps.editingActiveEvent.handleParentChange()
})
