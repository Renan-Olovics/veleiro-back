import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/services/prisma.service'
import { User } from '@prisma/client'

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } })
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } })
  }

  async create(
    data: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password: string },
  ): Promise<User> {
    return this.prisma.user.create({ data })
  }
}
