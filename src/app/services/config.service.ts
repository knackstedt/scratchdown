import { Injectable } from '@angular/core';
import localforage from 'localforage';
import { Subject } from 'rxjs';

// Filepath used by tauri
const filePath = `app.json`;
// key prefix used by localforage
const prefix = `config-`;

type Config = Partial<{
    telemetry: boolean,
    menuCollapsed: boolean,
    menuSize: number,
    theme: string,
    hasInstalledDefaultPages: boolean
}>;

const knownKeys = [
    "telemetry",
    "menuCollapsed",
    "theme",
    "hasInstalledDefaultPages",
    "menuSize"
]

let dbPromise;

/**
 *
 */
@Injectable({
    providedIn: 'root'
})
export class ConfigService extends Subject<Config> {

    public value: Config = {};

    constructor() {
        super();
        dbPromise = localforage.setDriver([
            localforage.INDEXEDDB
        ]);

    }

    init() {
        dbPromise.then(async () => {
            for (let i = 0; i < knownKeys.length; i++) {
                const k = knownKeys[i];
                const value = await this.get(k);
                this.value[k] = value;
            }

            this.next(this.value);
        });
    }

    async set(key: string, value: any) {
        this.value[key] = value;
        await localforage.setItem(prefix + key, value);

        this.next(this.value);
    }

    async get<T = any>(key: string): Promise<T> {
        return localforage.getItem(prefix + key);
    }
}
