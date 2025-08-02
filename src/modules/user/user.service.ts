import { BadRequestException, Injectable } from '@nestjs/common'

import { hash } from 'bcryptjs'

import { UserRepository } from '@/repositories'
import { JwtSharedService } from '@/services/jwt'

import { CreateUserResponse, RegisterUserData } from './types'

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtSharedService: JwtSharedService,
  ) {}

  async create(data: RegisterUserData): Promise<CreateUserResponse> {
    if (await this.isEmailInUse(data.email)) {
      throw new BadRequestException('Email already in use')
    }

    const hashedPassword = await hash(data.password, 10)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { createdAt, updatedAt, password, ...user } = await this.userRepository.create({
      ...data,
      password: hashedPassword,
    })

    const token = this.jwtSharedService.generateToken(user)

    return { ...user, access_token: token }
  }

  async isEmailInUse(email: string): Promise<boolean> {
    if (!email || email === '' || email.trim() === '') {
      throw new BadRequestException('Email parameter is required')
    }
    return !!(await this.userRepository.findByEmail(email))
  }
}
