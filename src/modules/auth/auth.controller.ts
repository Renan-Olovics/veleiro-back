import { Body, Controller, Post } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { AuthService } from './auth.service'
import { AuthLoginDto } from './dto/auth-login.dto'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user and return JWT token.',
  })
  @ApiBody({
    description: 'Login credentials',
    type: AuthLoginDto,
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'Login successful, returns JWT token.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials.',
  })
  async login(@Body() { email, password }: AuthLoginDto) {
    return await this.authService.login({ email, password })
  }
}
