export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'changeme',
  signOptions: {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
}
