import { Module, Global } from '@nestjs/common'
import { PrismaService } from '@/services/prisma.service'
import { UserModule } from './modules/user/user.module'
import { AuthModule } from './modules/auth/auth.module'

@Global()
@Module({
  imports: [UserModule, AuthModule],
  controllers: [],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
