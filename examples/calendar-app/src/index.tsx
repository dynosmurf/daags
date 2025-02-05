import { createRoot } from 'react-dom/client'
import 'tailwindcss/tailwind.css'
import App from './components/App'
import { StateGraph } from '@daags/visualizer';

const container = document.getElementById('root') as HTMLDivElement
const root = createRoot(container)

root.render(
    <div className="flex">
        <div className="flex-1">
            <App />
        </div>
        <div className="flex-shrink-0 w-[1000px]">
            <StateGraph />
        </div>
    </div>
)
