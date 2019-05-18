import * as path from 'path';
import { ScovilleWebpackPlugin } from 'scoville-webpack/plugin';
import { DefaultNodeJSScovilleServer } from 'scoville-webpack/default/node-server';
import * as webpack from 'webpack';
import * as fs from 'fs';
import { promisify } from 'util';

const scovillePlugin = new ScovilleWebpackPlugin({
    client: {
        url: "http://localhost:8080",
        enableApplicationRestarting: true,
        enableHotModuleReloading: true
    },
    server: new DefaultNodeJSScovilleServer(true, 8080)
});

const INTEGRATION_TEST_PATH = path.resolve(
    __dirname,
    "../");
const NODE_INTEG_TEST_PATH = path.resolve(INTEGRATION_TEST_PATH, "./node");
const WEB_INTEG_TEST_PATH = path.resolve(INTEGRATION_TEST_PATH, "./web");
const OUTPUT_INTEG_TEST_PATH = path.resolve(INTEGRATION_TEST_PATH, "./output");

export const configs: webpack.Configuration[] = [
    {
        entry: path.resolve(NODE_INTEG_TEST_PATH, './server.ts'),
        target: 'node',
        plugins: [scovillePlugin],
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
    },
    {
        plugins: [scovillePlugin]
    }
];

const fsAsync = {
    deleteDirectory: promisify(fs.rmdir),
    exists: promisify(fs.exists)
};

async function start() {
    if (await fsAsync.exists(OUTPUT_INTEG_TEST_PATH)) {
        await fsAsync.deleteDirectory(OUTPUT_INTEG_TEST_PATH);
    }
    webpack(configs).watch({}, async (error: Error, stats: webpack.Stats) => {
        console.log("run output");
    });
}

start();