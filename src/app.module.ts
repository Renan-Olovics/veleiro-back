import { Global, Module } from '@nestjs/common'

import { PrismaService } from '@/services'

import { AuthModule, FileModule, FolderModule, UserModule } from './modules'

@Global()
@Module({
  imports: [UserModule, AuthModule, FolderModule, FileModule],
  controllers: [],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
