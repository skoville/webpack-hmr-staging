import { AbstractClientModule } from "./module";
import { Log } from "@universal/shared/log";
import { ClientCommand } from "@universal/client/command-types";
export abstract class AbstractClientLoggerModule extends AbstractClientModule<[typeof ClientCommand.Log], []> {
    protected constructor() {
        super({
            [ClientCommand.Log]: request => this.handleLogEvent(request)
        });
    }
    protected abstract async handleLogEvent(request: Log.Request): Promise<void>;
}