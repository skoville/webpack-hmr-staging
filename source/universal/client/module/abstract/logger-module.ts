import { AbstractClientModule } from "./module";
import { Log } from "@universal/shared/log";
import { ClientEvent } from "@universal/client/event";
export abstract class AbstractClientLoggerModule extends AbstractClientModule<[typeof ClientEvent.Log], []> {
    protected constructor() {
        super({
            [ClientEvent.Log]: async request => {
                await this.handleLogEvent(request);
            }
        });
    }
    public abstract async handleLogEvent(request: Log.Request): Promise<void>;
}