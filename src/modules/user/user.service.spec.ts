import { BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

import { faker } from '@faker-js/faker'
import { mockDeep } from 'jest-mock-extended'

import { createModule } from '@/config/test/module'
import { UserRepository } from '@/repositories'
import { JwtSharedService } from '@/services/jwt'

import { UserService } from './user.service'

describe('UserService', () => {
  let service: UserService
  let userRepository: jest.Mocked<UserRepository>
  let jwtSharedService: jest.Mocked<JwtSharedService>
  let email: string
  let name: string
  let password: string

  const makeUser = (overrides = {}) => ({
    id: '1',
    name,
    email,
    password: 'hashed',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })

  beforeEach(async () => {
    userRepository = mockDeep<UserRepository>()
    jwtSharedService = mockDeep<JwtSharedService>()
    const module = await createModule({
      providers: [
        UserService,
        JwtService,
        { provide: UserRepository, useValue: userRepository },
        { provide: JwtSharedService, useValue: jwtSharedService },
      ],
    })
    service = module.get<UserService>(UserService)
    email = faker.internet.email()
    name = faker.person.fullName()
    password = '123456'
  })

  it('should throw if email is already in use', async () => {
    userRepository.findByEmail.mockResolvedValue(makeUser())
    await expect(service.create({ name, email, password })).rejects.toThrow(BadRequestException)
  })

  it('should create user if email is not in use', async () => {
    userRepository.findByEmail.mockResolvedValue(null)
    userRepository.create.mockResolvedValue(makeUser())
    jwtSharedService.generateToken.mockReturnValue('mock-token')

    const result = await service.create({ name, email, password })

    expect(userRepository.create).toHaveBeenCalled()
    expect(jwtSharedService.generateToken).toHaveBeenCalled()
    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('access_token', 'mock-token')
  })

  it('should return true if email is in use', async () => {
    userRepository.findByEmail.mockResolvedValue(makeUser())
    expect(await service.isEmailInUse(email)).toBe(true)
  })

  it('should return false if email is not in use', async () => {
    userRepository.findByEmail.mockResolvedValue(null)
    expect(await service.isEmailInUse(email)).toBe(false)
  })
})
