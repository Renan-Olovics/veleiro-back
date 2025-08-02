import { Global, Module } from '@nestjs/common'

import { PrismaService } from '@/services'
import { JwtSharedModule } from '@/services/jwt'

import { AuthModule, FileModule, FolderModule, UserModule } from './modules'

@Global()
@Module({
  imports: [JwtSharedModule, UserModule, AuthModule, FolderModule, FileModule],
  controllers: [],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
