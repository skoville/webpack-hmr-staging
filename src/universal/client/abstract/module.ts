import {AbstractModule} from '@universal/shared/abstract/module';
import { ClientEvent } from '../event';
import { AbstractModuleRegistry } from '@universal/shared/abstract/module-registry';
import { Log } from '@universal/shared/log';
export abstract class AbstractClientModule extends AbstractModule<ClientEvent.Payload> {
    // Some of this could have been moved to AbstractModule to reduce duplicated logic in AbstractClientModule and AbstractServerModule,
    // this would couple AbstractModule together with logging, which is a no-no because AbstractModule will eventually be moved into its own library.
    // We can come up with another abstraction layer once that happens.
    protected readonly log: Log.Logger;
    protected constructor(logPrefix?: string) {
        super();
        this.log = new Log.Logger(this.forwardLogRequest.bind(this), logPrefix);
    }
    private async forwardLogRequest(logRequest: Log.Request) {await this[ClientEvent.Log](logRequest)}
    @AbstractModuleRegistry.EventTrigger
    private async [ClientEvent.Log](logRequest: Log.Request){return logRequest;}
}