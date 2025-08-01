import { Test, TestingModule } from '@nestjs/testing'
import { S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { S3Service } from './s3.service'

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3')
jest.mock('@aws-sdk/s3-request-presigner')

describe('S3Service', () => {
  let service: S3Service
  let mockS3Client: jest.Mocked<S3Client>

  const mockSend = jest.fn()
  const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>

  beforeEach(async () => {
    // Mock environment variables
    process.env.AWS_REGION = 'us-east-1'
    process.env.AWS_S3_BUCKET = 'test-bucket'
    process.env.AWS_ACCESS_KEY_ID = 'test-access-key'
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key'

    // Mock S3Client
    mockS3Client = {
      send: mockSend,
    } as any
    ;(S3Client as jest.MockedClass<typeof S3Client>).mockImplementation(() => mockS3Client)

    const module: TestingModule = await Test.createTestingModule({
      providers: [S3Service],
    }).compile()

    service = module.get<S3Service>(S3Service)

    // Reset mocks
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const fileBuffer = Buffer.from('test file content')
      const options = {
        key: 'test-file.txt',
        file: fileBuffer,
        contentType: 'text/plain',
      }

      mockSend.mockResolvedValueOnce({})

      const result = await service.uploadFile(options)

      expect(mockSend).toHaveBeenCalled()
      expect(result).toBe('https://test-bucket.s3.amazonaws.com/test-file.txt')
    })

    it('should throw error on upload failure', async () => {
      const options = {
        key: 'test-file.txt',
        file: Buffer.from('test'),
        contentType: 'text/plain',
      }

      mockSend.mockRejectedValueOnce(new Error('Upload failed'))

      await expect(service.uploadFile(options)).rejects.toThrow(
        'Failed to upload file: Upload failed',
      )
    })
  })

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const key = 'test-file.txt'
      mockSend.mockResolvedValueOnce({})

      await service.deleteFile(key)

      expect(mockSend).toHaveBeenCalled()
    })

    it('should throw error on delete failure', async () => {
      const key = 'test-file.txt'
      mockSend.mockRejectedValueOnce(new Error('Delete failed'))

      await expect(service.deleteFile(key)).rejects.toThrow('Failed to delete file: Delete failed')
    })
  })

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      const key = 'test-file.txt'
      mockSend.mockResolvedValueOnce({})

      const result = await service.fileExists(key)

      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalled()
    })

    it('should return false when file does not exist', async () => {
      const key = 'test-file.txt'
      const error = new Error('Not found')
      error.name = 'NotFound'
      mockSend.mockRejectedValueOnce(error)

      const result = await service.fileExists(key)

      expect(result).toBe(false)
    })
  })

  describe('getFileInfo', () => {
    it('should return file info when file exists', async () => {
      const key = 'test-file.txt'
      const mockResponse = {
        ContentLength: 1024,
        LastModified: new Date('2023-01-01'),
        ContentType: 'text/plain',
        Metadata: { custom: 'value' },
      }

      mockSend.mockResolvedValueOnce(mockResponse)

      const result = await service.getFileInfo(key)

      expect(result).toEqual({
        key: 'test-file.txt',
        size: 1024,
        lastModified: new Date('2023-01-01'),
        contentType: 'text/plain',
        metadata: { custom: 'value' },
      })
    })

    it('should return null when file does not exist', async () => {
      const key = 'test-file.txt'
      const error = new Error('Not found')
      error.name = 'NotFound'
      mockSend.mockRejectedValueOnce(error)

      const result = await service.getFileInfo(key)

      expect(result).toBeNull()
    })
  })

  describe('generateUploadUrl', () => {
    it('should generate upload URL successfully', async () => {
      const key = 'test-file.txt'
      const contentType = 'text/plain'
      const expectedUrl = 'https://presigned-upload-url.com'

      mockGetSignedUrl.mockResolvedValueOnce(expectedUrl)

      const result = await service.generateUploadUrl(key, contentType)

      expect(result).toBe(expectedUrl)
      expect(mockGetSignedUrl).toHaveBeenCalled()
    })
  })

  describe('generateDownloadUrl', () => {
    it('should generate download URL successfully', async () => {
      const key = 'test-file.txt'
      const expectedUrl = 'https://presigned-download-url.com'

      mockGetSignedUrl.mockResolvedValueOnce(expectedUrl)

      const result = await service.generateDownloadUrl(key)

      expect(result).toBe(expectedUrl)
      expect(mockGetSignedUrl).toHaveBeenCalled()
    })
  })

  describe('getFileUrl', () => {
    it('should return correct public URL', () => {
      const key = 'test-file.txt'
      const result = service.getFileUrl(key)

      expect(result).toBe('https://test-bucket.s3.amazonaws.com/test-file.txt')
    })
  })

  describe('generateKey', () => {
    it('should generate unique key for file', () => {
      const originalName = 'My Document.pdf'
      const userId = 'user123'
      const folderId = 'folder456'

      const result = service.generateKey(originalName, userId, folderId)

      expect(result).toMatch(/^users\/user123\/folders\/folder456\/my_document_\d+_[a-z0-9]+\.pdf$/)
    })

    it('should generate key for root folder', () => {
      const originalName = 'image.jpg'
      const userId = 'user123'

      const result = service.generateKey(originalName, userId)

      expect(result).toMatch(/^users\/user123\/root\/image_\d+_[a-z0-9]+\.jpg$/)
    })

    it('should handle files without extension', () => {
      const originalName = 'README'
      const userId = 'user123'

      const result = service.generateKey(originalName, userId)

      expect(result).toMatch(/^users\/user123\/root\/readme_\d+_[a-z0-9]+$/)
    })
  })

  describe('copyFile', () => {
    it('should copy file successfully', async () => {
      const sourceKey = 'source/file.txt'
      const destinationKey = 'destination/file.txt'

      mockSend.mockResolvedValueOnce({})

      const result = await service.copyFile(sourceKey, destinationKey)

      expect(mockSend).toHaveBeenCalled()
      expect(result).toBe('https://test-bucket.s3.amazonaws.com/destination/file.txt')
    })
  })

  describe('getFileSize', () => {
    it('should return file size in multiple formats', async () => {
      const key = 'test-file.txt'
      const mockFileInfo = {
        key: 'test-file.txt',
        size: 2048,
        lastModified: new Date(),
        contentType: 'text/plain',
      }

      jest.spyOn(service, 'getFileInfo').mockResolvedValueOnce(mockFileInfo)

      const result = await service.getFileSize(key)

      expect(result).toEqual({
        bytes: 2048,
        kilobytes: 2.00,
        megabytes: 0.00,
        gigabytes: 0.00,
        formatted: '2.00 KB',
      })
    })

    it('should return zero sizes when file does not exist', async () => {
      const key = 'test-file.txt'

      jest.spyOn(service, 'getFileInfo').mockResolvedValueOnce(null)

      const result = await service.getFileSize(key)

      expect(result).toEqual({
        bytes: 0,
        kilobytes: 0.00,
        megabytes: 0.00,
        gigabytes: 0.00,
        formatted: '0 B',
      })
    })

    it('should format large files correctly', async () => {
      const key = 'large-file.txt'
      const mockFileInfo = {
        key: 'large-file.txt',
        size: 1572864, // 1.5 MB
        lastModified: new Date(),
        contentType: 'text/plain',
      }

      jest.spyOn(service, 'getFileInfo').mockResolvedValueOnce(mockFileInfo)

      const result = await service.getFileSize(key)

      expect(result).toEqual({
        bytes: 1572864,
        kilobytes: 1536.00,
        megabytes: 1.50,
        gigabytes: 0.00,
        formatted: '1.50 MB',
      })
    })

    it('should format very large files correctly', async () => {
      const key = 'huge-file.txt'
      const mockFileInfo = {
        key: 'huge-file.txt',
        size: 2147483648, // 2 GB
        lastModified: new Date(),
        contentType: 'text/plain',
      }

      jest.spyOn(service, 'getFileInfo').mockResolvedValueOnce(mockFileInfo)

      const result = await service.getFileSize(key)

      expect(result).toEqual({
        bytes: 2147483648,
        kilobytes: 2097152.00,
        megabytes: 2048.00,
        gigabytes: 2.00,
        formatted: '2.00 GB',
      })
    })
  })
})
