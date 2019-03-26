import {TOOL_NAME} from './tool-name';

export const SOCKET_MESSAGE_EVENT_NAME = `${TOOL_NAME.toLowerCase()}-message`;

export type Message = 
    {   type: MessageType.Recompiling } |
    {   type: MessageType.NoChange } |
    {   type: MessageType.Update;
        data: {
            hash: string;
            errors: string[];
            warnings: string[];
            publicPath: string;
            assets: string[];
        }
    } |
    {   type: MessageType.UpdateStrategy;
        data: {
            hot: boolean;
            restarting: boolean;
        }
    } |
    {   type: MessageType.ForceRestart;
        data: {
            reason: string;
        }
    };

export enum MessageType {
    Recompiling = 'recompiling',
    NoChange = 'no-change',
    Update = 'update',
    UpdateStrategy = 'update-strategy',
    ForceRestart = 'force-restart'
}