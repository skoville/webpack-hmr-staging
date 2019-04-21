import {AbstractModule, CommandExecutorImplementations} from '@universal/shared/abstract/module';
import { ClientEvent } from '../../event';
import { Log } from '@universal/shared/log';

export abstract class AbstractClientModule<HandledCommands extends (keyof ClientEvent.Payload)[], IssuableCommands extends (keyof ClientEvent.Payload)[]>
    extends AbstractModule<ClientEvent.Payload, HandledCommands, [typeof ClientEvent.Log] | IssuableCommands> {
    // Some of this could have been moved to AbstractModule to reduce duplicated logic in AbstractClientModule and AbstractServerModule,
    // this would couple AbstractModule together with logging, which is a no-no because AbstractModule will eventually be moved into its own library.
    // We can come up with another abstraction layer once that happens.
    protected readonly log: Log.Logger;
    protected constructor(executors: CommandExecutorImplementations<ClientEvent.Payload, HandledCommands>, logPrefix?: string) {
        super(executors);
        this.log = new Log.Logger(async logRequest => {
            await this.excuteCommand(ClientEvent.Log, logRequest)
        }, logPrefix);
    }
}