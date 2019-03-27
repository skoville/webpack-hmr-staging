import { Message } from "@universal/shared/api-model";
import { AbstractEventRegistry } from "@universal/shared/abstract-event-registry";

// Define all possible events.
export enum ClientEventName {
    RestartApplication = 'RESTART_APPLICATION',
    HandleMessage = 'HANDLE_MESSAGE',
    SendMessage = 'SEND_MESSAGE'
}

// Map each possible event to a corresponding event payload.
export interface ClientEventPayloadMap {
    [ClientEventName.RestartApplication]: void;
    [ClientEventName.HandleMessage]: Message;
    [ClientEventName.SendMessage]: string;
}

export class ClientEventRegistry extends AbstractEventRegistry<ClientEventPayloadMap> {
    public constructor() {
        super({
            [ClientEventName.RestartApplication]: undefined,
            [ClientEventName.HandleMessage]: undefined,
            [ClientEventName.SendMessage]: undefined
        });
    }
}

/*
// The EventLoader allows us to load the different event handlers.
// Each event handler is defined as a protected method in the different
// abstract module classes.
interface EventLoader<E extends EventName> {
    eventHandlerPromise: Promise<EventHandler<EventPayloads[E]>>;
    eventHandlerResolver: (eventHandler: EventHandler<EventPayloads[E]>) => void;
}

// Map each possible event name to a corresponding EventLoader
interface EventLoaderMap {
    [EventName.RestartApplication]: EventLoader<EventName.RestartApplication>;
    [EventName.HandleMessage]: EventLoader<EventName.HandleMessage>;
    [EventName.SendMessage]: EventLoader<EventName.SendMessage>;
}

// Map each possible event name to a corresponding Event
interface EventMap {
    [EventName.RestartApplication]: Event<EventPayloads[EventName.RestartApplication]>;
    [EventName.HandleMessage]: Event<EventPayloads[EventName.HandleMessage]>;
    [EventName.SendMessage]: Event<EventPayloads[EventName.SendMessage]>;
}

export class ClientEventRegistry {
    private static readonly instance = new ClientEventRegistry();

    public static getInstance()  {
        return this.instance;
    }

    private readonly eventLoadersPromise: Promise<EventLoaderMap>;
    private readonly eventsPromise: Promise<EventMap>;

    // This method allows us to insert a Promise and the Promise's own resolver into the same object,
    // which will come in handy for resolving the different module's event handlers.
    private constructEventLoader<E extends EventName>(): Promise<EventLoader<E>> {
        return new Promise(resolve => {
            const eventHandlerPromise = new Promise<EventHandler<EventPayloads[E]>>(eventHandlerResolver => {
                resolve({eventHandlerResolver, eventHandlerPromise});
            });
        });
    }

    private constructor() {
        this.eventLoadersPromise = new Promise(async () => ({
            [EventName.RestartApplication]: await this.constructEventLoader<EventName.RestartApplication>(),
            [EventName.HandleMessage]: await this.constructEventLoader<EventName.HandleMessage>(),
            [EventName.SendMessage]: await this.constructEventLoader<EventName.SendMessage>()
        }));
        this.eventsPromise = new Promise(async (resolve) => {
            const eventLoaders = await this.eventLoadersPromise;
            const events: EventMap = {
                [EventName.RestartApplication]: new Event(eventLoaders[EventName.RestartApplication].eventHandlerPromise),
                [EventName.HandleMessage]: new Event(eventLoaders[EventName.HandleMessage].eventHandlerPromise),
                [EventName.SendMessage]: new Event(eventLoaders[EventName.SendMessage].eventHandlerPromise)
            }
            resolve(events);
        });
    }

    public async resolvePostMiddlewareEventHandler<E extends EventName>(eventName: E, handler: EventHandler<EventPayloads[E]>) {
        const eventLoaders = await this.eventLoadersPromise;
        eventLoaders[eventName].eventHandlerResolver(handler);
    }

    public get eventPublishers() {
        return (async () => {
            const events = await this.eventsPromise;
            return {
                [EventName.RestartApplication]: await events[EventName.RestartApplication].publisher,
                [EventName.HandleMessage]: await events[EventName.HandleMessage].publisher,
                [EventName.SendMessage]: await events[EventName.SendMessage].publisher
            };
        })();
    }

    public get eventMiddlewareSubscribers() {
        return (async () => {
            const events = await this.eventsPromise;
            return {
                [EventName.RestartApplication]: await events[EventName.RestartApplication].subscriber,
                [EventName.HandleMessage]: await events[EventName.HandleMessage].subscriber,
                [EventName.SendMessage]: await events[EventName.SendMessage].subscriber
            };
        })();
    }
}