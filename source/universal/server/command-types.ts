import { Log } from "@universal/shared/log";
import { CompilerNotification } from "@universal/shared/api-model";
import { AbstractFileStream } from "./abstract-file-stream";

export type ReadFileRequest = {
    // TODO: add in a compiler id once we have more control over GET requests issued from HotModuleReplacementPlugin
    path: string;
};

export namespace ServerCommand {
    // TODO: add the foollowing two commands in once we are ready to begin development on dashboard.
    // export const ClientUpdate = Symbol("");
    // export const ServerUpdate = Symbol("");

    export const Log = Symbol("log message");
    export const CompilerNotification = Symbol("compiler notification");
    export const ReadFile = Symbol("read file")

    export interface Types {
        [Log]: [Log.Request, void];
        [CompilerNotification]: [CompilerNotification.Body, void];
        [ReadFile]: [ReadFileRequest, AbstractFileStream];
    }
}