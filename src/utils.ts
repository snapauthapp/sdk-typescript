export const base64URLToArrayBuffer = (base64URL: string): ArrayBuffer => {
  const base64 = base64URL.replaceAll('-', '+').replaceAll('_', '/') // padding?
  const bin = atob(base64)
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

export const arrayBufferToBase64URL = <T extends ArrayBuffer|null>(buffer: T): T extends ArrayBuffer ? string : null => {
  if (buffer === null) {
    // Conditional typing gets weird
    return null as any
  }
  let bin = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength

  // Note: can't use map() since it gives a new Uint8Array and breaks the
  // data. Maybe bytes.values().map() would work?
  for (let i = 0; i < len; i++) {
    bin += String.fromCharCode(bytes[i])
  }
  const b64 = btoa(bin)
  // same
  return b64.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '') as any
}

/**
 * Actual must match all properties of expected, recursively.
 */
export const areObjectPropertiesEqual = (expected: Record<string, any>, actual: any): boolean => {
  if (typeof expected !== 'object' || typeof actual !== 'object') {
    return false
  }

  const expectedKeys = Object.keys(expected)

  for (const key of expectedKeys) {
    if (!(key in actual)) {
      return false
    }

    if (typeof expected[key] === 'object' && typeof actual[key] === 'object') {
      if (!areObjectPropertiesEqual(expected[key], actual[key])) {
        return false
      }
    } else if (expected[key] !== actual[key]) {
      return false
    }
  }

  return true
}
