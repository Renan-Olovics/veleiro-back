import { JwtService } from '@nestjs/jwt'

import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcryptjs'
import { mock, type MockProxy } from 'jest-mock-extended'

import { createModule } from '@/config/test/module'
import { UserRepository } from '@/repositories'
import { JwtSharedService } from '@/services/jwt'

import { AuthService } from './auth.service'

describe('AuthService', () => {
  let service: AuthService
  let jwtSharedService: JwtSharedService
  let userRepository: MockProxy<UserRepository>

  beforeEach(async () => {
    userRepository = mock<UserRepository>()
    const module = await createModule({
      providers: [
        AuthService,
        JwtSharedService,
        JwtService,
        { provide: UserRepository, useValue: userRepository },
      ],
    })
    service = module.get<AuthService>(AuthService)
    jwtSharedService = module.get<JwtSharedService>(JwtSharedService)
  })

  it('should throw if user not found', async () => {
    userRepository.findByEmail.mockResolvedValue(null)
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
    userRepository.findByEmail.mockResolvedValue({
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
    userRepository.findByEmail.mockResolvedValue({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email,
      password: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    jest.spyOn(bcrypt, 'compare').mockImplementation(() => true)
    jest.spyOn(jwtSharedService, 'generateToken').mockReturnValue('token')
    const result = await service.login({ email, password })
    expect(result).toEqual({ access_token: 'token' })
  })
})
