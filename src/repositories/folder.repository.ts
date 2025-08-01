import { Injectable } from '@nestjs/common'

import { type Folder } from '@prisma/client'

import { CreateFolderData } from '@/modules/folder/types'
import { PrismaService } from '@/services'

@Injectable()
export class FolderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Folder | null> {
    return await this.prisma.folder.findUnique({ where: { id } })
  }

  async findByIdWithChildren(id: string): Promise<Folder | null> {
    return await this.prisma.folder.findUnique({
      where: { id },
      include: { children: true, files: true },
    })
  }

  async findByUserId(userId: string): Promise<Folder[]> {
    return await this.prisma.folder.findMany({
      where: { userId },
      include: { children: true, files: true },
    })
  }

  async findRootFoldersByUserId(userId: string): Promise<Folder[]> {
    return await this.prisma.folder.findMany({
      where: { userId, parentId: null },
      include: { children: true, files: true },
    })
  }

  async create(data: CreateFolderData): Promise<Folder> {
    return await this.prisma.folder.create({ data })
  }

  async update(
    id: string,
    data: Partial<Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Folder> {
    return await this.prisma.folder.update({ where: { id }, data })
  }

  async delete(id: string): Promise<Folder> {
    return await this.prisma.folder.delete({ where: { id } })
  }

  async exists(id: string): Promise<boolean> {
    return (await this.prisma.folder.findUnique({ where: { id } })) !== null
  }

  async belongsToUser(id: string, userId: string): Promise<boolean> {
    const folder = await this.prisma.folder.findFirst({ where: { id, userId } })
    return !!folder
  }
}
