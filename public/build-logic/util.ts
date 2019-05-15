import * as fs from 'fs';
import { promisify } from "util";

export const fsAsync = {
    deleteDirectory: promisify(fs.rmdir),
    deleteFile: promisify(fs.unlink),
    readDirectory: promisify(fs.readdir),
    readFile: promisify(fs.readFile),
    rename: promisify(fs.rename),
    statistics: promisify(fs.stat),
    writeFile: promisify(fs.writeFile),
}

export function prettyPrintJSON(object: any) {
    return JSON.stringify(object, null, 2);
}

export function loadJSON(p: string) {
    var json: any;
    eval("json="+fs.readFileSync(p).toString());
    return json;
}