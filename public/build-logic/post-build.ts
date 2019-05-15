import * as webpack from 'webpack'; // This is implicitly defining the node modules and supplying the node types...
import { DISTRIBUTION_DIRECTORY } from "./paths";
import { fsAsync, prettyPrintJSON } from './util';
import * as packagejson from '../../package.json';
import * as path from 'path';

webpack;

async function postBuild() {
    // Create tsconfig
    await fsAsync.writeFile(path.resolve(DISTRIBUTION_DIRECTORY, "tsconfig.json"), prettyPrintJSON({
        extends: "../tsconfig-base",
        compilerOptions: {
            /* Module Resolution */
            baseUrl: "./",
            paths: {
                [`${packagejson.name}/*`]: ["*"]
            },
        }
    }));
    
    // Rename tarball to remove version from end.
    const tarballVersionSuffix = "-" + packagejson.version;
    const currentTarballPath = path.resolve(DISTRIBUTION_DIRECTORY, packagejson.name + tarballVersionSuffix + ".tgz");
    const destinationTarballPath = currentTarballPath.replace(tarballVersionSuffix, "");
    await fsAsync.rename(currentTarballPath, destinationTarballPath);
    
}

postBuild();