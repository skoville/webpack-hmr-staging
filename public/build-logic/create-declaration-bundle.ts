import webpack = require("webpack");
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from "util";
import { DISTRIBUTION_DIRECTORY } from "./paths";

const readDirAsync = promisify(fs.readdir);
const readFileAsync = promisify(fs.readFile);
const rmdirAsync = promisify(fs.rmdir);
const statAsync = promisify(fs.stat);
const unlinkAsync = promisify(fs.unlink);
const writeFileAsync = promisify(fs.writeFile);

const usedDeclarationFiles = new Set<string>();
       
/**
 * - given that a webpack bundle has already been generated and declaration files have been generated. 
 * - given that tsconfig includes outDir.
 * This will produce a companion declaration file to the output webpack bundle file which only declares the types exported from the entry file.
 * @param webpackConfig the webpack configuration for the bundle that was just generated.
 */
export async function createDeclarationBundle(webpackConfig: webpack.Configuration) {
    // Based on where the webpack entry file is, and by reading the outDir of the tsconfig base, we can determine the location of the entry's generated declaration file.
    const entry: string = webpackConfig.entry as string;
    const webpackOutput = webpackConfig.output;
    if (webpackOutput === undefined) throw new Error("");
    const outputPath = webpackOutput.path;
    if (outputPath === undefined) throw new Error("");
    const outputFilename = webpackOutput.filename;
    if (outputFilename === undefined) throw new Error("");

    const commonPath = (function(str1: string, str2: string) {
        for(var i = 0; i < str1.length; ++i) {
            if(str1[i] !== str2[i]) return str1.substring(0, i);
        }
        return str1;
    })(outputPath, entry);

    var tsconfigBase:any;
    eval("tsconfigBase=" + (fs.readFileSync(path.resolve(commonPath, "tsconfig-base.json"))).toString());
    const distDir: string = path.resolve(commonPath, tsconfigBase.compilerOptions.outDir);

    const entryDeclarationFile = path.resolve(distDir, entry.substring(commonPath.length).replace(/.ts$/, ".d.ts"));

    // Recurse starting from the entry declaration file down through dependencies. 
    // Upon reading the entry's declaration file, get all import statements. We will rewrite these import statements to transform aliased references to relative paths.

    const baseDir: string = tsconfigBase.compilerOptions.baseUrl;
    const aliasPaths: Record<string, string[]> = tsconfigBase.compilerOptions.paths;  
    const aliasMap = new Map(
        Object.entries(aliasPaths)
            .map(([key, value]): [string, string] => 
                [key.split("/*")[0], value[0].split("/*")[0]]));

    async function rewriteImportAliases(currentSourceFilePath: string) {
        usedDeclarationFiles.add(currentSourceFilePath);
        const currentSourceFilePathContainingDirectory = path.dirname(currentSourceFilePath);
        const importRegex = /(import|export)\s*\{.*\}\s*from\s*("|')(.*)("|')/g
        const importRegexModuleNameGroup = 3; // This is the regex group that will contain the actual module name
        const sourceFileContents = (await readFileAsync(currentSourceFilePath)).toString();
        // console.log(currentSourceFilePath);
        const rewrites: {before: string; after: string;}[] = [];
        var importRegexMatch = importRegex.exec(sourceFileContents);
        const relativeImportPaths: string[] = [];
        while (importRegexMatch !== null) {
            const referenceSourceFilePath = importRegexMatch[importRegexModuleNameGroup];
            var updatedReferenceSourceFilePath = (() => {
                // Check to see if the reference source file path begins with an alias.
                for(const currentAlias of Array.from(aliasMap.keys())) {
                    if (referenceSourceFilePath.startsWith(currentAlias)) {
                        // Traverse upwards from current file path until we reach dist directory.
                        var upwardsPathTraversal = "";
                        while(path.resolve(currentSourceFilePathContainingDirectory, upwardsPathTraversal) !== distDir) {
                            upwardsPathTraversal += "../";
                        }
                        // Combine this with alias value to get proper relative path.
                        const aliasValue = aliasMap.get(currentAlias);
                        if (aliasValue === undefined) throw new Error("Impossible state; map changed during execution such that guaranteed key is no longer key.");
                        return upwardsPathTraversal + baseDir + '/' + aliasValue + referenceSourceFilePath.substring(currentAlias.length);
                    }
                }
                // return input if there is no alias to rewrite.
                return referenceSourceFilePath;
            })();
            rewrites.push({
                before: referenceSourceFilePath,
                after: updatedReferenceSourceFilePath
            });
            //console.log();
            //console.log(importRegexMatch)
            //console.log(referenceSourceFilePath);
            //console.log(updatedReferenceSourceFilePath);
            if (updatedReferenceSourceFilePath.startsWith(".")) {
                relativeImportPaths.push(updatedReferenceSourceFilePath);
            }
            importRegexMatch = importRegex.exec(sourceFileContents);
        }
        // Now we can do the rewriting.
        var final = sourceFileContents;
        for(const rewrite of rewrites) {
            final = final.replace(rewrite.before, rewrite.after);
        }
        await writeFileAsync(currentSourceFilePath, final);
        Promise.all(relativeImportPaths
            .map(relativeImportPath => path.resolve(currentSourceFilePathContainingDirectory, relativeImportPath + ".d.ts"))
            .map(absoluteImportPath => rewriteImportAliases(absoluteImportPath)));
    }

    await rewriteImportAliases(entryDeclarationFile);

    // Create declaration file which is adjacent to the output, which maps to the correct declaration file.
    const relativePathFromOutputToProjectDir = (() => {
        var upwardsPathTraversal: string = "../../";
        console.log("op = " + outputPath);
        console.log("cp = " + commonPath);
        var cur = path.resolve(outputPath, upwardsPathTraversal);
        console.log(cur);
        while(cur !== commonPath) {
            //upwardsPathTraversal += "../";
            cur = path.resolve(outputPath, upwardsPathTraversal);
            //console.log(cur);
        }
        return upwardsPathTraversal;
    })();
    const relativePathFromOutputToCorrespondingEntryFile =
        relativePathFromOutputToProjectDir + 
        tsconfigBase.compilerOptions.outDir +
        entry.substring(commonPath.length).replace(/.ts$/, ".d.ts");
    console.log(relativePathFromOutputToCorrespondingEntryFile);
    //await writeFileAsync("", `export * from '${}'`)

    console.log();
    console.log();
    console.log();
}

export async function removeUnusedDeclarationFiles(directory: string) {
    const recursiveRemovalResults = await Promise.all((await readDirAsync(DISTRIBUTION_DIRECTORY))
        .map(relativeChildPath => path.resolve(directory, relativeChildPath))
        .map(async absoluteChildPath => {
            const stat = await statAsync(absoluteChildPath);
            if(stat.isFile()) {
                if (usedDeclarationFiles.has(absoluteChildPath)) {
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