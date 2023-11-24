import { Injectable } from '@angular/core';
import { Page } from '../types/page';
import localforage from 'localforage';

/**
 * Schemas
 */
import { Subject, map } from 'rxjs';


let dbPromise;
/**
 *
 */

@Injectable({
    providedIn: 'root'
})
export class FilesService extends Subject<any> {

    constructor() {
        super();
        dbPromise = localforage.setDriver([
            localforage.INDEXEDDB
        ]);
    }

    private async validateDir(path: string) {
        if (path.endsWith(".json"))
            path = path.split('/').slice(0, -1).join("/");

        return true;
    }

    async saveFileMetadata(pageMetadata: Page) {
        await this.validateDir(pageMetadata.path);

        const page = structuredClone(pageMetadata);
        page.content = undefined;
        page.children = undefined;
        page.path = undefined;

        return localforage.setItem(page.path, page)
    }

    async saveFileContents(page: Page) {
        await this.validateDir(page.path);

        // Do not set page contents to `undefined` or `null`.
        // This gets called when an update comes through before
        // a page loads it's contents
        if (page.content == undefined || page.content == null)
            return null;

        const path = page.path.replace(/\.json$/, '.md');
        return localforage.setItem(path, page.content);
    }

    async readFile(path: string) {
        return localforage.getItem(path);
    }

    async deleteFile(page: Page) {
        await localforage.removeItem(page.path);
        await localforage.removeItem(page.path.replace(/\.json$/, '.md'));
    }

    async trashFile(page: Page) {
        const srcPath = page.path;
        const targetPath = page.path.replace(/^data\//, 'trash/');
        const srcPathMd = srcPath.replace(/\.json$/, '.md');
        const targetPathMd = targetPath.replace(/\.json$/, '.md');
        page.deleted = Date.now();


        const oldFile = await localforage.getItem(srcPath);
        await localforage.setItem(targetPath, oldFile);

        const oldFileMd = await localforage.getItem(srcPathMd);
        await localforage.setItem(targetPathMd, oldFileMd);

        await localforage.removeItem(srcPath);
        await localforage.removeItem(srcPathMd);
    }

    async listFiles(pathTarget: string) {
        let pages: Page[] = [];

        if (pathTarget.trim().length < 3)
            pathTarget = "data";

        // if (!pathTarget.startsWith("/"))
            // pathTarget = "/" + pathTarget;
        if (!pathTarget.endsWith("/"))
            pathTarget += "/";

        await dbPromise;
        const slug = pathTarget.replace(/[^a-z0-9_\-]/g, '');
        const keys = await localforage.keys();
        const jsonKeys = keys
            .filter(key => key.endsWith(".json"))
            .filter(key => key.startsWith(slug));

        pages = await Promise.all(jsonKeys.map(k => localforage.getItem(k))) as any;
        pages.forEach(p => {
            if (!p.name || p.name.trim().length < 2) {
                p.autoName = true;
            }
        })

        pages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        return pages;
    }
}
