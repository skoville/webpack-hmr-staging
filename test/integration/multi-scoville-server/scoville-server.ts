import * as path from 'path';
import { ScovilleWebpackPlugin } from 'scoville-webpack/plugin';
import { DefaultNodeJSScovilleServer } from 'scoville-webpack/default/node-server';
import * as webpack from 'webpack';
import * as projectPackageJSON from '../../../package.json';
import * as integrationTestPackageJSON from '../package.json';
import { deletePathAsync } from '../../../source/node/shared/delete-path-async';

const scovillePlugin = new ScovilleWebpackPlugin({
    client: {
        url: "http://localhost:8080",
        enableApplicationRestarting: true,
        enableHotModuleReloading: true
    },
    server: new DefaultNodeJSScovilleServer(true, 8080)
});

const INTEGRATION_TEST_PATH = path.resolve(__dirname, "../");
const NODE_INTEG_TEST_PATH = path.resolve(INTEGRATION_TEST_PATH, "./node");
const WEB_INTEG_TEST_PATH = path.resolve(INTEGRATION_TEST_PATH, "./web");
const OUTPUT_INTEG_TEST_PATH = path.resolve(INTEGRATION_TEST_PATH, "./output");

const dependencies = new Set([...Object.keys(projectPackageJSON.dependencies), ...Object.keys(integrationTestPackageJSON)]);

export const configs: webpack.Configuration[] = [
    {
        mode: 'development',
        entry: path.resolve(NODE_INTEG_TEST_PATH, './server.ts'),
        externals: (context, request, callback: (err?: any, val?: string, type?: 'commonjs') => void) => {
            const baseDependency = request.split("/")[0]
            if (dependencies.has(baseDependency)) {
                callback(null, request, 'commonjs'); // This externalizes the module
            } else {
                if ((request.includes("node_modules") || context.includes("node_modules"))) {
                    console.log("bundling node_modules file due to explicit reference from source.");
                    console.log("request = " + request);
                    console.log("context = " + context);
                    console.log();
                }
                callback(); // This includes the module in the bundle.
            }
        },
        target: 'node',
        plugins: [
            scovillePlugin,
            new webpack.HotModuleReplacementPlugin()
        ],
        output: {
            path: OUTPUT_INTEG_TEST_PATH,
            filename: 'server.js'
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: {
                        loader: 'ts-loader',
                        options: {
                            configFile: path.resolve(NODE_INTEG_TEST_PATH, "./tsconfig.json")
                        }
                    }
                }
            ]
        },
        resolve: {
            extensions: ['.ts']
        }
    },
    {
        mode: 'development',
        entry: [
            path.resolve(WEB_INTEG_TEST_PATH, "./client.ts"),
            "scoville-webpack/default/web-client.js"
        ],
        target: 'web',
        plugins: [
            scovillePlugin,
            new webpack.HotModuleReplacementPlugin()
        ],
        output: {
            path: OUTPUT_INTEG_TEST_PATH,
            filename: 'client.js'
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: {
                        loader: 'ts-loader',
                        options: {
                            configFile: path.resolve(WEB_INTEG_TEST_PATH, './tsconfig.json')
                        }
                    }
                }
            ]
        },
        resolve: {
            extensions: ['.ts']
        }
    }
];

async function start() {
    await deletePathAsync(OUTPUT_INTEG_TEST_PATH);
    webpack(configs).watch({}, async (error: Error, stats: webpack.Stats) => {
        console.log("run output");
    });
}

start();