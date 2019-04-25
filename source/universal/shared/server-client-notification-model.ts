import {TOOL_NAME} from './tool-name';

export const SOCKET_MESSAGE_EVENT_NAME = `${TOOL_NAME.toLowerCase()}-message`;

export namespace CompilerNotification {
    export enum Type {
        Recompiling = 'recompiling',
        NoChange = 'no-change',
        Update = 'update',
        ForceRestart = 'force-restart'
    }
    export type Body =
    {   type: Type.Recompiling } |
    {   type: Type.NoChange } |
    {   type: Type.Update;
        data: {
            hash: string;
            errors: string[];
            warnings: string[];
            publicPath: string;
            assets: string[];
        }
    } |
    {   type: Type.ForceRestart;
        data: {
            reason: string;
        }
    };
}