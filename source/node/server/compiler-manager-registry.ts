import {CompilerManager} from './compiler-manager';
import webpack = require('webpack');
import { PluginOptions } from './plugin';
import { TOOL_NAME } from '@universal/shared/tool-name';
import * as fs from 'fs';

export class CompilerManagerRegistry {
    private static readonly registeredCompilers = new Map<webpack.Compiler, string>();
    private static readonly registry: Record<string, CompilerManager> = {};

    public static registerCompiler(compiler: webpack.Compiler, options: PluginOptions) {
        if (this.registeredCompilers.has(compiler)) {
            throw new Error(`Detected multiple plugins being initialized for same compiler. You may apply no more than 1 ${TOOL_NAME} plugin instance to a compiler.`);
        }
        const manager = new CompilerManager(compiler, options);
        const id = manager.getId();
        this.registeredCompilers.set(compiler, id);
        new webpack.DefinePlugin({
            [nameof(CLIENT_CONFIGURATION_OPTIONS)]: JSON.stringify(options.client),
            [nameof(BUNDLE_ID)]: id
        }).apply(compiler);
        this.registry[id] = manager;
    }

    public static getCompilerManager(id: string) {
        if(!this.registry[id]) {
            throw new Error(`No such compiler manager with id=${id}.`);
        }
        return this.registry[id];
    }

    // TODO: remove this method and force the server to grab a specific CompilerManager. The problem with this is that
    // sometimes there are multiple compiler managers which will have the same asset. This shouldn't be a problem for the
    // hot update manifest and chunk files, as they contain unique hashes in their names, but this could be a problem
    // for cases like an index.html served by 2 web apps or perhaps if the bundle name for two apps is the same.
    // Therefore until we change or replace webpack's HMR plugin to gain control of the download logic, wich would
    // allow us to put the bundle id in GET request headers, we must ask that clients of this library ensure that no
    // two configurations being hot reloaded using the same server attempt to serve assets with the same name.
    public static async getReadStream(requestPath: string) {
        const readStreamPromises: Promise<fs.ReadStream|false>[] = [];
        for(const compilerId in this.registry) {
            const compilerManager = this.registry[compilerId];
            readStreamPromises.push(compilerManager.getReadStream(requestPath));
        }
        const readStreams = await Promise.all(readStreamPromises);
        let readStreamToReturn: fs.ReadStream | undefined; 
        for(const possibleReadStream of readStreams) {
            if (possibleReadStream !== false) {
                // since it is not false, it is an actual ReadStream.
                if (readStreamToReturn !== undefined) {
                    // More than one compiler has a file which matches this requestPath, so we don't know which one to choose.
                    // In the future once we are able to send the bundle id as part of the GET request header, then it won't matter
                    // if two compilers have the same file, because all requests will be scoped to a specific bundle.
                    throw new Error(`More than one compiler contains a file which matches the path of '${requestPath}'.`);
                }
                readStreamToReturn = possibleReadStream;
            }
        }
        if (readStreamToReturn === undefined) {
            throw new Error(`There are no compilers which contain the file at path '${requestPath}'.`);
        }
        return readStreamToReturn;
    }

    private constructor() {}
}