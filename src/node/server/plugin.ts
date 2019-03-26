import * as webpack from 'webpack';

export interface PluginOptions {
    hot: boolean;
    restarting: boolean;
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
        const {registry, messageSubscribers} = WebpackDevSecOps;
        const {id, options} = this;
        if(options.hot) {
            // If there is no HotModuleReplacement plugin, throw error.
            if (compiler.options.plugins === undefined || !compiler.options.plugins.some(plugin => plugin instanceof webpack.HotModuleReplacementPlugin)) {
                throw new Error(`The "hot" option was set to true for compiler with id=${id}, but the webpack config does not contain an instance of webpack.HotModuleReplacementPlugin`);
            }
        }
        registry[id] = new CompilerManager(compiler, message => {
            messageSubscribers.forEach(async subscriber => {subscriber(id, message);});
        }, options);
    }

}
