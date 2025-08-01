import { Module } from '@nestjs/common'

import { AuthModule } from '@/modules/auth/auth.module'
import { FileRepository, FolderRepository } from '@/repositories'
import { S3Service } from '@/services'

import { FileController } from './file.controller'
import { FileService } from './file.service'

@Module({
  imports: [AuthModule],
  providers: [FileService, FileRepository, FolderRepository, S3Service],
  controllers: [FileController],
})
export class FileModule {}
