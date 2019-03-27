import { ClientEventRegistry } from "@universal/client/event-registry";

export abstract class AbstractClientModule<EventPa> {
    protected eventSubscribers = ClientEventRegistry.getInstance().eventMiddlewareSubscribers;
}