import { Controller, Post, Body } from '@nestjs/common'

import { RegisterUserDto } from './dto/register-user.dto'
import { UserService } from './user.service'

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(@Body() body: RegisterUserDto) {
    return this.userService.register(body)
  }
}
