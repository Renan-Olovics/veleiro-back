import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

import { UserRepository } from '@/repositories'
import { jwtConfig } from '@/config/jwt.config'

import type { CurrentUser, JwtPayload } from '../types'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userRepository: UserRepository) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.secret,
    })
  }

  async validate(payload: JwtPayload): Promise<CurrentUser | null> {
    const user = await this.userRepository.findById(payload.sub)

    if (!user) {
      throw new UnauthorizedException('Invalid token')
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, createdAt, updatedAt, ...rest } = user

    return rest
  }
}
