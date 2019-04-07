import * as webpack from 'webpack';
import MemoryFileSystem = require('memory-fs');
import * as path from 'path';
import * as fs from 'fs';
import {PluginOptions} from './plugin';
import {MessageType, Message} from '@universal/shared/api-model';

const PLUGIN_NAME = "WebpackDevSecOps";
type MessageHandler = (message:string) => void;
type FileSystem = typeof fs | MemoryFileSystem;

export class CompilerManager {
    private readonly compiler: webpack.Compiler;
    private readonly emitMessage: MessageHandler;
    private readonly fs: FileSystem;

    private valid: boolean;
    private compilationCallbacks: Function[];
    private latestUpdateMessage: string | null;

    public constructor(compiler: webpack.Compiler, onMessage: MessageHandler, options: PluginOptions) {
        if(options.memoryFS) {
            this.fs = new MemoryFileSystem();
            compiler.outputFileSystem = this.fs;
        } else {
            this.fs = fs;
        }
        this.compiler = compiler;
        this.emitMessage = onMessage;
        this.valid = false;
        this.compilationCallbacks = [];
        this.latestUpdateMessage = null;
        this.addHooks();
    }

    public getLatestUpdateMessage(): string | null {
        return this.latestUpdateMessage;
    }

    public async getReadStream(requestPath: string) {
        const fsPath = this.getFsPathFromRequestPath(requestPath);
        if(!fsPath) return false;
        // Don't stream the file until compilation is done.
        return await new Promise<fs.ReadStream | false>(resolve => {
            const attemptToRead = () => {
                this.fs.exists(fsPath, exists => {
                    if(exists) {
                        this.fs.stat(fsPath, (_err, stats) => {
                            if(stats.isFile()) {
                                log.info("File located. Returning ReadStream.");
                                resolve(this.fs.createReadStream(fsPath));
                            } else {
                                log.error("Path exists, but is not a file.");
                                resolve(false);
                            }
                        })
                    } else {
                        log.error("File does not exist.");
                        resolve(false);
                    }
                });
            };
            if(this.valid) attemptToRead();
            else this.compilationCallbacks.push(attemptToRead);
        });
    }

    private getFsPathFromRequestPath(requestPath: string) {
        if(requestPath.indexOf(this.publicPath) !== -1) {
            const outputPath = (this.compiler as any).outputPath;
            const adjustedPath = path.resolve(outputPath + '/' + (requestPath.substring(this.publicPath.length)));
            log.info("(publicPath: '" + this.publicPath + "', requestPath:'" + requestPath + "', compiler.outputPath:'" + outputPath + "') => '" + adjustedPath + "'");
            return adjustedPath;
        } else {
            log.error("Request path '" + requestPath + "' will not be served because it is not under webpack.config.output.publicPath of '" + this.publicPath + "'");
            return false;
        }
    }

    private get publicPath() {
        const {compiler} = this;
        const publicPath = (compiler.options.output && compiler.options.output.publicPath) || "/";
        return publicPath.endsWith("/") ? publicPath : publicPath + "/";
    }

    private addHooks() {
        this.compiler.hooks.compile.tap(PLUGIN_NAME, () => {console.log("inner compile hook");this.sendMessage({type:MessageType.Recompiling});});
        this.compiler.hooks.invalid.tap(PLUGIN_NAME, () => {console.log("inner invalid hook");this.invalidate();this.sendMessage({type:MessageType.Recompiling});});
        this.compiler.hooks.run.tap(PLUGIN_NAME, () => {console.log("inner run hook");this.invalidate()});
        this.compiler.hooks.watchRun.tap(PLUGIN_NAME, () => {console.log("inner watchRun hook");this.invalidate()});
        this.compiler.hooks.done.tap(PLUGIN_NAME, stats => {
            const {compilation} = stats;
            if(compilation.errors.length === 0 && Object.values(compilation.assets).every(asset => !(asset as any).emitted)) {
                this.sendMessage({type:MessageType.NoChange});
            } else {
                this.sendUpdateMessage(stats);
            }
            this.valid = true;
            // Consider doing the following after the nextTick, which is done in Webpack-Dev-Middleware
            const toStringOptions = this.compiler.options.stats;
            if (toStringOptions) {
                if (stats.hasErrors()) log.error(stats.toString(toStringOptions));
                else if (stats.hasWarnings()) log.warn(stats.toString(toStringOptions));
                else log.info(stats.toString(toStringOptions));
            }
            let message = 'Compiled successfully.';
            if (stats.hasErrors()) {
                message = 'Failed to compile.';
            } else if (stats.hasWarnings()) {
                message = 'Compiled with warnings.';
            }
            log.info(message);
            if(this.compilationCallbacks.length) {
                for(const callback of this.compilationCallbacks) {
                    callback();
                }
                this.compilationCallbacks = [];
            }
        });
    }

    private sendUpdateMessage(stats: webpack.Stats) {
        const statsJSON = stats.toJson({
            all: false,
            hash: false,
            assets: false,
            warnings: true,
            errors: true,
            errorDetails: false
        });
        if (stats.hash === undefined) {
            throw new Error("hash is undefined for webpack.Stats");
        }
        const updateMessage: Message = {
            type: MessageType.Update,
            data: {
                hash: stats.hash,
                publicPath: this.publicPath,
                assets: Object.keys(stats.compilation.assets),
                errors: statsJSON.errors,
                warnings: statsJSON.warnings
            }
        };
        this.sendMessage(updateMessage);
    }

    private sendMessage(message:Message) {
        const messageString = JSON.stringify(message);
        if(message.type === MessageType.Update) {
            this.latestUpdateMessage = messageString;
        }
        this.emitMessage(messageString);
    }

    private invalidate() {
        if(this.valid) log.info("Recompiling...");
        this.valid = false;
    }

}