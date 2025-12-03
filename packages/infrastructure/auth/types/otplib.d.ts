// Type stub for otplib
export const authenticator = {
  generateSecret: (): string => 'test-secret',
  verify: (options: { token: string; secret: string; window?: number; encoding?: string }): boolean => true,
  keyuri: (email: string, issuer: string, secret: string): string => 'otpauth://test',
}