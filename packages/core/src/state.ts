import cloneDeep from "lodash.clonedeep";

export type EntityDeps = Entity<any, any>[];
export type ValueFn<T> = ((deps: EntityDeps) => T) | ((deps: EntityDeps) => Promise<T>)

export const isEqual = <T>(a: T, b: T): boolean => {
    if (a === b) {
        return true;
    }

    const bothAreObjects =
        a && b && typeof a === "object" && typeof b === "object";

    return Boolean(
        bothAreObjects &&
        Object.keys(a).length === Object.keys(b).length &&
        Object.entries(a).every(([k, v]) => isEqual(v, b[k as keyof T]))
    );
};

// Function to strictly infer entity mappings
export function mapEntities<const T extends readonly [...Entity<any, any>[]]>(
    entities: T
): { [K in T[number]["key"]]: Extract<T[number], { key: K }> } {
    return Object.fromEntries(
        entities.map(entity => [entity.key, entity])
    ) as { [K in T[number]["key"]]: Extract<T[number], { key: K }> };
}

interface MutationSnapshot {
    timestamp: number,
    type: "mutation",
    mutation: Mutation<any, any, any, string>,
    args: any[],
    snapshot: Record<string, Entity<any, any>>
}

interface ChangeSnapshot {
    timestamp: number,
    type: "change",
    async: boolean,
    entity: Entity<any, any>,
    snapshot: Record<string, Entity<any, any>>
}

interface MountSnapshot {
    timestamp: number,
    type: "mount" | "unmount",
    entity: Entity<any, any>,
    snapshot: Record<string, Entity<any, any>>
}

class EventEmitter extends EventTarget {
    emit() {
        this.dispatchEvent(new Event("event"));
    }
}

export class History {
    public static events: (MutationSnapshot | ChangeSnapshot | MountSnapshot)[] = []
    public static eventEmitter: EventEmitter = new EventEmitter(); 

    public static recordChangeEvent(entity: Entity<any, any>, async: boolean = false) {
        History.events.push({
            timestamp: Date.now(),
            type: "change",
            entity,
            async,
            snapshot: History.getSnapshot()
        })
        History.eventEmitter.emit()
    }

    public static recordMountEvent(entity: Entity<any, any>) {
        History.events.push({
            timestamp: Date.now(),
            type: "mount",
            entity,
            snapshot: History.getSnapshot()
        })
        History.eventEmitter.emit()
    }

    public static recordUnmountEvent(entity: Entity<any, any>) {
        History.events.push({
            timestamp: Date.now(),
            type: "unmount",
            entity,
            snapshot: History.getSnapshot()
        })
        History.eventEmitter.emit()
    }

    public static recordMutationEvent(mutation: Mutation<any, any, any, string>, args: any[]) {
        History.events.push({
            timestamp: Date.now(),
            type: "mutation",
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
export class Mutation<const T extends readonly [...Entity<any, any>[]], P extends any[], M, Q> {
    public key: string; 
    public static registered: Mutation<any, any, any, string>[] = []
    deps: { [K in T[number]["key"]]: Extract<T[number], { key: K }> };
    private fn;


    constructor(
        key: string,
        entities: T,
        fn: (deps: { [K in T[number]["key"]]: Extract<T[number], { key: K }> }, ...args: P) => M
    ) {
        this.key = key;
        this.deps = mapEntities(entities);
        this.fn = fn;
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
    public static registered: Record<string, Entity<any, any>> = {}; 

    // State nodes from which the state of this node can be derived either directly or with call to external store
    public key: string;
    private parents: EntityDeps = [];

    // State nodes which depend on the value of this state node
    private children: EntityDeps = [];

    // Function which returns the value of this node given the values of all
    // parents
    private valueFn: ValueFn<Promise<T>> | ValueFn<T>;

    // The current value of this node
    private value: T | null = null;
    private prevValue: T | null = null;
    private parentVersions: number[] = [];
    private version = 0;

    // A counter which tracks the number of times this node has been "mounted",
    // or how many direct external listeners there are
    private mounts: number = 0;

    private indirectMounts: number = 0;

    // A counter which tracks the number of external listeners including only
    // listeners assinged to children
    private parentMounted: number = 0;

    // Functions which will be called when the value of this node changes either
    // as a result of a direct mutation or a parent value changing.
    private listeners: (() => void)[] = [];
    private mountListeners: (() => void)[] = [];

    constructor(key: string, parents: EntityDeps, valueFn: ValueFn<Promise<T>> | ValueFn<T>) {
        this.key = key;
        this.parents = parents
        this.parentVersions = parents.map(() => -1)
        this.valueFn = valueFn;
        // if mutations is a function, we assume it is a setterFn

        for (let parent of parents) {
            parent.addChild(this);
        }
        Entity.registered[key] = this
    }

    public onChange(listener: () => void) {
        this.listeners.push(listener);
    }

    public cancelOnChange(listener: () => void) {
        let idx = this.listeners.indexOf(listener)
        if (idx >= 0) {
            this.listeners.splice(idx, 1)
        }
    }

    public onMountChange(listener: () => void) {
        this.mountListeners.push(listener)
    }

    public cancelOnMount(listener: () => void) {
        let idx = this.mountListeners.indexOf(listener)
        if (idx >= 0) {
            this.mountListeners.splice(idx, 1)
        }
    }

    public getChildren() {
        return this.children;
    }

    public getParents() {
        return this.parents;
    }

    public isMounted() {
        return this.mounts > 0;
    }

    public addParent(parent: Entity<any, any>) {
        this.parents.push(parent);
    }

    public addChild(child: Entity<any, any>) {
        this.children.push(child)
    }

    public notifyListeners() {
        for (let listener of this.listeners) {
            listener();
        }
    }

    private notifyMountListeners() {
        for (let mountListener of this.mountListeners) {
            mountListener();
        }
    }

    private parentHasChanged() {
        if (this.parents.length) {
            for (let i = 0; i < this.parents.length; i++) {
                if (this.parents[i].version > this.parentVersions[i]) {
                    return true;
                }
            }
        } else {
            return true
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
        let result = this.valueFn(this.parents);
        if (result instanceof Promise) {
    
            History.recordChangeEvent(this);

            (result as Promise<T>).then((value: T) => {
                this.prevValue = this.value
                this.value = cloneDeep(value);
                if (!isEqual(this.value, this.prevValue)) {
                    this.version++;
                    History.recordChangeEvent(this, true)
                    for (let child of this.children) {
                        if (child.getTotalMounts() > 0) {
                            child.handleParentChange();
                        }
                    }
                    this.notifyListeners();
                    
                }

            })
        } else {

            this.prevValue = this.value
            this.value = cloneDeep(result);
            if (!isEqual(this.value, this.prevValue)) {
                this.version++;
                History.recordChangeEvent(this)
                for (let child of this.children) {
                    if (child.getTotalMounts() > 0) {
                        child.handleParentChange();
                    }
                }

                this.notifyListeners();
            }

        }

    }

    public getState() {
        return this.value;
    }

    public getDirectMounts() {
        // TODO: for now returns total
        return this.mounts - this.indirectMounts
    }

    public getTotalMounts() {
        return this.mounts
    }

    public mount(direct = true) {
        for (let parent of this.parents) {
            parent.mount(false)
        }

        let notify = !this.isMounted()

        this.mounts++;
        if (!direct) {
            this.indirectMounts++;
        }

        if (notify) {
            History.recordMountEvent(this)
            this.notifyMountListeners()
            this.handleParentChange();
            // TODO: do we need to call this on mount?
        }
        
    }

    public unmount(direct = true) {
        if (!this.isMounted()) return;
        this.notifyMountListeners()

        for (let parent of this.parents) {
            parent.unmount(false)
        }
        this.mounts--;
        if (!direct) {
            this.indirectMounts--;
        }
        if (this.mounts == 0) {
            History.recordUnmountEvent(this)
            this.handleParentChange()
        }
    }
}
