import { Module, Global } from '@nestjs/common'

import { PrismaService } from '@/services'

import { AuthModule } from './modules/auth/auth.module'
import { FolderModule } from './modules/folder/folder.module'
import { UserModule } from './modules/user/user.module'

@Global()
@Module({
  imports: [UserModule, AuthModule, FolderModule],
  controllers: [],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
