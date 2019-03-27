/*globals __webpack_hash__*/

import stripAnsi from 'strip-ansi';
import * as Logger from 'js-logger';
import { MessageType, Message } from '@universal/shared/api-model';
import { ILogger } from 'js-logger/src/types';
import { ClientEventRegistry, ClientEventName } from './event-registry';

Logger.useDefaults();
Logger.setHandler(
    Logger.createDefaultHandler({
        formatter: (messages, context) => {
            switch(context.name) {
                case ClientRuntime.name:
                    messages.unshift("[SWP] ");
                    break;
                case HotSwapRuntime.name:
                    messages.unshift("[HMR] ");
                    break;
            }
        }
    })
);

export class ClientRuntime {
    private currentHash: string;
    private hotEnabled: boolean;
    private restartingEnabled: boolean;
    private log: ILogger;
    private hotSwappingRuntime: HotSwapRuntime;

    public constructor() {
        this.log = Logger.get(ClientRuntime.name);
        if(module.hot) {
            this.hotSwappingRuntime = new HotSwapRuntime(this, module.hot);
        }
        const eventRegistry = ClientEventRegistry.getInstance();
        eventRegistry.resolvePostMiddlewareEventHandler(ClientEventName.HandleMessage, this.handleMessage.bind(this));
    }

    private async triggerRestartApplicationEvent() {
        const eventRegistry = ClientEventRegistry.getInstance();
        const publishers = await eventRegistry.eventPublishers;
        await publishers[ClientEventName.RestartApplication].publish();
    }

    public async restartApplication() {
        if(this.restartingEnabled) {
            this.log.info("Restarting...");
            await this.triggerRestartApplicationEvent();
        } else {
            this.log.error("Manual Restart required.");
        }
    }

    public async handleMessage(message: Message) {
        switch(message.type) {
            case MessageType.NoChange:
                this.log.info('Nothing changed.');
                break;
            case MessageType.Recompiling:
                this.log.info('Source changed. Recompiling...');
                break;
            case MessageType.UpdateStrategy:
                this.hotEnabled = message.data.hot;
                if(this.hotEnabled) {
                    if(module.hot) {
                        this.log.info(`App Hot-Swapping enabled.`);
                    } else {
                        this.log.error(`Unable to enable App Hot-Swapping, because HMR Plugin is not loaded.`);
                        this.hotEnabled = false;
                    }
                } else {
                    this.log.info('App Hot-Swapping disabled.')
                }
                this.restartingEnabled = message.data.restarting;
                this.log.info(`App Restarting ${this.restartingEnabled ? 'enabled' : 'disabled'}.`);
                break;
            case MessageType.Update:
                const firstHash = !this.currentHash;
                this.currentHash = message.data.hash;
                if(message.data.errors.length > 0) {
                    this.log.error('Errors while compiling. App Hot-Swap/Restart prevented.');
                    message.data.errors
                        .map(error => stripAnsi(error))
                        .forEach(error => {this.log.error(error)});
                } else {
                    if (message.data.warnings.length > 0) {
                        this.log.warn('Warnings while compiling.');
                        message.data.warnings
                            .map(warning => stripAnsi(warning))
                            .forEach(strippedWarning => {this.log.warn(strippedWarning)});
                    }
                    if(!firstHash) this.hotSwapOrRestart();
                }
                break;
            // I don't currently have the server sending this for any reason.
            // It could be used by others trying to extend the functionality themselves.
            case MessageType.ForceRestart:
                this.log.info(`"${message.data.reason}". App Restarting...`);
                this.restartApplication();
                break;
            default:
                this.log.error(`Received an unsupported message: "${messageString}".`);
        }
    }

    private hotSwapOrRestart() {
        if(this.hotEnabled) {
            this.log.info('App updated. Hot Swapping...');
            this.hotSwappingRuntime.hotSwap(this.currentHash);
        } else if(this.restartingEnabled) {
            this.log.info('App updated. Restarting...');
            this.restartApplication();
        } else {
            this.log.info('App updated, but Hot Swapping and Restarting are disabled.');
        }
    }

}

class HotSwapRuntime {
    private lastHash?: string;
    private clientRuntime: ClientRuntime;
    private log: ILogger;
    private hot: __WebpackModuleApi.Hot;

    public constructor(clientRuntime: ClientRuntime, hot: __WebpackModuleApi.Hot) {
        this.log = Logger.get(HotSwapRuntime.name);
        this.clientRuntime = clientRuntime;
        this.hot = hot;
        this.log.info("Waiting for update signal from SWP...");
    }

    public hotSwap(hash: string) {
        this.lastHash = hash;
        if(!this.hashIsUpToDate()) {
            const hmrStatus = this.hot.status();
            switch(hmrStatus) {
                case "idle":
                    this.log.info("Checking for updates from the server...");
                    this.check();
                    break;
                case "abort":
                case "fail":
                    this.log.warn(`Cannot apply update as a previous update ${hmrStatus}ed. Need to do a full Restart!`);
                    this.clientRuntime.restartApplication();
                    break;
            }
        }
    }

    private hashIsUpToDate() {
        if (this.lastHash === undefined) return false;
        return this.lastHash.indexOf(__webpack_hash__) !== -1;
    }

    private async check() {
        try {
            // TODO: PR to hmr @types repo to include definition of module.hot.check that returns a promise so we don't have to use any
            const updatedModules: __WebpackModuleApi.ModuleId[] = await (this.hot as any).check(true);
            if(!updatedModules) {
                this.log.warn("Cannot find update. Need to do a full Restart!");
                this.log.warn("(Probably because of restarting the Scoville Webpack Server)");
                this.clientRuntime.restartApplication();
                return;
            }
            if(!this.hashIsUpToDate()) this.check();
            this.logHMRApplyResult(updatedModules);
            if(this.hashIsUpToDate()) {
                this.log.info("App is up to date.");
            }
        } catch(err) {
            const hmrStatus = this.hot.status();
            switch(hmrStatus) {
                case "abort":
                case "fail":
                    this.log.warn("Cannot apply updated. Need to do a full Restart!");
                    this.log.warn(err.stack || err.message);
                    this.clientRuntime.restartApplication();
                    break;
                default:
                    this.log.warn("Update failed: " + err.stack || err.message);
            }
        }
    }

    private logHMRApplyResult(updatedModules: __WebpackModuleApi.ModuleId[]) {
        if(updatedModules.length === 0) {
            this.log.info("Nothing hot updated.");
        } else {
            this.log.info("Updated modules:");
            updatedModules.forEach(moduleId => {
                if(typeof moduleId === "string" && moduleId.indexOf("!") !== -1) {
                    const parts = moduleId.split("!");
                    this.log.info(" - " + parts.pop());
                }
                this.log.info(" - " + moduleId);
            });
            if(updatedModules.every(moduleId => typeof moduleId === "number")) {
                this.log.info("Consider using the NamedModulesPlugin for module names.");
            }
        }
    }

}