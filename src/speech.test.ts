import { describe, expect, it } from 'vitest'
import { createRecognition, parseCommand, speak } from './speech'

describe('parseCommand', () => {
  it.each([
    ['I found it', 'found'],
    ['nothing here, next', 'next'],
    ['say that again please', 'repeat'],
    ['check the couch', 'unknown'],
    ['I did not find it', 'unknown'],
    ['I haven’t found it', 'unknown'],
    ['Found it!', 'found'],
  ])('maps “%s” to %s', (transcript, command) => {
    expect(parseCommand(transcript)).toBe(command)
  })

  it('fails quietly when browser speech APIs are absent', () => {
    expect(createRecognition(() => undefined, () => undefined)).toBeNull()
    expect(speak('Test step')).toBe(false)
  })
})
