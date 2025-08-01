import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { compare } from 'bcryptjs'

import { UserRepository } from '@/repositories'

import type { AuthLoginData, AuthLoginResponse } from './types'

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
