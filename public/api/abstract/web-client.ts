import { AbstractClientModuleRegistry } from "@universal/client/module/abstract/module-registry";
import { AbstractClientMessageTransporterModule } from "@universal/client/module/abstract/message-transporter-module";
import { WebClientApplicationRestarter } from '@web/client/application-restarter';
import { WebClientLoggerModule } from '@web/client/logger-module';

export class WebClient extends AbstractClientModuleRegistry {
    protected constructor(transporter: AbstractClientMessageTransporterModule) {
        super(
            transporter,
            new WebClientApplicationRestarter(),
            new WebClientLoggerModule()
        );
    }
}

export {AbstractClientMessageTransporterModule} from '@universal/client/module/abstract/message-transporter-module';