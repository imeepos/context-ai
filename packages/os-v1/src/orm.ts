import { Inject, Injectable, InjectionToken, type Type } from '@context-ai/core'
import { join } from 'path'
import { DataSource, type DataSourceOptions } from 'typeorm'
import { OsSnakeNamingStrategy } from './orm-naming.strategy.js'
import { ROOT_DIR } from './tokens.js'
export const ENTITIES = new InjectionToken<Type<any>[]>('ENTITIES')
@Injectable()
export class TypeormFactory {
    constructor(@Inject(ROOT_DIR) private root: string, @Inject(ENTITIES) private entities: Type<any>[]) { }
    private createOptions(): DataSourceOptions {
        return {
            type: 'better-sqlite3',
            database: join(this.root, 'db.sqlite'),
            entities: this.entities,
            synchronize: process.env.NODE_ENV !== 'production',
            logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
            invalidWhereValuesBehavior: {
                null: 'throw',
                undefined: 'throw',
            },
            namingStrategy: new OsSnakeNamingStrategy(),
            migrations: [join(this.root, 'migrations', '*.{ts,js}')],
            migrationsRun: true,
            statementCacheSize: 200,
            prepareDatabase: (db) => {
                db.pragma('journal_mode = WAL');
                db.pragma('foreign_keys = ON');
                db.pragma('busy_timeout = 5000');
                db.pragma('synchronous = NORMAL');
            }
        }
    }

    create() {
        return new DataSource(this.createOptions())
    }
}
