type UnsubscribeFunction = () => void;
export type EventHandler<EventPayload, EventResponse> = (eventPayload: EventPayload) => Promise<EventResponse>;
export class Event<EventPayload, EventResponse> {
    private readonly sortedSubscriptionIds: number[];
    private readonly subscribers: Record<number, EventHandler<EventPayload>>;
    private readonly onAfterMiddleware: EventHandler<EventPayload>;

    public constructor(onAfterMiddleware: EventHandler<EventPayload>) {
        this.sortedSubscriptionIds = [];
        this.subscribers = {};
        this.onAfterMiddleware = onAfterMiddleware;
    }

    public async publish(eventPayload: EventPayload) {
        const runningHandlers = this.sortedSubscriptionIds
            .map(subscriptionId => this.subscribers[subscriptionId](eventPayload));
        await Promise.all(runningHandlers);
        await this.onAfterMiddleware(eventPayload);
    }

    public subscribeMiddleware(eventHandler: EventHandler<EventPayload>): UnsubscribeFunction {
        const highestActiveSubscriptionId = this.sortedSubscriptionIds[this.sortedSubscriptionIds.length - 1];
        const newSubscriptionId = highestActiveSubscriptionId + 1;
        this.subscribers[newSubscriptionId] = eventHandler;
        this.sortedSubscriptionIds.push(newSubscriptionId);
        return () => {
            const eventHandlerIdIndex = this.sortedSubscriptionIds.indexOf(newSubscriptionId);
            if (eventHandlerIdIndex === -1) {
                throw new Error("Trying to unsubscribe an event handler that has already been unsubscribed");
            }
            this.sortedSubscriptionIds.splice(eventHandlerIdIndex, 1);
            delete this.subscribers[newSubscriptionId];
        }
    }
}