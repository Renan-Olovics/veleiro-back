import { ApiProperty } from '@nestjs/swagger'

import { IsEmail, IsNotEmpty, MinLength } from 'class-validator'

export class RegisterUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  name: string

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty()
  @MinLength(6)
  password: string
}
