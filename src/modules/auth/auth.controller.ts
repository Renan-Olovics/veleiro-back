import { Controller, Post, Body } from '@nestjs/common'

import { AuthLoginData } from './types/auth-login-data.type'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() { email, password }: AuthLoginData) {
    return await this.authService.login({ email, password })
  }
}
