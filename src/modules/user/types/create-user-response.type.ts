import { type User } from '@prisma/client'

export type CreateUserResponse = Omit<User, 'password' | 'createdAt' | 'updatedAt'> & {
  access_token: string
}
