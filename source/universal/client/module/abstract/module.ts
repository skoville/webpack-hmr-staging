import {AbstractModule, CommandExecutorImplementations} from '@universal/shared/abstract/module';
import { ClientCommand } from '../../command-types';
import { Log } from '@universal/shared/log';

export abstract class AbstractClientModule<HandledCommands extends (keyof ClientCommand.Types)[], IssuableCommands extends (keyof ClientCommand.Types)[]>
    extends AbstractModule<ClientCommand.Types, HandledCommands, [typeof ClientCommand.Log] | IssuableCommands> {
    // Some of this could have been moved to AbstractModule to reduce duplicated logic in AbstractClientModule and AbstractServerModule,
    // this would couple AbstractModule together with logging, which is a no-no because AbstractModule will eventually be moved into its own library.
    // We can come up with another abstraction layer once that happens.
    protected readonly log: Log.Logger;
    protected constructor(executors: CommandExecutorImplementations<ClientCommand.Types, HandledCommands>, logPrefix?: string) {
        super(executors);
        this.log = new Log.Logger(
            logRequest => this.excuteCommand(ClientCommand.Log, logRequest),
            logPrefix
        );
    }
}