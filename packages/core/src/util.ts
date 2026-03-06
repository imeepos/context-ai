export interface Observable<T = any> {
    subscribe(observer: any): any;
}
export function isObservable<T = any>(obs: any): obs is Observable<T> {
    return obs && typeof obs.subscribe === 'function'
}

export function isPromise<T = any>(obs: any): obs is Promise<T> {
    return obs && typeof obs.then === 'function'
}
