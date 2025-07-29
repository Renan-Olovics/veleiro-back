import { Injectable } from '@nestjs/common'
import { hash } from 'bcryptjs'

import { PrismaService } from '@/services/prisma.service'

import { RegisterUserData } from './types/register-user-data.type'

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async register(data: RegisterUserData) {
    const hashedPassword = await hash(data.password, 10)
    return this.prisma.user.create({
      data: { ...data, password: hashedPassword },
    })
  }
}
