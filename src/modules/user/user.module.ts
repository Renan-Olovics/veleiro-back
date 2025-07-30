import { Module } from '@nestjs/common'

import { UserRepository } from '@/repositories/user.repository'

import { UserController } from './user.controller'
import { UserService } from './user.service'

@Module({
  imports: [],
  providers: [UserService, UserRepository],
  controllers: [UserController],
})
export class UserModule {}
