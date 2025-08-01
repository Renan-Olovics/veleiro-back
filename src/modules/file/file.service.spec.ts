import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'

import { type File, type Folder } from '@prisma/client'
import { mockDeep, mockReset } from 'jest-mock-extended'

import { createModule } from '@/config/test/module'
import { FileRepository, FolderRepository } from '@/repositories'
import { S3Service } from '@/services'

import { FileService } from './file.service'
import { type CreateFileData, type UpdateFileData } from './types'

describe('FileService', () => {
  let service: FileService
  let fileRepository: jest.Mocked<FileRepository>
  let folderRepository: jest.Mocked<FolderRepository>
  let s3Service: jest.Mocked<S3Service>

  const mockFile: File = {
    id: 'file-1',
    name: 'test.pdf',
    originalName: 'test.pdf',
    description: 'Test file',
    mimeType: 'application/pdf',
    size: 1024,
    s3Url: 'https://s3.amazonaws.com/bucket/file-1',
    s3Key: 'users/user-1/root/test_123456_abc.pdf',
    extension: '.pdf',
    pulseData: null,
    userId: 'user-1',
    folderId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockFolder: Folder = {
    id: 'folder-1',
    name: 'Test Folder',
    description: 'Test folder',
    color: '#3B82F6',
    userId: 'user-1',
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(async () => {
    const module = await createModule({
      providers: [
        FileService,
        {
          provide: FileRepository,
          useValue: mockDeep<FileRepository>(),
        },
        {
          provide: FolderRepository,
          useValue: mockDeep<FolderRepository>(),
        },
        {
          provide: S3Service,
          useValue: mockDeep<S3Service>(),
        },
      ],
    })

    service = module.get<FileService>(FileService)
    fileRepository = module.get(FileRepository)
    folderRepository = module.get(FolderRepository)
    s3Service = module.get(S3Service)

    mockReset(fileRepository)
    mockReset(folderRepository)
    mockReset(s3Service)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    const createFileData: CreateFileData = {
      name: 'test.pdf',
      originalName: 'test.pdf',
      description: 'Test file',
      mimeType: 'application/pdf',
      size: 1024,
      s3Url: 'https://s3.amazonaws.com/bucket/file-1',
      s3Key: 'users/user-1/root/test_123456_abc.pdf',
      extension: '.pdf',
      pulseData: null,
      userId: 'user-1',
      folderId: null,
    }

    it('should create a file successfully', async () => {
      fileRepository.create.mockResolvedValue(mockFile)

      const result = await service.create(createFileData)

      expect(fileRepository.create).toHaveBeenCalledWith(createFileData)
      expect(result).toEqual({
        id: mockFile.id,
        name: mockFile.name,
        originalName: mockFile.originalName,
        description: mockFile.description,
        mimeType: mockFile.mimeType,
        size: mockFile.size,
        s3Url: mockFile.s3Url,
        s3Key: mockFile.s3Key,
        extension: mockFile.extension,
        pulseData: mockFile.pulseData,
        userId: mockFile.userId,
        folderId: mockFile.folderId,
      })
    })

    it('should create a file in a folder successfully', async () => {
      const fileWithFolder = { ...createFileData, folderId: 'folder-1' }
      const fileInFolder = { ...mockFile, folderId: 'folder-1' }

      folderRepository.findById.mockResolvedValue(mockFolder)
      fileRepository.create.mockResolvedValue(fileInFolder)

      const result = await service.create(fileWithFolder)

      expect(folderRepository.findById).toHaveBeenCalledWith('folder-1')
      expect(fileRepository.create).toHaveBeenCalledWith(fileWithFolder)
      expect(result.folderId).toBe('folder-1')
    })

    it('should throw BadRequestException when folder not found', async () => {
      const fileWithFolder = { ...createFileData, folderId: 'non-existent' }

      folderRepository.findById.mockResolvedValue(null)

      await expect(service.create(fileWithFolder)).rejects.toThrow(BadRequestException)
      expect(folderRepository.findById).toHaveBeenCalledWith('non-existent')
    })

    it('should throw ForbiddenException when folder does not belong to user', async () => {
      const fileWithFolder = { ...createFileData, folderId: 'folder-1' }
      const otherUserFolder = { ...mockFolder, userId: 'user-2' }

      folderRepository.findById.mockResolvedValue(otherUserFolder)

      await expect(service.create(fileWithFolder)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('uploadFile', () => {
    const mockUploadedFile = {
      originalname: 'test.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('test'),
    } as Express.Multer.File

    it('should upload a file successfully', async () => {
      s3Service.generateKey.mockReturnValue('users/user-1/root/test_123456_abc.pdf')
      s3Service.uploadFile.mockResolvedValue('https://s3.amazonaws.com/bucket/file-1')
      fileRepository.create.mockResolvedValue(mockFile)

      const result = await service.uploadFile(mockUploadedFile, 'user-1')

      expect(s3Service.generateKey).toHaveBeenCalledWith('test.pdf', 'user-1', undefined)
      expect(s3Service.uploadFile).toHaveBeenCalledWith({
        key: 'users/user-1/root/test_123456_abc.pdf',
        file: mockUploadedFile.buffer,
        contentType: 'application/pdf',
        metadata: {
          originalName: 'test.pdf',
          userId: 'user-1',
          folderId: 'root',
        },
      })
      expect(result).toBeDefined()
    })

    it('should upload a file to a folder successfully', async () => {
      s3Service.generateKey.mockReturnValue('users/user-1/folders/folder-1/test_123456_abc.pdf')
      s3Service.uploadFile.mockResolvedValue('https://s3.amazonaws.com/bucket/file-1')
      folderRepository.findById.mockResolvedValue(mockFolder)
      fileRepository.create.mockResolvedValue({ ...mockFile, folderId: 'folder-1' })

      const result = await service.uploadFile(
        mockUploadedFile,
        'user-1',
        'folder-1',
        'Test description',
      )

      expect(folderRepository.findById).toHaveBeenCalledWith('folder-1')
      expect(s3Service.generateKey).toHaveBeenCalledWith('test.pdf', 'user-1', 'folder-1')
      expect(result).toBeDefined()
    })
  })

  describe('findAll', () => {
    it('should return all files for a user', async () => {
      const files = [mockFile]
      fileRepository.findByUserId.mockResolvedValue(files)

      const result = await service.findAll('user-1')

      expect(fileRepository.findByUserId).toHaveBeenCalledWith('user-1')
      expect(result).toEqual(files)
    })
  })

  describe('findById', () => {
    it('should return a file by id', async () => {
      fileRepository.findById.mockResolvedValue(mockFile)

      const result = await service.findById('file-1', 'user-1')

      expect(fileRepository.findById).toHaveBeenCalledWith('file-1')
      expect(result).toEqual(mockFile)
    })

    it('should throw NotFoundException when file not found', async () => {
      fileRepository.findById.mockResolvedValue(null)

      await expect(service.findById('non-existent', 'user-1')).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException when file does not belong to user', async () => {
      const otherUserFile = { ...mockFile, userId: 'user-2' }
      fileRepository.findById.mockResolvedValue(otherUserFile)

      await expect(service.findById('file-1', 'user-1')).rejects.toThrow(ForbiddenException)
    })
  })

  describe('update', () => {
    const updateData: UpdateFileData = {
      name: 'updated.pdf',
      description: 'Updated description',
    }

    it('should update a file successfully', async () => {
      const updatedFile = { ...mockFile, ...updateData }
      fileRepository.findById.mockResolvedValue(mockFile)
      fileRepository.update.mockResolvedValue(updatedFile)

      const result = await service.update('file-1', updateData, 'user-1')

      expect(fileRepository.findById).toHaveBeenCalledWith('file-1')
      expect(fileRepository.update).toHaveBeenCalledWith('file-1', updateData)
      expect(result.name).toBe('updated.pdf')
    })

    it('should throw NotFoundException when file not found', async () => {
      fileRepository.findById.mockResolvedValue(null)

      await expect(service.update('non-existent', updateData, 'user-1')).rejects.toThrow(
        NotFoundException,
      )
    })

    it('should throw ForbiddenException when file does not belong to user', async () => {
      const otherUserFile = { ...mockFile, userId: 'user-2' }
      fileRepository.findById.mockResolvedValue(otherUserFile)

      await expect(service.update('file-1', updateData, 'user-1')).rejects.toThrow(
        ForbiddenException,
      )
    })
  })

  describe('delete', () => {
    it('should delete a file successfully', async () => {
      fileRepository.findById.mockResolvedValue(mockFile)
      s3Service.deleteFile.mockResolvedValue()
      fileRepository.delete.mockResolvedValue(mockFile)

      await service.delete('file-1', 'user-1')

      expect(fileRepository.findById).toHaveBeenCalledWith('file-1')
      expect(s3Service.deleteFile).toHaveBeenCalledWith(mockFile.s3Key)
      expect(fileRepository.delete).toHaveBeenCalledWith('file-1')
    })

    it('should throw NotFoundException when file not found', async () => {
      fileRepository.findById.mockResolvedValue(null)

      await expect(service.delete('non-existent', 'user-1')).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException when file does not belong to user', async () => {
      const otherUserFile = { ...mockFile, userId: 'user-2' }
      fileRepository.findById.mockResolvedValue(otherUserFile)

      await expect(service.delete('file-1', 'user-1')).rejects.toThrow(ForbiddenException)
    })
  })

  describe('generateDownloadUrl', () => {
    it('should generate download URL successfully', async () => {
      const downloadUrl = 'https://s3.amazonaws.com/bucket/file-1?signature=abc123'
      fileRepository.findById.mockResolvedValue(mockFile)
      s3Service.generateDownloadUrl.mockResolvedValue(downloadUrl)

      const result = await service.generateDownloadUrl('file-1', 'user-1')

      expect(fileRepository.findById).toHaveBeenCalledWith('file-1')
      expect(s3Service.generateDownloadUrl).toHaveBeenCalledWith(mockFile.s3Key)
      expect(result).toBe(downloadUrl)
    })
  })

  describe('moveToFolder', () => {
    it('should move file to folder successfully', async () => {
      fileRepository.findById.mockResolvedValue(mockFile)
      folderRepository.findById.mockResolvedValue(mockFolder)
      fileRepository.update.mockResolvedValue({ ...mockFile, folderId: 'folder-1' })

      await service.moveToFolder('file-1', 'folder-1', 'user-1')

      expect(fileRepository.findById).toHaveBeenCalledWith('file-1')
      expect(folderRepository.findById).toHaveBeenCalledWith('folder-1')
      expect(fileRepository.update).toHaveBeenCalledWith('file-1', { folderId: 'folder-1' })
    })

    it('should move file to root successfully', async () => {
      const fileInFolder = { ...mockFile, folderId: 'folder-1' }
      fileRepository.findById.mockResolvedValue(fileInFolder)
      fileRepository.update.mockResolvedValue({ ...mockFile, folderId: null })

      await service.moveToFolder('file-1', null, 'user-1')

      expect(fileRepository.findById).toHaveBeenCalledWith('file-1')
      expect(fileRepository.update).toHaveBeenCalledWith('file-1', { folderId: null })
    })
  })
})
