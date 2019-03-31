import { AbstractClientModule } from "./module";
import { Log } from "@universal/shared/log";
export abstract class AbstractClientLogger extends AbstractClientModule {
    public abstract async handleLogEvent(request: Log.Request): Promise<void>;
}