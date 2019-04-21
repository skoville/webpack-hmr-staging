import { Message } from "@universal/shared/api-model";
import { Log } from "@universal/shared/log";

export namespace ClientEvent {
    // Define all possible events.
    export const RestartApplication = Symbol("restart application");
    export const HandleMessage = Symbol("handle message");
    export const SendMessage = Symbol("send message");
    export const Log = Symbol("log message");
    // Map each possible event to a corresponding event payload.
    // An event payload is the data required to handle an event.
    export interface Payload {
        [RestartApplication]: [void, void];
        [HandleMessage]: [Message, void];
        [SendMessage]: [string, void];
        [Log]: [Log.Request, void];
    }
}