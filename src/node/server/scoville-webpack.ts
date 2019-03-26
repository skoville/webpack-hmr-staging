import {CompilerManager} from './compiler-manager';
import {ReadStream} from 'fs';



type MessageSubscriber = (id: string, message: string) => void;

export class WebpackDevSecOps {

    private static readonly messageSubscribers: MessageSubscriber[] = [];
    private static readonly registry: Record<string, CompilerManager> = {};
    private static readonly registeredIds: string[] = [];

    
    public static subscribeToMessages(subscriber: MessageSubscriber) {
        const {messageSubscribers} = WebpackDevSecOps;
        messageSubscribers.push(subscriber);
        return function unsubscribe() {
            const index = messageSubscribers.indexOf(subscriber);
            if(index !== -1) messageSubscribers.splice(index, 1);
        }
    }

    public static async getReadStream(id: string, requestPath: string): Promise<ReadStream | false> {
        WebpackDevSecOps.ensureCompilerExists(id, "get ReadStream");
        return await WebpackDevSecOps.registry[id].getReadStream(requestPath);
    }

    public static getLatestUpdateMessage(id: string) {
        WebpackDevSecOps.ensureCompilerExists(id, "get the latest update message");
        return WebpackDevSecOps.registry[id].getLatestUpdateMessage();
    }

    public static getUpdateStrategyMessage(id: string) {
        WebpackDevSecOps.ensureCompilerExists(id, "get the update strategy message");
        return WebpackDevSecOps.registry[id].getUpdateStrategyMessage();
    }

    private static ensureCompilerExists(id: string, tryingTo: string) {
        const {registry} = WebpackDevSecOps;
        if(!registry[id]) {
            throw new Error(`Trying to ${tryingTo} from compiler registered with id=${id}, but no compiler is registered with that id.`);
        }
    }

    private constructor() {}
}