import * as webpack from 'webpack';
import { IClientConfiguration } from '@universal/shared/client-configuration';
import { CompilerManager } from './compiler-manager';

export interface PluginOptions {
    client: IClientConfiguration;
    memoryFS: boolean;
}

export class Plugin implements webpack.Plugin {
    private readonly id: string;
    private readonly options: PluginOptions;
    
    public constructor(id: string, options: PluginOptions) {
        const {registeredIds} = WebpackDevSecOps;
        if(registeredIds.indexOf(id) !== -1) {
            throw new Error(`Trying to register compiler with id=${id}, but there is already another compiler registered with that id.`);
        }
        registeredIds.push(id);
        this.id = id;
        this.options = options;
    }

    public apply(compiler: webpack.Compiler) {
        const {id, options} = this;
        const {client} = options;
        
        // Inject client configuration into bundle.
        new webpack.DefinePlugin({[nameof(SCOVILLE_OPTIONS)]: JSON.stringify(client)}).apply(compiler);

        if(client.enableHotModuleReloading) {
            // If there is no HotModuleReplacement plugin, throw error.
            if (compiler.options.plugins === undefined || !compiler.options.plugins.some(plugin => plugin instanceof webpack.HotModuleReplacementPlugin)) {
                throw new Error(`The ${nameof.full(client.enableApplicationRestarting)} option was set to true for compiler with id=${id}, but the webpack config does not contain an instance of ${nameof.full(webpack.HotModuleReplacementPlugin)}`);
            }
        }

        
        new CompilerManager(compiler, message => {
            messageSubscribers.forEach(async subscriber => {subscriber(id, message);});
        }, options);
    }

}