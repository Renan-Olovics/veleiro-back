import { Injectable, UnauthorizedException } from '@nestjs/common'

import { compare } from 'bcryptjs'

import { UserRepository } from '@/repositories'
import { JwtSharedService } from '@/services/jwt'

import { type AuthLoginData, type AuthLoginResponse } from './types'

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtSharedService: JwtSharedService,
  ) {}

  async login({ email, password }: AuthLoginData): Promise<AuthLoginResponse> {
    const user = await this.userRepository.findByEmail(email)
    if (!user) throw new UnauthorizedException('Invalid credentials')

    const passwordValid = await compare(password, user.password)
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials')

    return { access_token: this.jwtSharedService.generateToken(user) }
  }
}
