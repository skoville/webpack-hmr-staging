import { ServerCommand } from "@universal/server/command-types";
import { AbstractModule, CommandExecutorImplementations } from "@universal/shared/abstract-module";
import { Log } from "@universal/shared/log";

export abstract class AbstractServerModule<HandledCommands extends (keyof ServerCommand.Types)[], IssuableCommands extends (keyof ServerCommand.Types)[]>
    extends AbstractModule<ServerCommand.Types, HandledCommands, [typeof ServerCommand.Log] | IssuableCommands> {
    // Some of this could have been moved to AbstractModule to reduce duplicated logic in AbstractClientModule and AbstractServerModule,
    // this would couple AbstractModule together with logging, which is a no-no because AbstractModule will eventually be moved into its own library.
    // We can come up with another abstraction layer once that happens.
    protected readonly log: Log.Logger;
    protected constructor(executors: CommandExecutorImplementations<ServerCommand.Types, HandledCommands>, logPrefix?: string) {
        super(executors);
        this.log = new Log.Logger(
            logRequest => this.excuteCommand(ServerCommand.Log, logRequest), 
            logPrefix
        );
    }
}