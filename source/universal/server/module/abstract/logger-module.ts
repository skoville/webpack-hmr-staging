import { AbstractServerModule } from "./module";
import { Log } from "@universal/shared/log";
import { ServerCommand } from "@universal/server/command-types";
export abstract class AbstractServerLoggerModule extends AbstractServerModule<[typeof ServerCommand.Log], []> {
    protected constructor() {
        super({
            [ServerCommand.Log]: request => this.handleLogEvent(request)
        });
    }
    public abstract async handleLogEvent(request: Log.Request): Promise<void>;
}