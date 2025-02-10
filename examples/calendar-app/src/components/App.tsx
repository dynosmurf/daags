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
  const currentMonthEventsVal = useEntity(currentMonthEvents)
  const setActiveCalendar = useMutation(setCalendarId)

  const isLoaded = calendarsVal !== null && currentMonthEventsVal !== null

  const isAsideActive =
    Number.isFinite(activeEventIdVal) || activeDateVal !== null

  return (
    <div className="relative bg-[#fff] h-screen overflow-y-auto">
      {!isLoaded && <Spinner />}
      {isLoaded && !activeCalendarVal && (
        <div className="flex items-center justify-center min-h-screen">
          <div>
            {calendarsVal.map((cal) => {
              return (
                <div className="p-2" onClick={() => setActiveCalendar(cal.id)}>
                  {cal.name}
                </div>
              )
            })}
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
