import {AbstractClientMessageTransporterModule} from '@universal/client/module/abstract/message-transporter-module';
import {AbstractClientModuleRegistry} from '@universal/client/module/abstract/module-registry';
import {NodeClientApplicationRestarter} from '@node/client/application-restarter';
import {NodeClientLoggerModule} from '@node/client/logger-module';

export class NodeClient extends AbstractClientModuleRegistry {
    protected constructor(transporter: AbstractClientMessageTransporterModule) {
        super(
            transporter,
            new NodeClientApplicationRestarter(),
            new NodeClientLoggerModule()
        );
    }
}

export {AbstractClientMessageTransporterModule} from '@universal/client/module/abstract/message-transporter-module';