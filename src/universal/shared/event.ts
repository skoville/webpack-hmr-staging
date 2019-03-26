type UnsubscribeFunction = () => void;
export type EventHandler<EventPayload> = (eventPayload: EventPayload) => Promise<void>;
export class Event<EventPayload extends any> {
    private readonly sortedSubscriptionIds: number[];
    private readonly subscribers: Record<number, EventHandler<EventPayload>>;
    private readonly onAfterSubscribersRunPromise: Promise<EventHandler<EventPayload>>;

    public constructor(onAfterSubscribersRun: Promise<EventHandler<EventPayload>>) {
        this.sortedSubscriptionIds = [];
        this.subscribers = {};
        this.onAfterSubscribersRunPromise = onAfterSubscribersRun;
    }

    public get publisher() {
        return (async () =>
            new Event.Publisher<EventPayload>(this, await this.onAfterSubscribersRunPromise)
        )();
    }

    public static readonly Publisher = class Publisher<EventPayload extends any> {
        private readonly event: Event<EventPayload>;
        private readonly postMiddlewareFunction: EventHandler<EventPayload>;

        public constructor(event: Event<EventPayload>, postMiddlewareFunction: EventHandler<EventPayload>) {
            this.event = event;
            this.postMiddlewareFunction = postMiddlewareFunction;
        }

        public async publish(eventPayload: EventPayload) {
            const runningHandlers = this.event.sortedSubscriptionIds
                .map(subscriptionId => this.event.subscribers[subscriptionId](eventPayload));
            await Promise.all(runningHandlers);
            await this.postMiddlewareFunction(eventPayload);
        }
    }

    public get subscriber() {
        return (async () => {
            await this.onAfterSubscribersRunPromise;
            return new Event.Subscriber<EventPayload>(this);
        })();
    }

    public static readonly Subscriber = class Subscriber<EventPayload extends any> {
        private readonly event: Event<EventPayload>;

        public constructor(event: Event<EventPayload>) {
            this.event = event;
        }

        public subscribeMiddleware(eventHandler: EventHandler<EventPayload>): UnsubscribeFunction {
            const highestActiveSubscriptionId = this.event.sortedSubscriptionIds[this.event.sortedSubscriptionIds.length - 1];
            const newSubscriptionId = highestActiveSubscriptionId + 1;
            this.event.subscribers[newSubscriptionId] = eventHandler;
            this.event.sortedSubscriptionIds.push(newSubscriptionId);
            return () => {
                const eventHandlerIdIndex = this.event.sortedSubscriptionIds.indexOf(newSubscriptionId);
                if (eventHandlerIdIndex === -1) {
                    throw new Error("Trying to unsubscribe an event handler that has already been unsubscribed");
                }
                this.event.sortedSubscriptionIds.splice(eventHandlerIdIndex, 1);
                delete this.event.subscribers[newSubscriptionId];
            }
        }
    }
}