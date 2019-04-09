import {CompilerManager} from './compiler-manager';
import webpack = require('webpack');
import { PluginOptions } from './plugin';
import { TOOL_NAME } from '@universal/shared/tool-name';

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

    private constructor() {}
}