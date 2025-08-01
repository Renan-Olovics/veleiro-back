import { Module } from '@nestjs/common'

import { AuthModule } from '@/modules/auth/auth.module'
import { FolderRepository } from '@/repositories'

import { FolderController } from './folder.controller'
import { FolderService } from './folder.service'

@Module({
  imports: [AuthModule],
  providers: [FolderService, FolderRepository],
  controllers: [FolderController],
})
export class FolderModule {}
