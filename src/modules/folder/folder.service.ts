import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import { Folder } from '@prisma/client'

import { FolderRepository } from '@/repositories'

import { CreateFolderData, UpdateFolderData } from './types'

@Injectable()
export class FolderService {
  constructor(private readonly folderRepository: FolderRepository) {}

  async create(
    data: CreateFolderData,
  ): Promise<Omit<Folder, 'createdAt' | 'updatedAt' | 'userId'>> {
    if (data.parentId) {
      const parentFolder = await this.folderRepository.findById(data.parentId)
      if (!parentFolder) {
        throw new BadRequestException('Parent folder not found')
      }
      if (parentFolder.userId !== data.userId) {
        throw new ForbiddenException('Parent folder does not belong to user')
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { createdAt, updatedAt, userId, ...folder } = await this.folderRepository.create(data)
    return folder
  }

  async findAll(userId: string): Promise<Omit<Folder, 'createdAt' | 'updatedAt' | 'userId'>[]> {
    return this.folderRepository.findByUserId(userId)
  }

  async findRootFolders(userId: string): Promise<Folder[]> {
    return this.folderRepository.findRootFoldersByUserId(userId)
  }

  async findById(id: string, userId: string) {
    const folder = await this.folderRepository.findByIdWithChildren(id)
    if (!folder) {
      throw new NotFoundException('Folder not found')
    }
    if (folder.userId !== userId) {
      throw new ForbiddenException('Folder does not belong to user')
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { createdAt, updatedAt, userId: _, ...data } = folder
    return data
  }

  async update(
    id: string,
    data: UpdateFolderData,
    userId: string,
  ): Promise<Omit<Folder, 'createdAt' | 'updatedAt' | 'userId'>> {
    const folder = await this.folderRepository.findById(id)
    if (!folder) {
      throw new NotFoundException('Folder not found')
    }
    if (folder.userId !== userId) {
      throw new ForbiddenException('Folder does not belong to user')
    }

    if (data.parentId) {
      if (data.parentId === id) {
        throw new BadRequestException('Folder cannot be its own parent')
      }

      const parentFolder = await this.folderRepository.findById(data.parentId)
      if (!parentFolder) {
        throw new BadRequestException('Parent folder not found')
      }
      if (parentFolder.userId !== userId) {
        throw new ForbiddenException('Parent folder does not belong to user')
      }

      if (await this.wouldCreateCircularReference(id, data.parentId)) {
        throw new BadRequestException('Cannot create circular reference')
      }
    }

    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      createdAt,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      updatedAt,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      userId: _,
      ...updatedFolder
    } = await this.folderRepository.update(id, data)

    return updatedFolder
  }

  async delete(id: string, userId: string): Promise<void> {
    // Check if folder exists and belongs to user
    const folder = await this.folderRepository.findById(id)
    if (!folder) {
      throw new NotFoundException('Folder not found')
    }
    if (folder.userId !== userId) {
      throw new ForbiddenException('Folder does not belong to user')
    }

    await this.folderRepository.delete(id)
  }

  private async wouldCreateCircularReference(
    folderId: string,
    newParentId: string,
  ): Promise<boolean> {
    let currentId = newParentId

    while (currentId) {
      if (currentId === folderId) {
        return true
      }

      const parent = await this.folderRepository.findById(currentId)
      if (!parent?.parentId) {
        break
      }

      currentId = parent.parentId
    }

    return false
  }
}
