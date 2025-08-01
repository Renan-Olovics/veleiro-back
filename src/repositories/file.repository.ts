import { Injectable } from '@nestjs/common'

import { type File } from '@prisma/client'

import { CreateFileData, UpdateFileData } from '@/modules/file/types'
import { PrismaService } from '@/services'

@Injectable()
export class FileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<File | null> {
    return await this.prisma.file.findUnique({ where: { id } })
  }

  async findByUserId(userId: string): Promise<File[]> {
    return await this.prisma.file.findMany({
      where: { userId },
      include: { folder: true },
    })
  }

  async findByFolderId(folderId: string): Promise<File[]> {
    return await this.prisma.file.findMany({
      where: { folderId },
      include: { folder: true },
    })
  }

  async findRootFilesByUserId(userId: string): Promise<File[]> {
    return await this.prisma.file.findMany({
      where: { userId, folderId: null },
      include: { folder: true },
    })
  }

  async create(data: CreateFileData): Promise<File> {
    return await this.prisma.file.create({ data })
  }

  async update(id: string, data: UpdateFileData): Promise<File> {
    return await this.prisma.file.update({ where: { id }, data })
  }

  async delete(id: string): Promise<File> {
    return await this.prisma.file.delete({ where: { id } })
  }

  async exists(id: string): Promise<boolean> {
    return (await this.prisma.file.findUnique({ where: { id } })) !== null
  }

  async belongsToUser(id: string, userId: string): Promise<boolean> {
    const file = await this.prisma.file.findFirst({ where: { id, userId } })
    return !!file
  }

  async findByS3Key(s3Key: string): Promise<File | null> {
    return await this.prisma.file.findFirst({ where: { s3Key } })
  }
}
