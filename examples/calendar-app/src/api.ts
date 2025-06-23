import { createServer } from 'miragejs'

export interface ICalendar {
  id: string
  name: string
  color: string
}

export interface IEvent {
  id: string
  title: string
  date: Date
  startTime: Date
  endTime: Date
  description: string
  calendarId: number
}

const calendarNames = ['Work', 'Personal', 'Family', 'Friends']
const calendarColors = ['#E4572E', '#17BEBB', '#FFC914', '#76B041']
const calendars = calendarNames.map((name, id) => ({id: `${id}`, name, color: calendarColors[id]}))

const eventTitles = [
  'Date Night',
  'Football Game',
  'Design Review',
  'Sales meeting',
  'Movie Night'
]
const events = eventTitles.map((title, i) => ({
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
  description: `This is event ${i}`,
  calendarId: '1'
}))

export default function () {
  createServer({
    seeds(server) {
      server.db.loadData({
        calendars,
        events
      })
    },
    routes() {
      this.get('/api/calendars', (schema) => {
        return schema.db.calendars
      }, { timing: 3000})
      this.get(
        '/api/calendar/:calendarId/events',
        (schema, request) => {
          const calendarId = request.params.calendarId
          if (request.queryParams.activeMonth && !Array.isArray(request.queryParams.activeMonth)) {
            const [activeYear, activeMonth] = request.queryParams.activeMonth.split('-')
            const allEvents = schema.db.events
            return allEvents.filter((event) => {
              return event.calendarId === calendarId && '' + event.date.getFullYear() === activeYear && '' + (event.date.getMonth() + 1) === activeMonth
            })
          }
          return []
        },
        { timing: 2000 }
      )
      this.post(
        '/api/calendar/:calendarId/events',
        function (schema, request) {
          const newEvent = JSON.parse(request.requestBody)
          newEvent.date = new Date(newEvent.date)
          newEvent.startTime = new Date(newEvent.startTime)
          newEvent.endTime = new Date(newEvent.endTime)
          schema.db.events.insert(newEvent)
          return true
        }
      )
      this.put('/api/calendar/:calendarId/events', function (schema, request) {
        const updatedEvent = JSON.parse(request.requestBody)
        updatedEvent.date = new Date(updatedEvent.date)
        updatedEvent.startTime = new Date(updatedEvent.startTime)
        updatedEvent.endTime = new Date(updatedEvent.endTime)
        schema.db.events.update(updatedEvent.id, updatedEvent)
        return true
      })
      this.delete(
        '/api/calendar/:calendarId/events/:eventId',
        function (schema, request) {
          schema.db.events.remove(request.params.eventId)
          return true
        }
      )
    }
  })
}
