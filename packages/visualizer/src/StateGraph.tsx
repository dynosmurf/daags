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
    if (
      newIdx >= 0 &&
      ['change', 'mount', 'unmount'].includes(history[newIdx].type)
    ) {
      setActiveNode((history[newIdx] as any).entity.key)
    }
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

  const getStroke = (entity: Entity<any, any>) => {
    if (!entity.isMounted()) {
      return '#CCCCCC'
    }
    if (entity.getDirectMounts() === 0) {
      return '#000000'
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
    <div className="w-full relative h-screen overflow-y-auto p-4">
      <svg id="svg" width={width + 4} height={height + 4}>
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
                  stroke={getStroke(link.target.data.entity)}
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
                    stroke={getStroke(node.data.entity)}
                    strokeWidth={getStrokeWidth(node.data.entity)}
                    fill={
                      activeEntity && activeEntity.key === node.data.entity.key
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
                    link.target.data.entity.isMounted() ? '#000000' : '#CCCCCC'
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
      <div className="flex px-1">
        <div className="px-1 w-1/2">
          <div>
            <a onClick={() => handleSetIdx(-1)}>Latest</a>
          </div>
          {history
            .map((s: any, i) => {
              return (
                <div key={`1${i}-${s['timestamp']}-${s['type']}`}>
                  <a
                    className={
                      i === currentEventIdx ? 'text-yellow-700' : 'text-black'
                    }
                    onClick={() => handleSetIdx(i)}
                  >
                    {s['type']} {s['entity'] && s['entity'].key}
                    {s['mutation'] && s['mutation'].key} {s['async'] && 'async'}
                  </a>
                </div>
              )
            })
            .reverse()}
        </div>
        <div className="px-1 w-1/2">
          {activeEntity && (
            <div>
              <p>node: {activeEntity.key}</p>
              <p>directMounts: {activeEntity.getDirectMounts()}</p>
              <p>totalMounts: {activeEntity.getTotalMounts()}</p>
              <div>
                value:{' '}
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(activeEntity.getState(), null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
        <div className="px-1 w-1/2">
          {activeMutation && (
            <div>
              <p>mutation: {activeMutation.mutation.key}</p>
              <p>deps: {Object.keys(activeMutation.mutation.deps)}</p>
              <div>
                args:{' '}
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(activeMutation.args, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
