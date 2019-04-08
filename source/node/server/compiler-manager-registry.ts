import {CompilerManager} from './compiler-manager';
import {ReadStream} from 'fs';
import webpack = require('webpack');

type MessageSubscriber = (id: string, message: string) => void;

export class CompilerManagerRegistry {
    private static readonly messageSubscribers: MessageSubscriber[] = [];
    private static readonly registry: Record<string, CompilerManager> = {};
    private static readonly registeredIds: string[] = [];

    public static registerCompilerManager(compiler: webpack.Compiler) {
        const id = '';
        this.registry[id] = new CompilerManager(compiler, message => {
            this.messageSubscribers.forEach(async subscriber => {subscriber(id, message);});
        }, options);
         = compiler;
    }

    public static subscribeToMessages(subscriber: MessageSubscriber) {
        const {messageSubscribers} = CompilerManagerRegistry;
        messageSubscribers.push(subscriber);
        return function unsubscribe() {
            const index = messageSubscribers.indexOf(subscriber);
            if(index !== -1) messageSubscribers.splice(index, 1);
        }
    }

    public static async getReadStream(id: string, requestPath: string): Promise<ReadStream | false> {
        CompilerManagerRegistry.ensureCompilerExists(id, "get ReadStream");
        return await CompilerManagerRegistry.registry[id].getReadStream(requestPath);
    }

    public static getLatestUpdateMessage(id: string) {
        CompilerManagerRegistry.ensureCompilerExists(id, "get the latest update message");
        return CompilerManagerRegistry.registry[id].getLatestUpdateMessage();
    }

    public static getUpdateStrategyMessage(id: string) {
        CompilerManagerRegistry.ensureCompilerExists(id, "get the update strategy message");
        return CompilerManagerRegistry.registry[id].getUpdateStrategyMessage();
    }

    private static ensureCompilerExists(id: string, tryingTo: string) {
        const {registry} = CompilerManagerRegistry;
        if(!registry[id]) {
            throw new Error(`Trying to ${tryingTo} from compiler registered with id=${id}, but no compiler is registered with that id.`);
        }
    }

    private constructor() {}
}