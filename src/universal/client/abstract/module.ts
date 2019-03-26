import { ClientEventRegistry } from "@universal/client/event-registry";

export abstract class AbstractClientModule {
    protected eventSubscribers = ClientEventRegistry.getInstance().eventMiddlewareSubscribers;
}