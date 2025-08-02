import { Global, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { jwtConfig } from '@/config/jwt.config'

import { JwtSharedService } from './jwt.service'

@Global()
@Module({
  imports: [JwtModule.register(jwtConfig)],
  providers: [JwtSharedService],
  exports: [JwtSharedService],
})
export class JwtSharedModule {}
