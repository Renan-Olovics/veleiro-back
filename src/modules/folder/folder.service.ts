import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { Folder } from '@prisma/client'

import { FolderRepository } from '@/repositories'

import { CreateFolderData, UpdateFolderData } from './types'

@Injectable()
export class FolderService {
  constructor(private readonly folderRepository: FolderRepository) {}

  async create(data: CreateFolderData): Promise<Omit<Folder, 'createdAt' | 'updatedAt'>> {
    // Validate parent folder if provided
    if (data.parentId) {
      const parentFolder = await this.folderRepository.findById(data.parentId)
      if (!parentFolder) {
        throw new BadRequestException('Parent folder not found')
      }
      if (parentFolder.userId !== data.userId) {
        throw new ForbiddenException('Parent folder does not belong to user')
      }
    }

    const { createdAt, updatedAt, ...folder } = await this.folderRepository.create(data)
    return folder
  }

  async findAll(userId: string): Promise<Folder[]> {
    return this.folderRepository.findByUserId(userId)
  }

  async findRootFolders(userId: string): Promise<Folder[]> {
    return this.folderRepository.findRootFoldersByUserId(userId)
  }

  async findById(id: string, userId: string): Promise<Folder> {
    const folder = await this.folderRepository.findByIdWithChildren(id)
    if (!folder) {
      throw new NotFoundException('Folder not found')
    }
    if (folder.userId !== userId) {
      throw new ForbiddenException('Folder does not belong to user')
    }
    return folder
  }

  async update(
    id: string,
    data: UpdateFolderData,
    userId: string,
  ): Promise<Omit<Folder, 'createdAt' | 'updatedAt'>> {
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

    const { createdAt, updatedAt, ...updatedFolder } = await this.folderRepository.update(id, data)
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
    let currentParentId = newParentId

    while (currentParentId) {
      if (currentParentId === folderId) {
        return true
      }

      const parent = await this.folderRepository.findById(currentParentId)
      if (!parent) {
        break
      }

      currentParentId = parent.parentId || ''
    }

    return false
  }
}
