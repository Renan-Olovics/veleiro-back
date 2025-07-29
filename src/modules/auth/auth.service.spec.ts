import { JwtService } from '@nestjs/jwt'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcryptjs'

import { PrismaService } from '@/services/prisma.service'

import { AuthService } from './auth.service'
import { createModule } from '@/config/test/module'

describe('AuthService', () => {
  let service: AuthService
  let prisma: PrismaService
  let jwt: JwtService

  beforeEach(async () => {
    const module = await createModule({ providers: [AuthService, JwtService] })

    service = module.get<AuthService>(AuthService)
    prisma = module.get<PrismaService>(PrismaService)
    jwt = module.get<JwtService>(JwtService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should throw if user not found', async () => {
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)
    await expect(
      service.login({
        email: faker.internet.email(),
        password: faker.internet.password(),
      }),
    ).rejects.toThrow()
  })

  it('should throw if password is invalid', async () => {
    const email = faker.internet.email()
    const password = faker.internet.password()
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email,
      password: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    jest.spyOn(bcrypt, 'compare').mockImplementation(() => false)
    await expect(service.login({ email, password })).rejects.toThrow()
  })

  it('should return access_token if login is valid', async () => {
    const email = faker.internet.email()
    const password = faker.internet.password()
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email,
      password: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    jest.spyOn(bcrypt, 'compare').mockImplementation(() => true)
    jest.spyOn(jwt, 'sign').mockReturnValue('token')
    const result = await service.login({ email, password })
    expect(result).toEqual({ access_token: 'token' })
  })
})
