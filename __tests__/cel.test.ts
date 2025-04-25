import { describe, it, expect } from 'vitest'
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
})
