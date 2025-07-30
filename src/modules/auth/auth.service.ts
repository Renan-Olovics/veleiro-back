import { Injectable, UnauthorizedException } from '@nestjs/common'
import { UserRepository } from '@/repositories/user.repository'

import { compare } from 'bcryptjs'
import { JwtService } from '@nestjs/jwt'
import type { AuthLoginData } from './types/login-data.type'
import type { AuthLoginResponse } from './types/login-response.type'

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login({ email, password }: AuthLoginData): Promise<AuthLoginResponse> {
    const user = await this.userRepository.findByEmail(email)
    if (!user) throw new UnauthorizedException('Invalid credentials')

    const passwordValid = await compare(password, user.password)
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials')

    const token = this.jwtService.sign({ sub: user.id, email: user.email })

    return { access_token: token }
  }
}
