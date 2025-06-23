import { useState, useRef, ReactNode } from 'react'
import { StateGraph } from './StateGraph'

interface ResizableSidebarProps {
  mainContent: ReactNode
}

export const WithVisualization = ({ mainContent }: ResizableSidebarProps) => {
  const [sidebarWidth, setSidebarWidth] = useState(Math.max(Math.min(window.innerWidth / 2, 960), 480)) // Initial width
  const isResizing = useRef(false)

  const startResizing = () => {
    isResizing.current = true
    document.addEventListener('mousemove', resize)
    document.addEventListener('mouseup', stopResizing)
  }

  const resize = (e: MouseEvent) => {
    if (!isResizing.current) {
      return
    }
    setSidebarWidth(Math.max(200, window.innerWidth - e.clientX)) // Minimum width: 200px
  }

  const stopResizing = () => {
    isResizing.current = false
    document.removeEventListener('mousemove', resize)
    document.removeEventListener('mouseup', stopResizing)
  }

  return (
    <div className="flex h-screen">
      {/* Main Content Area */}
      <div className="flex-1">{mainContent}</div>

      {/* Sidebar */}
      <div className="bg-gray-100 relative" style={{ width: sidebarWidth }}>
        {/* Drag handle */}
        <div
          className="z-10 absolute top-0 left-0 w-[8px] h-full w-2 bg-gray-500 cursor-ew-resize"
          onMouseDown={startResizing}
        ></div>

        <StateGraph />
      </div>
    </div>
  )
}
