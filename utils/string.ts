export function isLongString(str: string, maxLength: number) {
  return str.length > maxLength
}

export function shortenString(str: string, maxLength: number) {
  if (isLongString(str, maxLength)) {
    return `${str.slice(0, maxLength - 3)}...`
  }
  return str
}

export const shortSHA = (sha: string) => sha.slice(0, 7)
