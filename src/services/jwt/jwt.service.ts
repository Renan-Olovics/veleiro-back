import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

import { type User } from '@prisma/client'

@Injectable()
export class JwtSharedService {
  constructor(private readonly jwtService: JwtService) {}

  generateToken(user: Pick<User, 'id' | 'email'>): string {
    return this.jwtService.sign({ sub: user.id, email: user.email })
  }
}
