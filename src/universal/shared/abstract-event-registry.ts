import { Event, EventHandler } from "./event";
//import { EventName } from "@universal/client/event-registry";

// The EventLoader allows us to load the different event handlers.
// Modules can resolve the event handlers.
type EventHandlerPromiseResolver<EventPayloadMap, EventName extends keyof EventPayloadMap> = 
    (eventHandler: EventHandler<EventPayloadMap[EventName]>) => void;
interface EventLoader<EventPayloadMap, EventName extends keyof EventPayloadMap> {
    eventHandlerPromise: Promise<EventHandler<EventPayloadMap[EventName]>>;
    eventHandlerResolver: EventHandlerPromiseResolver<EventPayloadMap, EventName>; // resolves the above promise
    event: Event<EventPayloadMap[EventName]>;
}
type EventLoaderMap<EventPayloadMap> = { [EventName in keyof EventPayloadMap]: EventLoader<EventPayloadMap, EventName>};

export abstract class AbstractEventRegistry<EventPayloadMap> {
    private readonly eventLoadersPromise: Promise<EventLoaderMap<EventPayloadMap>>;

    // This method allows us to insert a Promise and the Promise's own resolver into the same object,
    // which will come in handy for resolving the different module's event handlers.
    private constructEventLoader<EventName extends keyof EventPayloadMap>(): Promise<EventLoader<EventPayloadMap, EventName>> {
        return new Promise(resolve => {
            let eventHandlerResolver: EventHandlerPromiseResolver<EventPayloadMap, EventName> | undefined;
            const eventHandlerPromise = new Promise<EventHandler<EventPayloadMap[EventName]>>(eventHandlerResolverFn => {
                eventHandlerResolver = eventHandlerResolverFn;
            });
            if (eventHandlerResolver === undefined) { // shouldn't happen if the promise function runs immediately.
                throw new Error("resolver not assigned");
            }
            const event = new Event(eventHandlerPromise);
            resolve({eventHandlerResolver, eventHandlerPromise, event});
        });
    }

    protected constructor(eventNameIdentity: {[EventName in keyof EventPayloadMap]: void}) { 
        this.eventLoadersPromise = (async () => {
            const eventLoaders: EventLoaderMap<EventPayloadMap> = {} as any;
            for (const eventName in eventNameIdentity) {
                eventLoaders[eventName] = await this.constructEventLoader<typeof eventName>();
            }
            return eventLoaders;
        })();
    }

    private async getEventLoader<EventName extends keyof EventPayloadMap>(eventName: EventName) {
        const eventLoaders = await this.eventLoadersPromise;
        const eventLoader = eventLoaders[eventName];
        if (eventLoader === undefined) { // shouldn't happen if constructor is accurate.
            throw new Error(`event ${eventName} was not properly initialized`)
        }
        return eventLoader;
    }

    public async resolvePostMiddlewareEventHandler<EventName extends keyof EventPayloadMap>(eventName: EventName, handler: EventHandler<EventPayloadMap[EventName]>) {
        return (await this.getEventLoader(eventName)).eventHandlerResolver(handler);
    }

    public async getEventPublisher(eventName: keyof EventPayloadMap) {
        return (await this.getEventLoader(eventName)).event.publisher;
    }

    public async getEventMiddlewareSubscriber(eventName: keyof EventPayloadMap) {
        return (await this.getEventLoader(eventName)).event.subscriber;
    }
}