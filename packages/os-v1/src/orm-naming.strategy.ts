import { DefaultNamingStrategy, type NamingStrategyInterface } from 'typeorm'
import { createHash } from 'crypto'

const MAX_IDENTIFIER_LENGTH = 63

function toSnakeCase(value: string): string {
    return value
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/[\s.-]+/g, '_')
        .replace(/__+/g, '_')
        .toLowerCase()
        .replace(/^_+|_+$/g, '')
}

function normalizeTableName(tableOrName: string): string {
    return tableOrName.split('.').pop() ?? tableOrName
}

function shortHash(value: string): string {
    return createHash('sha1').update(value).digest('hex').slice(0, 8)
}

function buildIdentifier(prefix: string, parts: string[]): string {
    const readable = toSnakeCase([prefix, ...parts.filter(Boolean)].join('_'))
    if (readable.length <= MAX_IDENTIFIER_LENGTH) {
        return readable
    }
    const hash = shortHash(readable)
    const maxReadableLength = MAX_IDENTIFIER_LENGTH - hash.length - 1
    return `${readable.slice(0, maxReadableLength)}_${hash}`
}

export class OsSnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
    tableName(targetName: string, userSpecifiedName: string | undefined): string {
        return userSpecifiedName ?? toSnakeCase(targetName)
    }

    columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
        const prefix = embeddedPrefixes
            .map((item) => toSnakeCase(item.replace(/\./g, '_')))
            .filter(Boolean)
            .join('_')
        const column = customName ?? toSnakeCase(propertyName)
        return prefix ? `${prefix}_${column}` : column
    }

    relationName(propertyName: string): string {
        return propertyName
    }

    joinColumnName(relationName: string, referencedColumnName: string): string {
        return toSnakeCase(`${relationName}_${referencedColumnName}`)
    }

    joinTableName(firstTableName: string, secondTableName: string, firstPropertyName: string): string {
        return toSnakeCase(`${firstTableName}_${firstPropertyName.replace(/\./g, '_')}_${secondTableName}`)
    }

    joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
        return toSnakeCase(`${tableName}_${columnName ?? propertyName}`)
    }

    joinTableInverseColumnName(tableName: string, propertyName: string, columnName?: string): string {
        return toSnakeCase(`${tableName}_${columnName ?? propertyName}`)
    }

    joinTableColumnDuplicationPrefix(columnName: string, index: number): string {
        return `${columnName}_${index}`
    }

    classTableInheritanceParentColumnName(parentTableName: string, parentTableIdPropertyName: string): string {
        return toSnakeCase(`${parentTableName}_${parentTableIdPropertyName}`)
    }

    eagerJoinRelationAlias(alias: string, propertyPath: string): string {
        return `${alias}__${toSnakeCase(propertyPath.replace(/\./g, '_'))}`
    }

    primaryKeyName(tableOrName: string, columnNames: string[]): string {
        const sortedColumns = [...columnNames].sort()
        return buildIdentifier('pk', [normalizeTableName(tableOrName), ...sortedColumns])
    }

    uniqueConstraintName(tableOrName: string, columnNames: string[]): string {
        const sortedColumns = [...columnNames].sort()
        return buildIdentifier('uq', [normalizeTableName(tableOrName), ...sortedColumns])
    }

    foreignKeyName(tableOrName: string, columnNames: string[]): string {
        const sortedColumns = [...columnNames].sort()
        return buildIdentifier('fk', [normalizeTableName(tableOrName), ...sortedColumns])
    }

    indexName(tableOrName: string, columnNames: string[], where?: string): string {
        const sortedColumns = [...columnNames].sort()
        return buildIdentifier('idx', [normalizeTableName(tableOrName), ...sortedColumns, where ?? ''])
    }
}
