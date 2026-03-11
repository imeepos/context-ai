import { describe, expect, it } from 'vitest'
import { TypeormFactory } from './orm.js'
import { OsSnakeNamingStrategy } from './orm-naming.strategy.js'

describe('TypeormFactory', () => {
    it('should use OsSnakeNamingStrategy in datasource options', () => {
        const factory = new TypeormFactory('/tmp/context-ai', [])
        const options = factory.createOptions()

        expect(options.namingStrategy).toBeInstanceOf(OsSnakeNamingStrategy)
    })
})

describe('OsSnakeNamingStrategy', () => {
    const strategy = new OsSnakeNamingStrategy()

    it('should convert table and column names to snake_case', () => {
        expect(strategy.tableName('UserProfile', undefined)).toBe('user_profile')
        expect(strategy.columnName('createdAt', undefined, [])).toBe('created_at')
    })

    it('should convert join names to snake_case', () => {
        expect(strategy.joinColumnName('ownerProfile', 'userId')).toBe('owner_profile_user_id')
        expect(strategy.joinTableName('UserProfile', 'RoleGroup', 'roles.list', 'users.list')).toBe('user_profile_roles_list_role_group')
    })

    it('should preserve explicit custom names like default strategy behavior', () => {
        expect(strategy.tableName('UserProfile', 'UserProfileTable')).toBe('UserProfileTable')
        expect(strategy.columnName('createdAt', 'CreatedAt', [])).toBe('CreatedAt')
    })

    it('should keep relation property names unchanged', () => {
        expect(strategy.relationName('ownerProfile')).toBe('ownerProfile')
    })

    it('should generate readable and stable constraint names', () => {
        expect(strategy.primaryKeyName('user_profile', ['id'])).toBe('pk_user_profile_id')
        expect(strategy.foreignKeyName('order_item', ['orderId', 'productId'])).toBe(
            strategy.foreignKeyName('order_item', ['productId', 'orderId'])
        )
        expect(strategy.indexName('user_profile', ['createdAt'])).toBe('idx_user_profile_created_at')
    })

    it('should append short hash when identifier is too long', () => {
        const longName = strategy.indexName(
            'extremely_long_business_domain_order_item_snapshot_archive',
            ['superLongColumnNameOne', 'superLongColumnNameTwo', 'superLongColumnNameThree']
        )

        expect(longName.length).toBeLessThanOrEqual(63)
        expect(longName).toMatch(/^idx_.+_[a-f0-9]{8}$/)
    })
})
