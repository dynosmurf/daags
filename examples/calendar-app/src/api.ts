import { createServer } from 'miragejs'

export interface ICalendar {
  id: number
  name: string
  color: string
}

export interface IEvent {
  id: number
  title: string
  date: Date
  startTime: Date
  endTime: Date
  description: string
}

const calendarNames = ['Work', 'Personal', 'Family', 'Friends']

const calendarDB: Map<number, ICalendar> = new Map()
for (let i = 0; i < calendarNames.length; i++) {
  calendarDB.set(i, {
    id: i,
    name: calendarNames[i],
    color: '#000000'
  })
}

const eventTitles = [
  'Date Night',
  'Football Game',
  'Design Review',
  'Sales meeting',
  'Movie Night'
]

const eventDB: Map<number, IEvent> = new Map()

for (let i = 0; i < 5; i++) {
  eventDB.set(i, {
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

export default function () {
  createServer({
    routes() {
      this.get('/api/calendars', () => {
        return [...calendarDB.values()]
      })
      this.get(
        '/api/calendar/:calendarId/events',
        (_schema, request) => {
          const calendarId = request.params.calendarId

          if (calendarId === '3') {
            return [...eventDB.values()]
          }
          return []
        },
        { timing: 2000 }
      )
      this.post(
        '/api/calendar/:calendarId/events',
        function (_schema, request) {
          console.log(request)
          return true
        }
      )
      this.put('/api/calendar/:calendarId/events', function (_schema, request) {
        console.log(request)
        return true
      })
      this.delete(
        '/api/calendar/:calendarId/events',
        function (_schema, request) {
          console.log(request)
          return true
        }
      )
    }
  })
}
