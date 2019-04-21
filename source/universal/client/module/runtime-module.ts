/*globals __webpack_hash__*/

import { MessageType, Message } from '@universal/shared/api-model';
import { ClientEvent } from '../event';
import { AbstractClientModule } from './abstract/module';
import { Log } from '@universal/shared/log';
import { injectedClientConfiguration } from '../injected-client-configuration';

export class ClientRuntime extends AbstractClientModule<[typeof ClientEvent.HandleMessage], [typeof ClientEvent.RestartApplication]> {

    private currentHash?: string;
    private readonly hotEnabled: boolean;
    private readonly restartingEnabled: boolean;
    private readonly hotSwappingRuntime?: HotSwapRuntime;

    public constructor() {
        super({
            [ClientEvent.HandleMessage]: async message => {
                this.handleMessage(message);
            }
        }, "[SWP] ");
        const { enableHotModuleReloading, enableApplicationRestarting } = injectedClientConfiguration;
        this.hotEnabled = enableHotModuleReloading;
        this.restartingEnabled = enableApplicationRestarting;
        if (this.hotEnabled !== (module.hot !== undefined)) {
            throw new Error(`hot swapping is ${this.hotEnabled ? 'enabled' : 'disabled'}, but webpack's module.hot is${module.hot === undefined ? ' not ' : ' '}defined.`);
        }
        if(module.hot) {
            this.hotSwappingRuntime = new HotSwapRuntime(this, module.hot, this.log);
        }
    }

    public async startOrPromptAppRestart() {
        if(this.restartingEnabled) {
            this.log.info("Restarting...");
            await this.excuteCommand(ClientEvent.RestartApplication, undefined);
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
            case MessageType.Update:
                const firstHash = !this.currentHash;
                this.currentHash = message.data.hash;
                if(message.data.errors.length > 0) {
                    this.log.error('Errors while compiling. App Hot-Swap/Restart prevented.');
                    message.data.errors.forEach(error => {this.log.info(error)}); // should already have some ansi error coloring inside.
                } else {
                    if (message.data.warnings.length > 0) {
                        this.log.warn('Warnings while compiling.');
                        message.data.warnings.forEach(strippedWarning => {this.log.info(strippedWarning)}); // should already have some ansi warning coloring inside.
                    }
                    if(!firstHash) this.hotSwapOrRestart();
                }
                break;
            // I don't currently have the server sending this for any reason.
            // It could be used by others trying to extend the functionality themselves.
            case MessageType.ForceRestart:
                this.log.info(`"${message.data.reason}". App Restarting...`);
                this.startOrPromptAppRestart();
                break;
        }
    }

    private hotSwapOrRestart() {
        if(this.hotEnabled && this.hotSwappingRuntime) {
            this.log.info('App updated. Hot Swapping...');
            this.hotSwappingRuntime.hotSwap(this.currentHash);
        } else if(this.restartingEnabled) {
            this.log.info('App updated. Restarting...');
            this.startOrPromptAppRestart();
        } else {
            this.log.info('App updated, but Hot Swapping and Restarting are disabled.');
        }
    }

}

class HotSwapRuntime {
    private lastHash?: string;
    private clientRuntime: ClientRuntime;
    private hot: __WebpackModuleApi.Hot;
    private log: Log.Logger;

    public constructor(clientRuntime: ClientRuntime, hot: __WebpackModuleApi.Hot, log: Log.Logger) {
        this.clientRuntime = clientRuntime;
        this.hot = hot;
        this.log = log.clone("[HMR] ");
        this.log.info("Waiting for update signal from SWP...");
    }

    public hotSwap(hash?: string) {
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
                    this.clientRuntime.startOrPromptAppRestart();
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
                this.clientRuntime.startOrPromptAppRestart();
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
                    this.clientRuntime.startOrPromptAppRestart();
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