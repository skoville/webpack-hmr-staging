import { AbstractEventRegistry } from "./abstract-event-registry";

export abstract class AbstractClientModule<EventPayloadMapping, EventRegistry extends AbstractEventRegistry<EventPayloadMapping>> {
    protected eventSubscribers = (new AbstractEventRegistry()).eventMiddlewareSubscribers;
}