import cloneDeep from 'lodash.clonedeep'

export type EntityDeps = Entity<any, any>[]
/* eslint-ignore */

export type ValueFn<T> =
  | ((deps: EntityDeps) => T) // eslint-disable-line
  | ((deps: EntityDeps) => Promise<T>) // eslint-disable-line

export const isEqual = <T>(a: T, b: T): boolean => {
  if (a === b) {
    return true
  }

  const bothAreObjects =
    a && b && typeof a === 'object' && typeof b === 'object'

  return Boolean(
    bothAreObjects &&
      Object.keys(a).length === Object.keys(b).length &&
      Object.entries(a).every(([k, v]) => isEqual(v, b[k as keyof T]))
  )
}

// Function to strictly infer entity mappings
export function mapEntities<const T extends readonly [...Entity<any, any>[]]>(
  entities: T
): { [K in T[number]['key']]: Extract<T[number], { key: K }> } {
  return Object.fromEntries(entities.map((entity) => [entity.key, entity])) as {
    [K in T[number]['key']]: Extract<T[number], { key: K }>
  }
}

interface MutationSnapshot {
  timestamp: number,
  tick: number
  type: 'mutation'
  mutation: Mutation<any, any, any, string>
  args: any[]
  snapshot: Record<string, Entity<any, any>>
}

interface GetSnapshot {
  timestamp: number
  tick: number
  type: 'get'
  entity: Entity<any, any>
  snapshot: Record<string, Entity<any, any>>
}

interface ChangeSnapshot {
  timestamp: number
  tick: number
  type: 'change'
  async: boolean
  entity: Entity<any, any>
  snapshot: Record<string, Entity<any, any>>
}

interface MountSnapshot {
  timestamp: number
  tick: number
  type: 'mount' | 'unmount'
  entity: Entity<any, any>
  snapshot: Record<string, Entity<any, any>>
}

class EventEmitter extends EventTarget {
  emit() {
    this.dispatchEvent(new Event('event'))
  }
}

let tickCount = 0;
let shouldIncrement = false;

export class History {
  public static incrementTickCount() {
    shouldIncrement = true;
    setTimeout(() => {
      if (shouldIncrement) {
        tickCount++;
        shouldIncrement = false
      }
    }, 0)
  }
  public static events: (
    | MutationSnapshot
    | GetSnapshot
    | ChangeSnapshot
    | MountSnapshot
  )[] = []
  public static eventEmitter: EventEmitter = new EventEmitter()

  public static recordGetEvent(entity: Entity<any, any>) {
    History.incrementTickCount()
    History.events.push({
      timestamp: Date.now(),
      tick: tickCount,
      type: 'get',
      entity,
      snapshot: History.getSnapshot()
    })
    History.eventEmitter.emit()
  }

  public static recordChangeEvent(
    entity: Entity<any, any>,
    async: boolean = false
  ) {
    History.incrementTickCount()
    History.events.push({
      timestamp: Date.now(),
      tick: tickCount,
      type: 'change',
      entity,
      async,
      snapshot: History.getSnapshot()
    })
    History.eventEmitter.emit()
  }

  public static recordMountEvent(entity: Entity<any, any>) {
    History.incrementTickCount()
    History.events.push({
      timestamp: Date.now(),
      tick: tickCount,
      type: 'mount',
      entity,
      snapshot: History.getSnapshot()
    })
    History.eventEmitter.emit()
  }

  public static recordUnmountEvent(entity: Entity<any, any>) {
    History.incrementTickCount()
    History.events.push({
      timestamp: Date.now(),
      tick: tickCount,
      type: 'unmount',
      entity,
      snapshot: History.getSnapshot()
    })
    History.eventEmitter.emit()
  }

  public static recordMutationEvent(
    mutation: Mutation<any, any, any, string>,
    args: any[]
  ) {
    History.incrementTickCount()
    History.events.push({
      timestamp: Date.now(),
      tick: tickCount,
      type: 'mutation',
      mutation,
      args,
      snapshot: History.getSnapshot()
    })
    History.eventEmitter.emit()
  }

  private static getSnapshot() {
    return cloneDeep(Entity.registered)
  }
}

// Mutator class
export class Mutation<
  const T extends readonly [...Entity<any, any>[]],
  P extends any[],
  M,
  Q extends string
> {
  public key: Q
  public static registered: Mutation<any, any, any, string>[] = []
  deps: { [K in T[number]['key']]: Extract<T[number], { key: K }> }
  private fn

  constructor(
    key: Q,
    entities: T,
    fn: (
      deps: { [K in T[number]['key']]: Extract<T[number], { key: K }> }, // eslint-disable-line
      ...args: P // eslint-disable-line
    ) => M
  ) {
    this.key = key
    this.deps = mapEntities(entities)
    this.fn = fn
    Mutation.registered.push(this)
  }

  getFn() {
    return (...args: P) => {
      History.recordMutationEvent(this, args)
      return this.fn(this.deps, ...args)
    }
  }
}

export class Entity<T, K extends string> {
  public static registered: Record<string, Entity<any, any>> = {}

  // State nodes from which the state of this node can be derived either directly or with call to external store
  public key: K
  private parents: EntityDeps = []
  private status: 'pending' | 'idle' = 'idle'

  // State nodes which depend on the value of this state node
  private children: EntityDeps = []

  // Function which returns the value of this node given the values of all
  // parents
  private valueFn: ValueFn<T>

  // The current value of this node
  private value: T | null = null
  private prevValue: T | null = null
  private parentVersions: number[] = []
  private version = 0

  // A counter which tracks the number of times this node has been "mounted",
  // or how many direct external listeners there are
  private mounts: number = 0

  private indirectMounts: number = 0

  // A counter which tracks the number of external listeners including only
  // listeners assinged to children
  private parentMounted: number = 0

  // Functions which will be called when the value of this node changes either
  // as a result of a direct mutation or a parent value changing.
  private listeners: (() => void)[] = []
  public listenerCallers: (string | undefined)[] = []
  private mountListeners: (() => void)[] = []

  public pendingPromise: Promise<T> | null = null
  public pendingParentCount: number = 0

  constructor(key: K, parents: EntityDeps, valueFn: ValueFn<T>) {
    this.key = key
    this.parents = parents
    this.parentVersions = parents.map(() => -1)
    this.valueFn = valueFn
    // if mutations is a function, we assume it is a setterFn

    for (const parent of parents) {
      parent.addChild(this)
    }
    Entity.registered[key] = this
  }

  public onChange(listener: () => void, caller?: string) {
    this.listeners.push(listener)
    this.listenerCallers.push(caller)
  }

  public cancelOnChange(listener: () => void) {
    const idx = this.listeners.indexOf(listener)
    if (idx >= 0) {
      this.listeners.splice(idx, 1)
      this.listenerCallers.splice(idx, 1)
    }
  }

  public onMountChange(listener: () => void) {
    this.mountListeners.push(listener)
  }

  public cancelOnMount(listener: () => void) {
    const idx = this.mountListeners.indexOf(listener)
    if (idx >= 0) {
      this.mountListeners.splice(idx, 1)
    }
  }

  public getChildren() {
    return this.children
  }

  public getParents() {
    return this.parents
  }

  public isMounted() {
    return this.mounts > 0
  }

  public addParent(parent: Entity<any, any>) {
    this.parents.push(parent)
  }

  public addChild(child: Entity<any, any>) {
    this.children.push(child)
  }

  public notifyListeners() {
    for (const listener of this.listeners) {
      listener()
    }
  }

  private notifyMountListeners() {
    for (const mountListener of this.mountListeners) {
      mountListener()
    }
  }

  private parentHasChanged() {
    if (this.parents.length) {
      for (let i = 0; i < this.parents.length; i++) {
        if (this.parents[i].version > this.parentVersions[i]) {
          return true
        }
      }
    } else {
      return true
    }
  }

  public handleParentPending() {
    this.pendingParentCount++
    for (const child of this.children) {
      child.handleParentPending()
    }
  }

  public handleParentResolve() {
    this.pendingParentCount--
    for (const child of this.children) {
      child.handleParentResolve()
    }
  }

  public handleParentChange() {
    /**
     * Should only execute if for any parent value != prevVal
     */

    if (!this.isMounted()) {
      if (this.value !== null) {
        this.value = null
        History.recordChangeEvent(this)
      }
      return
    }
    if (!this.parentHasChanged()) {
      // noop
      return
    }

    if (this.pendingParentCount > 0) {
      // a parent has changed but one or more parents are still in pending
      // state so no recomputation should be performed until they are idle.
      // TODO: is this actually the behavior we want, it could be the case that
      // multiple pending parents cause the application to become deadlocked.
      // A better behavior might be to recompute with the recieved value but
      // maintain the pending status of children.
      return
    }

    const result = this.valueFn(this.parents)
    if (result instanceof Promise) {
      if (this.status !== 'pending') {
        for (const child of this.children) {
          // we only want to recurse to mounted children
          child.handleParentPending()
        }
      }
      this.pendingPromise = result
      this.status = 'pending'

      // this will immediately set the status of all child nodes to be pending
      // need to set current node status to pending
      // need to push promise onto queue of pending promises for this node
      // need to propigate status to all children

      History.recordGetEvent(this)
      ;(result as Promise<T>).then((value: T) => {
        if (result !== this.pendingPromise) {
          // if the promise currently being resolved isn't the last promise to be queued
          // we want to do nothing
          return
        } else {
          // we actually need to keep track of the state of each parent. We should
          // not set the state of a child to be idle unless all parents have resolved.
          this.status = 'idle'
          this.pendingPromise = null
          for (const child of this.children) {
            child.handleParentResolve()
          }
        }
        // need to remove this promise from set of pending promises for node
        // if it was the most recent to be pushed to the queue then we want
        // to handle

        // How do we want to handle the behavior here or should it be configurable?
        this.prevValue = this.value
        this.value = cloneDeep(value)
        if (!isEqual(this.value, this.prevValue)) {
          this.version++
          History.recordChangeEvent(this, true)
          for (const child of this.children) {
            if (child.getTotalMounts() > 0) {
              child.handleParentChange()
            }
          }
          this.notifyListeners()
        } else {
          History.recordChangeEvent(this, true)
        }
      })
    } else {
      this.prevValue = this.value
      this.value = cloneDeep(result)
      if (!isEqual(this.value, this.prevValue)) {
        this.version++
        History.recordChangeEvent(this)
        for (const child of this.children) {
          if (child.getTotalMounts() > 0) {
            child.handleParentChange()
          }
        }

        this.notifyListeners()
      }
    }
  }

  public getState() {
    return this.value
  }

  public getDirectMounts() {
    // TODO: for now returns total
    return this.mounts - this.indirectMounts
  }

  public getTotalMounts() {
    return this.mounts
  }

  public mount(direct = true) {
    for (const parent of this.parents) {
      parent.mount(false)
    }

    const notify = !this.isMounted()

    this.mounts++
    if (!direct) {
      this.indirectMounts++
    }

    if (notify) {
      History.recordMountEvent(this)
      this.notifyMountListeners()
      this.handleParentChange()
      // TODO: do we need to call this on mount?
    }
  }

  public unmount(direct = true) {
    if (!this.isMounted()) {
      return
    }
    this.notifyMountListeners()

    for (const parent of this.parents) {
      parent.unmount(false)
    }
    this.mounts--
    if (!direct) {
      this.indirectMounts--
    }
    if (this.mounts === 0) {
      History.recordUnmountEvent(this)
      this.handleParentChange()
    }
  }
}
