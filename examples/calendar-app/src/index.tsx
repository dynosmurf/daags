import { createRoot } from 'react-dom/client'
import 'tailwindcss/tailwind.css'
import App from './components/App'
import { WithVisualization } from '@daags/visualizer'
import server from './api'
server()

const container = document.getElementById('root') as HTMLDivElement
const root = createRoot(container)

root.render(<WithVisualization mainContent={<App />} />)
