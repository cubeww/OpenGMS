export function canUseFor3D(width: number, height: number): boolean {
  return isPowerOfTwo(width) && isPowerOfTwo(height)
}

function isPowerOfTwo(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0 && Number.isInteger(Math.log2(value))
}
