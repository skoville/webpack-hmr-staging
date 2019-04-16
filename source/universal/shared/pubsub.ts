type Subscriber<T> = (publishedValue: T) => Promise<void>;
export class PubSub<T> {
    private readonly subscribers: Set<Subscriber<T>>;
    private readonly subscriberTypeName: string;
    public constructor(subscriberTypeName = "function") {
        this.subscribers = new Set();
        this.subscriberTypeName = subscriberTypeName;
    }
    public subscribe(subscriber: Subscriber<T>) {
        if(this.subscribers.has(subscriber)) {
            throw new Error(`Trying to subscribe a ${this.subscriberTypeName} that is already subscribed.`);
        }
        this.subscribers.add(subscriber);
        return () => {
            if (!this.subscribers.has(subscriber)) {
                throw new Error(`Trying to unsubscribe a ${this.subscriberTypeName} that is not subscribed.`);
            }
        }
    }
    public async publish(value: T) {
        const runningSubscriberPromises = Array.from(this.subscribers.entries())
            .map(setEntry => setEntry[1]) // An entry is a key value pair. In a Map, entries are keys and values of the Map.
                                          // In a Set, the key and the value of the entry are the same object.
                                          // In this case I will get the value becuase I feel like it, but either would have been fine.
                                          // Index 0 = key, index 1 = value.
            .map(async subscriber => await subscriber(value));
        await Promise.all(runningSubscriberPromises);
    }
}