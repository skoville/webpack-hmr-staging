import { AbstractClientModuleRegistry } from '@universal/client/module/abstract/module-registry';
import { AbstractClientMessageTransporterModule } from '@universal/client/module/abstract/message-transporter-module';
import { NodeClientApplicationRestarterModule } from './application-restarter-module';
import { NodeClientLoggerModule } from './logger-module';

export class NodeClientModuleRegistry extends AbstractClientModuleRegistry {
    public constructor(transporter: AbstractClientMessageTransporterModule) {
        super(
            transporter,
            new NodeClientApplicationRestarterModule(),
            new NodeClientLoggerModule()
        );
    }
}