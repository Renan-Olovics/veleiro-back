import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import { File } from '@prisma/client'

import { FileRepository, FolderRepository } from '@/repositories'
import { S3Service } from '@/services'

import { CreateFileData, UpdateFileData } from './types'

@Injectable()
export class FileService {
  constructor(
    private readonly fileRepository: FileRepository,
    private readonly folderRepository: FolderRepository,
    private readonly s3Service: S3Service,
  ) {}

  async create(data: CreateFileData): Promise<Omit<File, 'createdAt' | 'updatedAt'>> {
    if (data.folderId) {
      const folder = await this.folderRepository.findById(data.folderId)
      if (!folder) {
        throw new BadRequestException('Folder not found')
      }
      if (folder.userId !== data.userId) {
        throw new ForbiddenException('Folder does not belong to user')
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { createdAt: _, updatedAt: __, ...file } = await this.fileRepository.create(data)
    return file
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    folderId?: string,
    description?: string,
  ): Promise<Omit<File, 'createdAt' | 'updatedAt'>> {
    // Validate folder if provided
    if (folderId) {
      const folder = await this.folderRepository.findById(folderId)
      if (!folder) {
        throw new BadRequestException('Folder not found')
      }
      if (folder.userId !== userId) {
        throw new ForbiddenException('Folder does not belong to user')
      }
    }

    const s3Key = this.s3Service.generateKey(file.originalname, userId, folderId)

    const s3Url = await this.s3Service.uploadFile({
      key: s3Key,
      file: file.buffer,
      contentType: file.mimetype,
      metadata: {
        originalName: file.originalname,
        userId,
        folderId: folderId || 'root',
      },
    })

    const extension = file.originalname.includes('.')
      ? file.originalname.substring(file.originalname.lastIndexOf('.'))
      : null

    const fileData: CreateFileData = {
      name: file.originalname,
      originalName: file.originalname,
      description: description || null,
      mimeType: file.mimetype,
      size: file.size,
      s3Url,
      s3Key,
      extension,
      pulseData: null,
      userId,
      folderId: folderId || null,
    }

    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      createdAt: _,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      updatedAt: __,
      ...createdFile
    } = await this.fileRepository.create(fileData)
    return createdFile
  }

  async findAll(userId: string): Promise<File[]> {
    return await this.fileRepository.findByUserId(userId)
  }

  async findRootFiles(userId: string): Promise<File[]> {
    return await this.fileRepository.findRootFilesByUserId(userId)
  }

  async findByFolderId(folderId: string, userId: string): Promise<File[]> {
    const folder = await this.folderRepository.findById(folderId)
    if (!folder) {
      throw new NotFoundException('Folder not found')
    }
    if (folder.userId !== userId) {
      throw new ForbiddenException('Folder does not belong to user')
    }

    return this.fileRepository.findByFolderId(folderId)
  }

  async findById(id: string, userId: string): Promise<File> {
    const file = await this.fileRepository.findById(id)
    if (!file) {
      throw new NotFoundException('File not found')
    }
    if (file.userId !== userId) {
      throw new ForbiddenException('File does not belong to user')
    }
    return file
  }

  async update(
    id: string,
    data: UpdateFileData,
    userId: string,
  ): Promise<Omit<File, 'createdAt' | 'updatedAt'>> {
    const file = await this.fileRepository.findById(id)
    if (!file) {
      throw new NotFoundException('File not found')
    }
    if (file.userId !== userId) {
      throw new ForbiddenException('File does not belong to user')
    }

    if (data.folderId) {
      const folder = await this.folderRepository.findById(data.folderId)
      if (!folder) {
        throw new BadRequestException('Folder not found')
      }
      if (folder.userId !== userId) {
        throw new ForbiddenException('Folder does not belong to user')
      }
    }

    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      createdAt: _,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      updatedAt: __,
      ...updatedFile
    } = await this.fileRepository.update(id, data)
    return updatedFile
  }

  async delete(id: string, userId: string): Promise<void> {
    const file = await this.fileRepository.findById(id)
    if (!file) {
      throw new NotFoundException('File not found')
    }
    if (file.userId !== userId) {
      throw new ForbiddenException('File does not belong to user')
    }

    try {
      await this.s3Service.deleteFile(file.s3Key)
    } catch (error) {
      console.error(`Failed to delete file from S3: ${error.message}`)
    }

    await this.fileRepository.delete(id)
  }

  async generateDownloadUrl(id: string, userId: string): Promise<string> {
    const file = await this.fileRepository.findById(id)
    if (!file) {
      throw new NotFoundException('File not found')
    }
    if (file.userId !== userId) {
      throw new ForbiddenException('File does not belong to user')
    }

    return this.s3Service.generateDownloadUrl(file.s3Key)
  }

  async moveToFolder(fileId: string, folderId: string | null, userId: string): Promise<void> {
    const file = await this.fileRepository.findById(fileId)
    if (!file) {
      throw new NotFoundException('File not found')
    }
    if (file.userId !== userId) {
      throw new ForbiddenException('File does not belong to user')
    }

    if (folderId) {
      const folder = await this.folderRepository.findById(folderId)
      if (!folder) {
        throw new BadRequestException('Folder not found')
      }
      if (folder.userId !== userId) {
        throw new ForbiddenException('Folder does not belong to user')
      }
    }

    await this.fileRepository.update(fileId, { folderId })
  }
}
