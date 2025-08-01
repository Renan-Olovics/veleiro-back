import { Controller, Post, Body, Query, Get } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger'

import { RegisterUserDto } from './dto'
import { UserService } from './user.service'

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('create')
  @ApiOperation({
    summary: 'Create user',
    description: 'Create a new user in the system.',
  })
  @ApiBody({
    description: 'User registration data',
    type: RegisterUserDto,
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error.',
  })
  async create(@Body() body: RegisterUserDto) {
    return this.userService.create(body)
  }

  @Get('check-email')
  @ApiOperation({
    summary: 'Check if email is in use',
    description: 'Returns true if email is already registered.',
  })
  @ApiQuery({
    name: 'email',
    type: String,
    required: true,
    description: 'Email to check if it is already in use',
    example: 'john@example.com',
  })
  @ApiResponse({ status: 200, description: 'Email check result.' })
  @ApiResponse({
    status: 400,
    description: 'Email parameter is required and must be valid.',
  })
  async checkEmail(@Query('email') email: string) {
    return { inUse: await this.userService.isEmailInUse(email) }
  }
}
