import { AbstractServerModule } from "./module";
import { ServerCommand, ReadFileRequest } from "@universal/server/command-types";
import { AbstractFileStream } from "@universal/server/abstract-file-stream";
import { CompilerNotification } from "@universal/shared/api-model";

export abstract class AbstractCompilerManagerModule extends AbstractServerModule<[typeof ServerCommand.ReadFile, typeof ServerCommand.GetLastCompilerUpdateNotification], [typeof ServerCommand.CompilerNotification]> {
    protected constructor() {
        super({
            [ServerCommand.ReadFile]: request => this.readFile(request),
            [ServerCommand.GetLastCompilerUpdateNotification]: compilerId => this.getLastCompilerUpdateNotification(compilerId)
        });
    }
    protected abstract async readFile(request: ReadFileRequest): Promise<AbstractFileStream>;
    protected abstract async getLastCompilerUpdateNotification(compilerId: string): Promise<CompilerNotification.Body|undefined>;
}