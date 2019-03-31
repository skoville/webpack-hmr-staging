import { Event, EventHandler } from "../event";
import { AbstractModule } from "./module";

type EventMap<EventPayloadMap> = {[EventName in keyof EventPayloadMap]: Event<EventPayloadMap[EventName]>};

export abstract class AbstractModuleRegistry<EventPayloadMap> {
    /**
     * beginning of bad code that should be refactored.
     */
    private static readonly eventsLoader = AbstractModuleRegistry.getEventsLoader();
    private static getEventsLoader() {
        let resolver: any;
        const promise = new Promise(resolverFunction => {
            resolver = resolverFunction;
        });
        return {resolver, promise, resolved: false};
    }
    /**
     * end of bad code that should be refactored.
     */

    private readonly events: EventMap<EventPayloadMap>;
    protected constructor(eventHandlers: {[EventName in keyof EventPayloadMap]: EventHandler<EventPayloadMap[EventName]>}) {
        if (AbstractModuleRegistry.eventsLoader.resolved) {
            throw new Error("You may only instantiate the module registry once");
        }
        this.events = {} as any; // TODO: find way to accomplish this without use of any.
        for(const eventName in eventHandlers) {
            this.events[eventName] = new Event(eventHandlers[eventName]);
        }
        AbstractModuleRegistry.eventsLoader.resolved = true;
        AbstractModuleRegistry.eventsLoader.resolver(this.events);
    }

    public static readonly Module = class Module<EventPayloadMap> {
        private events: Promise<EventMap<EventPayloadMap>> = AbstractModuleRegistry.eventsLoader.promise as any;
        protected async subscribeMiddleware<EventName extends keyof EventPayloadMap>(eventName: EventName, handler: EventHandler<EventPayloadMap[EventName]>) {
            return (await this.events)[eventName].subscribeMiddleware(handler);
        }
    }

    public static EventTrigger<EventPayloadMap, EventName extends keyof EventPayloadMap>(
        callerModule: AbstractModule<EventPayloadMap>,
        eventName: EventName,
        triggerMethodDescriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<EventPayloadMap[EventName]>>) {
        const eventsPromise: Promise<EventMap<EventPayloadMap>> = AbstractModuleRegistry.eventsLoader.promise as any; // TODO: find a better way to do this so we don't need to use any.
        const triggerMethodImplementation = triggerMethodDescriptor.value;
        if (triggerMethodImplementation === undefined) {
            throw new Error("trigger method implementation must be defined");
        }
        triggerMethodDescriptor.value = async (...args: any[]) => {
            const events = await eventsPromise;
            const payload = await triggerMethodImplementation.apply(callerModule, args);
            await events[eventName].publish(payload);
            return payload;
        }
    }
}