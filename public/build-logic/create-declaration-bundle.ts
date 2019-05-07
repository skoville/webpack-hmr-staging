import webpack = require("webpack");
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from "util";
import { PROJECT_DIRECTORY, DISTRIBUTION_DIRECTORY } from "./paths";

const readDirAsync = promisify(fs.readdir);
const readFileAsync = promisify(fs.readFile);
const rmdirAsync = promisify(fs.rmdir);
const statAsync = promisify(fs.stat);
const unlinkAsync = promisify(fs.unlink);
const writeFileAsync = promisify(fs.writeFile);

const usedDeclarationFiles = new Set<string>();

// TODO: better to just import the json directly that this eval solution.
var tsconfigBase: any;
eval("tsconfigBase=" + (fs.readFileSync(path.resolve(PROJECT_DIRECTORY, "tsconfig-base.json"))).toString());
const desclarationsDir: string = path.resolve(PROJECT_DIRECTORY, tsconfigBase.compilerOptions.outDir);
// console.log("declarationsDir =", desclarationsDir);

// TODO import json directly
var tsconfigdistributionbase: any;
eval("tsconfigdistributionbase=" + (fs.readFileSync(path.resolve(PROJECT_DIRECTORY, "tsconfig-distribution-base.json"))).toString());
const moduleName: string = Object.keys(tsconfigdistributionbase.compilerOptions.paths)[0].split("/")[0];
// console.log("moduleName =", moduleName);

async function getRelativeImportPath(absoluteFrom: string, absoluteTo: string) {
    const fromStats = await statAsync(absoluteFrom);
    const fromFolder = fromStats.isFile() ? path.parse(absoluteFrom).dir : absoluteFrom;
    const result = path.relative(fromFolder, absoluteTo).replace(/\\/g, "/").replace(/.d.ts$/, "");
    return result;
}

/**
 * @param webpackConfig the webpack configuration for the bundle that was just generated.
 */
export async function generateDeclarationModuleText(webpackConfig: webpack.Configuration) {
    // Based on where the webpack entry file is, and by reading the outDir of the tsconfig base, we can determine the location of the entry's generated declaration file.
    const entry = webpackConfig.entry;
    if (typeof entry !== 'string') throw new Error("Currently only supports entry value as a string.");
    const webpackOutput = webpackConfig.output;
    if (webpackOutput === undefined) throw new Error("Webpack output configuration required.");
    const outputPath = webpackOutput.path;
    if (outputPath === undefined) throw new Error("Webpack output configuration path parameter required.");
    const outputFilename = webpackOutput.filename;
    if (outputFilename === undefined) throw new Error("Weback output configuration filename parameter required.");

    const entrySubpathWithinDeclarationsDirectory = entry.substring(PROJECT_DIRECTORY.length).replace(/.ts$/, ".d.ts");
    const entryDeclarationFile = path.resolve(desclarationsDir, "." + entrySubpathWithinDeclarationsDirectory);
    console.log("entryDeclarationFile =", entryDeclarationFile);

    // Recurse starting from the entry declaration file down through dependencies. 
    // Upon reading the entry's declaration file, get all import statements. We will rewrite these import statements to transform aliased references to relative paths.

    const baseDir: string = tsconfigBase.compilerOptions.baseUrl;
    const aliasPaths: Record<string, string[]> = tsconfigBase.compilerOptions.paths;  
    const aliasMap = new Map(
        Object.entries(aliasPaths)
            .map(([key, value]): [string, string] => 
                [key.split("/*")[0], value[0].split("/*")[0]]));

    async function rewriteImportAliases(currentDeclarationFilePath: string, prefix = "") {
        console.log(prefix + currentDeclarationFilePath);
        usedDeclarationFiles.add(currentDeclarationFilePath);
        const currentSourceFilePathContainingDirectory = path.dirname(currentDeclarationFilePath);

        const importRegex = /(import|export)\s*\{.*\}\s*from\s*("|')(.*)("|')/g
        const importRegexModuleNameGroup = 3; // This is the regex group that will contain the actual module name
        const sourceFileContents = (await readFileAsync(currentDeclarationFilePath)).toString();

        const rewrites: {before: string; after: string; absolute: string;}[] = [];
        const relativeImportPaths: string[] = [];

        var importRegexMatch = importRegex.exec(sourceFileContents);
        while (importRegexMatch !== null) {
            const referenceModuleString = importRegexMatch[importRegexModuleNameGroup];
            // Check to see if the reference source file path begins with an alias.
            var beginsWithAlias = false;
            for(const [aliasValue, aliasSubdirectory] of Array.from(aliasMap.entries())) {
                if (referenceModuleString.startsWith(aliasValue)) {
                    beginsWithAlias = true;
                    // Transform into absolute path.
                    const referenceModuleAbsolutePath = referenceModuleString.replace(aliasValue, path.resolve(desclarationsDir, baseDir, "./" + aliasSubdirectory)) + ".d.ts";
                    console.log(prefix + "referenceModuleAbsolutPath =", referenceModuleAbsolutePath);
                    // Transform into relative path.
                    const referenceModuleRelativePath = await getRelativeImportPath(currentDeclarationFilePath, referenceModuleAbsolutePath);
                    rewrites.push({
                        before: referenceModuleString,
                        after: referenceModuleRelativePath,
                        absolute: referenceModuleAbsolutePath
                    });
                    relativeImportPaths.push(referenceModuleRelativePath);
                    break;
                }
            }
            if (!beginsWithAlias) {
                relativeImportPaths.push(referenceModuleString);
            }
            importRegexMatch = importRegex.exec(sourceFileContents);
        }
        // Now we can do the rewriting.
        var final = sourceFileContents;
        // TODO: replace with reduce.
        for(const rewrite of rewrites) {
            final = final.replace(rewrite.before, rewrite.after);
        }
        await writeFileAsync(currentDeclarationFilePath, final);
        await Promise.all(relativeImportPaths
            .map(relativeImportPath => path.resolve(currentSourceFilePathContainingDirectory, relativeImportPath + ".d.ts"))
            .map(absoluteImportPath => rewriteImportAliases(absoluteImportPath, prefix + "  ")));
    }

    await rewriteImportAliases(entryDeclarationFile);

    console.log();
    console.log();
    console.log();

    const outputSubpathWithinDistributionDirectory = outputPath.substring(DISTRIBUTION_DIRECTORY.length) + path.sep + outputFilename.replace(/.js$/, "");
    console.log("outputSubpathWithinDistributionDirectory =", outputSubpathWithinDistributionDirectory)
    return `
declare module "${moduleName}${outputSubpathWithinDistributionDirectory.replace(/\\/g, "/")}" {
    export * from "${moduleName}/types${entrySubpathWithinDeclarationsDirectory.replace(/\\/g, "/")}";
}
`;
}

export async function removeUnusedDeclarationFiles(directory: string) {
    const recursiveRemovalResults = await Promise.all((await readDirAsync(directory))
        .map(relativeChildPath => path.resolve(directory, relativeChildPath))
        .map(async absoluteChildPath => {
            const stat = await statAsync(absoluteChildPath);
            if(stat.isFile()) {
                if (usedDeclarationFiles.has(absoluteChildPath) || !absoluteChildPath.endsWith(".d.ts")) {
                    return true;
                } else {
                    // remove the file.
                    console.log("deleting file " + absoluteChildPath);
                    await unlinkAsync(absoluteChildPath);
                    return false;
                }
            } else if (stat.isDirectory()) {
                return await removeUnusedDeclarationFiles(absoluteChildPath);
            } else {
                throw new Error("Neither file nor directory.");
            }
        }));
    for (const result of recursiveRemovalResults) {
        if (result === true) {
            return true;
        }
    }
    // rmdir if all children have been removed.
    console.log("deleting folder " + directory);
    await rmdirAsync(directory);
    return false;
    
}