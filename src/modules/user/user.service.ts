import { Injectable, BadRequestException } from '@nestjs/common'
import { hash } from 'bcryptjs'

import { UserRepository } from '@/repositories/user.repository'

import { RegisterUserData } from './types/register-user-data.type'

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(data: RegisterUserData) {
    if (await this.isEmailInUse(data.email)) {
      throw new BadRequestException('Email already in use')
    }

    const hashedPassword = await hash(data.password, 10)
    return this.userRepository.create({ ...data, password: hashedPassword })
  }

  async isEmailInUse(email: string): Promise<boolean> {
    return !!(await this.userRepository.findByEmail(email))
  }
}
