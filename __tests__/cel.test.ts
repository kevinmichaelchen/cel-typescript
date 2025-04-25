import { describe, it, expect, beforeEach } from 'vitest'
import { CelProgram } from '../src/index.js'

describe('CelProgram', () => {
    it('should evaluate a simple expression', async () => {
        const program = await CelProgram.compile('size(message) > 5')
        const result = await program.execute({ message: 'Hello World' })
        expect(result).toBe(true)
    })

    it('should handle errors gracefully', async () => {
        await expect(
            CelProgram.compile('invalid expression')
        ).rejects.toThrow()
    })

    describe('cart validation', () => {
        const expr = 'has(cart.items) && cart.items.exists(item, item.productId == "prod_123" && item.quantity >= 1)'
        let program: CelProgram

        beforeEach(async () => {
            program = await CelProgram.compile(expr)
        })

        it('should return true when cart has matching product with quantity >= 1', async () => {
            const result = await program.execute({
                cart: {
                    items: [
                        { productId: 'prod_123', quantity: 2 }
                    ]
                }
            })
            expect(result).toBe(true)
        })

        it('should return true when cart has multiple items including matching product', async () => {
            const result = await program.execute({
                cart: {
                    items: [
                        { productId: 'prod_456', quantity: 1 },
                        { productId: 'prod_123', quantity: 1 },
                        { productId: 'prod_789', quantity: 3 }
                    ]
                }
            })
            expect(result).toBe(true)
        })

        it('should return false when matching product has quantity 0', async () => {
            const result = await program.execute({
                cart: {
                    items: [
                        { productId: 'prod_123', quantity: 0 }
                    ]
                }
            })
            expect(result).toBe(false)
        })

        it('should return false when cart does not contain matching product', async () => {
            const result = await program.execute({
                cart: {
                    items: [
                        { productId: 'prod_456', quantity: 2 }
                    ]
                }
            })
            expect(result).toBe(false)
        })

        it('should return false when cart is empty', async () => {
            const result = await program.execute({
                cart: {
                    items: []
                }
            })
            expect(result).toBe(false)
        })
    })
})
