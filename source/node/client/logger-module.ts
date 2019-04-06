import { Log } from "@universal/shared/log";
import { AbstractClientLoggerModule } from "@universal/client/module/abstract/logger-module";

export class NodeClientLoggerModule extends AbstractClientLoggerModule {
    public constructor() {
        super();
    }
    public async handleLogEvent(request: Log.Request) {
        console.log(request.contents);
    }
}