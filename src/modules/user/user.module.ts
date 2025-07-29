import { Module } from '@nestjs/common'

import { PrismaService } from '@/services/prisma.service'

import { UserController } from './user.controller'
import { UserService } from './user.service'

@Module({
  imports: [],
  providers: [UserService, PrismaService],
  controllers: [UserController],
})
export class UserModule {}
