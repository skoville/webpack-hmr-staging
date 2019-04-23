import { AbstractServerModule } from "./module";
import { ServerCommand, ReadFileRequest } from "@universal/server/command-types";
import { AbstractFileStream } from "@universal/server/abstract-file-stream";

export abstract class AbstractCompilerManagerModule extends AbstractServerModule<[typeof ServerCommand.ReadFile], [typeof ServerCommand.CompilerNotification]> {
    protected constructor() {
        super({
            [ServerCommand.ReadFile]: request => this.readFile(request)
        });
    }
    protected abstract async readFile(request: ReadFileRequest): Promise<AbstractFileStream>;
}