import { Calendar } from './Calendar'
import { DayView } from './DayView'
import { EventEdit } from './EventEdit'
import { EventView } from './EventView'
import {
  activeDate,
  activeEventId,
  editingActiveEvent,
  calendars,
  currentMonthEvents
} from '../entities'
import { useEntity } from '@daags/hooks'
import { Spinner } from './ui/Spinner'

function App() {
  const activeDateVal = useEntity(activeDate)
  const activeEventIdVal = useEntity(activeEventId)
  const editingActiveEventVal = useEntity(editingActiveEvent)
  const calendarsVal = useEntity(calendars)
  const currentMonthEventsVal = useEntity(currentMonthEvents)

  const isLoaded = calendarsVal !== null && currentMonthEventsVal !== null

  const isAsideActive =
    Number.isFinite(activeEventIdVal) || activeDateVal !== null

  return (
    <div className="relative bg-[#ecfdf5] h-screen overflow-y-auto">
      {!isLoaded && <Spinner />}

      {isLoaded && (
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

            {Number.isFinite(activeEventIdVal) && <EventView />}

            {editingActiveEventVal && <EventEdit />}
          </aside>
        </div>
      )}
    </div>
  )
}

export default App
