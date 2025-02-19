import { Calendar } from './Calendar'
import { DayView } from './DayView'
import { EventEdit } from './EventEdit'
import { EventView } from './EventView'
import {
  activeDate,
  activeEventId,
  editingActiveEvent,
  calendars,
  currentMonthEvents,
  activeCalendar,
  setCalendarId
} from '../entities'
import { useEntity, useMutation } from '@daags/hooks'
import { Spinner } from './ui/Spinner'

function App() {
  const activeDateVal = useEntity(activeDate)
  const activeEventIdVal = useEntity(activeEventId)
  const editingActiveEventVal = useEntity(editingActiveEvent)
  const calendarsVal = useEntity(calendars)
  const activeCalendarVal = useEntity(activeCalendar)
  const setActiveCalendar = useMutation(setCalendarId)

  const isLoaded = calendarsVal !== null

  const isAsideActive =
    Number.isFinite(activeEventIdVal) || activeDateVal !== null

  return (
    <div className="relative bg-[#fff] h-screen overflow-y-auto">
      {!isLoaded && <Spinner />}
      {isLoaded && !activeCalendarVal && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-1/4 px-4">
            <h3 className="py-2 px-4 text-lg font-bold">Calendars</h3>
            <div className="rounded-md border shadow-sm bg-gray-200 grid gap-[1px] overflow-hidden">
              {calendarsVal.map((cal) => {
                return (
                  <div
                    key={cal.name}
                    className="px-4 py-2 bg-white cursor-pointer hover:bg-blue-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    onClick={() => setActiveCalendar(cal.id)}
                  >
                    <div>{cal.name}</div>
                    <div className="text-sm font-thin">{cal.desc}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {isLoaded && activeCalendarVal && (
        <div className="flex flex-row h">
          <div className={'relative flex-1'}>
            <Calendar />
          </div>

          <aside
            className={`${
              isAsideActive ? 'w-[400px] ease-out' : 'w-0 ease-in'
            }`}
          >
            {activeDateVal &&
              !Number.isFinite(activeEventIdVal) &&
              !editingActiveEventVal && <DayView />}

            {!editingActiveEventVal && Number.isFinite(activeEventIdVal) && (
              <EventView />
            )}

            {editingActiveEventVal && <EventEdit />}
          </aside>
        </div>
      )}
    </div>
  )
}

export default App
