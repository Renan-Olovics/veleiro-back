import { Injectable, BadRequestException } from '@nestjs/common'
import { hash } from 'bcryptjs'

import { UserRepository } from '@/repositories/user.repository'

import { RegisterUserData } from './types/register-user-data.type'
import { User } from '@prisma/client'

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(
    data: RegisterUserData,
  ): Promise<Omit<User, 'password' | 'createdAt' | 'updatedAt'>> {
    if (await this.isEmailInUse(data.email)) {
      throw new BadRequestException('Email already in use')
    }

    const hashedPassword = await hash(data.password, 10)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { createdAt, updatedAt, password, ...user } =
      await this.userRepository.create({ ...data, password: hashedPassword })
    return user
  }

  async isEmailInUse(email: string): Promise<boolean> {
    if (!email || email === '' || email.trim() === '') {
      throw new BadRequestException('Email parameter is required')
    }
    return !!(await this.userRepository.findByEmail(email))
  }
}
