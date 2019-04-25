import { AbstractClientModuleRegistry } from '@universal/client/module/abstract/module-registry';
import { WebClientApplicationRestarterModule } from "./application-restarter-module";
import { WebClientLoggerModule } from './logger-module';
import { AbstractClientMessageTransporterModule } from '@universal/client/module/abstract/message-transporter-module';

export class WebClientModuleRegistry extends AbstractClientModuleRegistry {
    public constructor(transporter: AbstractClientMessageTransporterModule) {
        super(
            transporter,
            new WebClientApplicationRestarterModule(),
            new WebClientLoggerModule());
    }
}