import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'

import { faker } from '@faker-js/faker'
import { mockDeep } from 'jest-mock-extended'

import { createModule } from '@/config/test/module'
import { FolderRepository } from '@/repositories'

import { FolderService } from './folder.service'

describe('FolderService', () => {
  let service: FolderService
  let folderRepository: jest.Mocked<FolderRepository>
  let userId: string
  let folderId: string
  let parentId: string

  const makeFolder = (overrides = {}) => ({
    id: folderId,
    name: 'Test Folder',
    description: 'Test description',
    color: '#3B82F6',
    userId,
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })

  beforeEach(async () => {
    folderRepository = mockDeep<FolderRepository>()
    const module = await createModule({
      providers: [FolderService, { provide: FolderRepository, useValue: folderRepository }],
    })
    service = module.get<FolderService>(FolderService)
    userId = faker.string.uuid()
    folderId = faker.string.uuid()
    parentId = faker.string.uuid()
  })

  describe('create', () => {
    it('should create folder without parent', async () => {
      const folderData = {
        name: 'Test Folder',
        description: 'Test description',
        color: '#3B82F6',
        userId,
      }

      folderRepository.create.mockResolvedValue(makeFolder(folderData))

      const result = await service.create(folderData)

      expect(folderRepository.create).toHaveBeenCalledWith(folderData)
      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('name', 'Test Folder')
    })

    it('should create folder with valid parent', async () => {
      const parentFolder = makeFolder({ id: parentId, userId })
      const folderData = {
        name: 'Child Folder',
        parentId,
        userId,
      }

      folderRepository.findById.mockResolvedValue(parentFolder)
      folderRepository.create.mockResolvedValue(makeFolder(folderData))

      const result = await service.create(folderData)

      expect(folderRepository.findById).toHaveBeenCalledWith(parentId)
      expect(folderRepository.create).toHaveBeenCalledWith(folderData)
      expect(result).toHaveProperty('parentId', parentId)
    })

    it('should throw if parent folder not found', async () => {
      const folderData = {
        name: 'Child Folder',
        parentId,
        userId,
      }

      folderRepository.findById.mockResolvedValue(null)

      await expect(service.create(folderData)).rejects.toThrow(BadRequestException)
      expect(folderRepository.findById).toHaveBeenCalledWith(parentId)
    })

    it('should throw if parent folder does not belong to user', async () => {
      const parentFolder = makeFolder({
        id: parentId,
        userId: faker.string.uuid(),
      })
      const folderData = {
        name: 'Child Folder',
        parentId,
        userId,
      }

      folderRepository.findById.mockResolvedValue(parentFolder)

      await expect(service.create(folderData)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('findAll', () => {
    it('should return all folders for user', async () => {
      const folders = [makeFolder(), makeFolder({ id: faker.string.uuid() })]
      folderRepository.findByUserId.mockResolvedValue(folders)

      const result = await service.findAll(userId)

      expect(folderRepository.findByUserId).toHaveBeenCalledWith(userId)
      expect(result).toEqual(folders)
    })
  })

  describe('findRootFolders', () => {
    it('should return only root folders for user', async () => {
      const rootFolders = [makeFolder(), makeFolder({ id: faker.string.uuid() })]
      folderRepository.findRootFoldersByUserId.mockResolvedValue(rootFolders)

      const result = await service.findRootFolders(userId)

      expect(folderRepository.findRootFoldersByUserId).toHaveBeenCalledWith(userId)
      expect(result).toEqual(rootFolders)
    })
  })

  describe('findById', () => {
    it('should return folder with children and files', async () => {
      const folder = makeFolder()
      folderRepository.findByIdWithChildren.mockResolvedValue(folder)

      const result = await service.findById(folderId, userId)

      expect(folderRepository.findByIdWithChildren).toHaveBeenCalledWith(folderId)
      expect(result).toEqual(folder)
    })

    it('should throw if folder not found', async () => {
      folderRepository.findByIdWithChildren.mockResolvedValue(null)

      await expect(service.findById(folderId, userId)).rejects.toThrow(NotFoundException)
    })

    it('should throw if folder does not belong to user', async () => {
      const folder = makeFolder({ userId: faker.string.uuid() })
      folderRepository.findByIdWithChildren.mockResolvedValue(folder)

      await expect(service.findById(folderId, userId)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('update', () => {
    it('should update folder successfully', async () => {
      const folder = makeFolder()
      const updateData = { name: 'Updated Folder' }
      const updatedFolder = { ...folder, ...updateData }

      folderRepository.findById.mockResolvedValue(folder)
      folderRepository.update.mockResolvedValue(updatedFolder)

      const result = await service.update(folderId, updateData, userId)

      expect(folderRepository.findById).toHaveBeenCalledWith(folderId)
      expect(folderRepository.update).toHaveBeenCalledWith(folderId, updateData)
      expect(result).toHaveProperty('name', 'Updated Folder')
    })

    it('should throw if folder not found', async () => {
      const updateData = { name: 'Updated Folder' }

      folderRepository.findById.mockResolvedValue(null)

      await expect(service.update(folderId, updateData, userId)).rejects.toThrow(NotFoundException)
    })

    it('should throw if folder does not belong to user', async () => {
      const folder = makeFolder({ userId: faker.string.uuid() })
      const updateData = { name: 'Updated Folder' }

      folderRepository.findById.mockResolvedValue(folder)

      await expect(service.update(folderId, updateData, userId)).rejects.toThrow(ForbiddenException)
    })

    it('should throw if trying to set folder as its own parent', async () => {
      const folder = makeFolder()
      const updateData = { parentId: folderId }

      folderRepository.findById.mockResolvedValue(folder)

      await expect(service.update(folderId, updateData, userId)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('should throw if parent folder not found', async () => {
      const folder = makeFolder()
      const updateData = { parentId: faker.string.uuid() }

      folderRepository.findById
        .mockResolvedValueOnce(folder) // First call for the folder being updated
        .mockResolvedValueOnce(null) // Second call for the parent folder

      await expect(service.update(folderId, updateData, userId)).rejects.toThrow(
        BadRequestException,
      )
    })
  })

  describe('delete', () => {
    it('should delete folder successfully', async () => {
      const folder = makeFolder()

      folderRepository.findById.mockResolvedValue(folder)
      folderRepository.delete.mockResolvedValue(folder)

      await service.delete(folderId, userId)

      expect(folderRepository.findById).toHaveBeenCalledWith(folderId)
      expect(folderRepository.delete).toHaveBeenCalledWith(folderId)
    })

    it('should throw if folder not found', async () => {
      folderRepository.findById.mockResolvedValue(null)

      await expect(service.delete(folderId, userId)).rejects.toThrow(NotFoundException)
    })

    it('should throw if folder does not belong to user', async () => {
      const folder = makeFolder({ userId: faker.string.uuid() })

      folderRepository.findById.mockResolvedValue(folder)

      await expect(service.delete(folderId, userId)).rejects.toThrow(ForbiddenException)
    })
  })
})
