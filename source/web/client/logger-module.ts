import { Log } from '@universal/shared/log';
import { AbstractClientLoggerModule } from "@universal/client/module/abstract/logger-module";
import ansicolor from 'ansicolor';

export class WebClientLoggerModule extends AbstractClientLoggerModule {
    public constructor() {
        super();
    }

    public async handleLogEvent(request: Log.Request) {
        console.log(...ansicolor.parse(request.contents).asChromeConsoleLogArguments);
    }
}