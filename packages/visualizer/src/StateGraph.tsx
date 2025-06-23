import { Entity, History } from '@daags/core'

// eslint-disable-next-line import/namespace
import * as d3 from 'd3'
import * as d3dag from 'd3-dag'
import { useEffect, useMemo, useState } from 'react'

/**
 * get transform for arrow rendering
 *
 * This transform takes anything with points (a graph link) and returns a
 * transform that puts an arrow on the last point, aligned based off of the
 * second to last.
 */
function arrowTransform({
  points
}: {
  points: readonly (readonly [number, number])[]
}): string {
  const [[x1, y1], [x2, y2]] = points.slice(-2)
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI + 90
  return `translate(${x2}, ${y2}) rotate(${angle})`
}

function getData(entities: { [key: string]: Entity<any, any> }) {
  const entityList = Object.values(entities)
  const entityKeys = Object.keys(entities)
  const entityToId = new Map()
  const idToEntity = new Map()

  for (let i = 0; i < entityList.length; i++) {
    const entity = entityList[i]
    const key = entityKeys[i]
    entityToId.set(entity, key)
    idToEntity.set(key, entity)
  }

  const data = []
  for (let i = 0; i < entityList.length; i++) {
    const entity = entityList[i]
    const key = entityKeys[i]
    const parents = entity.getParents()
    const parentIds = parents.map((parent: any) => entityToId.get(parent))

    data.push({
      id: key,
      entity: entity,
      parentIds: parentIds
    })
  }
  return data
}

function getGraph(data: any, config: any) {
  // create our builder and turn the raw data into a graph
  const builder = d3dag.graphStratify()
  const graph = builder(data)

  // Compute Layout

  // set the layout functions
  const { nodeRadius } = config
  const nodeSize = [nodeRadius * 2, nodeRadius * 2] as const
  // this truncates the edges so we can render arrows nicely
  const shape = d3dag.tweakShape(nodeSize, d3dag.shapeEllipse)
  // use this to render our edges
  // const line = d3.line().curve(d3.curveMonotoneY);
  // here's the layout operator, uncomment some of the settings
  const layout = d3dag
    .sugiyama()
    .layering(d3dag.layeringLongestPath())
    .decross(d3dag.decrossOpt())
    .coord(d3dag.coordGreedy())
    //.coord(d3dag.coordQuad())
    .nodeSize(nodeSize)
    .gap([nodeRadius, nodeRadius])
    .tweaks([shape])

  // actually perform the layout and get the final size
  const { width, height } = layout(graph)

  return { graph, width, height }
}

export function StateGraph() {
  const entities = Entity.registered
  const history = History.events
  const [historyLength, setHistoryLength] = useState<number>(history.length)

  const [activeNode, setActiveNode] = useState<string | null>(null)

  const line = d3.line().curve(d3.curveMonotoneY)
  const arrowSize = 80
  const arrowLen = Math.sqrt((4 * arrowSize) / Math.sqrt(3))
  const arrow = d3.symbol().type(d3.symbolTriangle).size(arrowSize)

  const [currentEventIdx, setCurrentEventIdx] = useState<number>(-1)

  let currentEntityState = entities
  if (historyLength > 0) {
    currentEntityState =
      currentEventIdx >= 0
        ? history[currentEventIdx].snapshot
        : history[history.length - 1].snapshot
  }
  const activeEntity =
    activeNode && currentEntityState && currentEntityState[activeNode]

  const activeMutation =
    history[currentEventIdx] &&
    history[currentEventIdx].type === 'mutation' &&
    history[currentEventIdx]

  const handleSetIdx = (newIdx: number) => {
    setCurrentEventIdx(newIdx)
    /*
    if (
      newIdx >= 0 &&
      ['change', 'mount', 'unmount'].includes(history[newIdx].type)
    ) {
      setActiveNode((history[newIdx] as any).entity.key)
    }
    */
  }

  useEffect(() => {
    // for each entity add onChange listener to increment v
    const entityList = Object.values(entities)
    const onMountHandlers: any[] = []

    const handleUpdate = () => {
      if (history.length > 0) {
        setHistoryLength(history.length)
      }
    }
    History.eventEmitter.addEventListener('event', handleUpdate)

    for (const entity of entityList) {
      const handleMount = () => {
        handleUpdate()
      }
      entity.onMountChange(handleMount)
      onMountHandlers.push(handleMount)
    }
    return () => {
      for (let i = 0; i < entityList.length; i++) {
        const entity = entityList[i]
        entity.cancelOnMount(onMountHandlers[i])
      }
      History.eventEmitter.removeEventListener('event', handleUpdate)
    }
  }, [])

  const { graph, width, height } = useMemo(() => {
    const data = getData(currentEntityState)
    return getGraph(data, {
      nodeRadius: 40
    })
  }, [currentEntityState])

  const nodes = [...graph.nodes()]
  const links = [...graph.links()]

  const getEdgeStroke = (
    source: Entity<any, any>,
    target: Entity<any, any>
  ) => {
    if (!target.isMounted()) {
      return '#CCCCCC'
    }
    if (source.pendingParentCount > 0 || source.pendingPromise !== null) {
      return 'url(#pending)'
    }

    return '#000000'
  }

  const getNodeStroke = (entity: Entity<any, any>) => {
    if (!entity.isMounted()) {
      return '#CCCCCC'
    }
    if (entity.pendingParentCount > 0 || entity.pendingPromise !== null) {
      return 'url(#pending)'
    }

    return '#000000'
  }

  const getStrokeWidth = (entity: Entity<any, any>) => {
    if (entity.getDirectMounts() > 0) {
      return 4
    }
    return 2
  }

  if (historyLength === 0) {
    return <></>
  }

  return (
    <div className="w-full flex flex-col relative pl-[8px] h-screen overflow-hidden">
      {/* Tailwind Custom Animation */}
      <style>
        {`
          @keyframes flashFade {
            0% { color: blue; background-color: rgba(199, 210, 254, var(--tw-bg-opacity)); }
            100% { color: black; background-color: rgba(243, 244, 246, var(--tw-bg-opacity)); }
          }
          .animate-flash {
            animation: flashFade 5s ease-in-out;
          }
        `}
      </style>
      <div className="h-1/3 w-full flex items-center justify-center border-b p-2">
        <svg
          id="svg"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          viewBox={`0 0 ${width + 4} ${height + 4}`}
        >
          <defs>
            <linearGradient id="pending" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="cyan">
                <animate
                  attributeName="stop-color"
                  values="cyan; magenta; yellow; cyan"
                  dur="4s"
                  repeatCount="indefinite"
                />
              </stop>
              <stop offset="100%" stopColor="magenta">
                <animate
                  attributeName="stop-color"
                  values="magenta; yellow; cyan; magenta"
                  dur="4s"
                  repeatCount="indefinite"
                />
              </stop>
            </linearGradient>
          </defs>
          <g transform="translate(2, 2)">
            <defs id="defs" />
            <g id="links">
              {links.map((link: any) => {
                return (
                  <path
                    key={link.source.data.id + link.target.data.id}
                    d={line(link.points) as string}
                    fill="none"
                    strokeWidth="2"
                    stroke={getEdgeStroke(
                      link.source.data.entity,
                      link.target.data.entity
                    )}
                  />
                )
              })}
            </g>

            <g id="nodes">
              {nodes.map((node: any) => {
                return (
                  <g
                    key={node.data.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => {
                      setActiveNode(node.data.id)
                    }}
                  >
                    <circle
                      r="40"
                      stroke={getNodeStroke(node.data.entity)}
                      strokeWidth={getStrokeWidth(node.data.entity)}
                      fill={
                        activeEntity &&
                        activeEntity.key === node.data.entity.key
                          ? '#e5e7eb'
                          : '#ffffff'
                      }
                    />
                    <text
                      fontWeight="bold"
                      fontSize="10px"
                      fontFamily="sans-serif"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      fill="black"
                    >
                      {node.data.id}
                    </text>
                  </g>
                )
              })}
            </g>

            <g id="arrows">
              {links.map((link: any) => {
                return (
                  <path
                    key={link.source.data.id + link.target.data.id}
                    d={arrow() as string}
                    fill={
                      link.target.data.entity.isMounted()
                        ? '#000000'
                        : '#CCCCCC'
                    }
                    transform={arrowTransform(link)}
                    stroke="white"
                    strokeWidth="2"
                    strokeDasharray={`${arrowLen},${arrowLen}`}
                  />
                )
              })}
            </g>
          </g>
        </svg>
      </div>
      <div className="flex flex-1 h-2/3">
        <div className="w-1/3 flex flex-col border-r border-gray-300">
          <div className="sticky top-0 border-b p-2 flex items-baseline justify-between">
            <h3>State Events</h3>
            <a
              className={
                'text-underline text-sm cursor-pointer' +
                (currentEventIdx === -1 ? ' text-blue-500' : ' text-grey-500')
              }
              onClick={() => handleSetIdx(-1)}
            >
              follow latest
            </a>
          </div>
          <div className="flex-1 overflow-y-auto">
            {history
              .map((s: any, i) => {
                return (
                  <div
                    className={`px-2 animate-flash bg-gray-100 cursor-pointer hover:text-indigo-500 hover:bg-indigo-100 ${
                      currentEventIdx === i ||
                      (currentEventIdx === -1 && i === history.length - 1)
                        ? 'text-pink-600 bg-pink-200'
                        : ''
                    } ${i > 0 && history[i].tick !== history[i-1].tick ? ' border-b border-pink-300': ''}`}
                    key={`1${i}-${s['timestamp']}-${s['type']}`}
                    onClick={() => handleSetIdx(i)}
                  >
                    <a>{s['type'] === 'mutation' || s['async'] ? '' : '\u00A0\u00A0\u00A0\u00A0'}
                      {s['async'] ? 'async' : s['type']} {s['entity'] && s['entity'].key}
                      {s['mutation'] && s['mutation'].key}{' '}
                    </a>
                  </div>
                )
              })
              .reverse()}
          </div>
        </div>
        {activeEntity && (
          <div className="w-1/2 flex flex-col border-r flex-1">
            <div className="sticky top-0 border-b p-2 flex items-baseline justify-between">
              <h3>Node Details</h3>
            </div>
            <div className="overflow-y-auto px-2 py-1">
              <p>node: {activeEntity.key}</p>
              <p>
                directMounts: {activeEntity.getDirectMounts()}
                {activeEntity.listenerCallers.length > 0 && ` (${activeEntity.listenerCallers.join(', ')})`}
              </p>
              <p>totalMounts: {activeEntity.getTotalMounts()}</p>
              <p>
                selfStatus:{' '}
                {activeEntity.pendingPromise !== null ? 'pending' : 'idle'}
              </p>
              <p>pendingParents: {activeEntity.pendingParentCount} </p>
              <div>
                value:{' '}
                <pre className="whitespace-pre-wrap text-sm">
                  {JSON.stringify(activeEntity.getState(), null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
        {activeMutation && (
          <div className="w-1/2 flex flex-col flex-1">
            <div className="sticky top-0 border-b p-2 flex items-baseline justify-between">
              <h3>Mutation Details</h3>
            </div>
            <div className="overflow-y-auto px-2 py-1">
              <p>mutation: {activeMutation.mutation.key}</p>
              <p>deps: {Object.keys(activeMutation.mutation.deps)}</p>
              <div>
                args:{' '}
                <pre className="whitespace-pre-wrap text-sm">
                  {JSON.stringify(activeMutation.args, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
