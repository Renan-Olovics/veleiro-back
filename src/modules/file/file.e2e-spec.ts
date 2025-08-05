import { ValidationPipe, type INestApplication } from '@nestjs/common'

import { faker } from '@faker-js/faker'
import { mockDeep } from 'jest-mock-extended'
import * as request from 'supertest'

import { AppModule } from '@/app.module'
import { createModule } from '@/config/test/module'
import { PrismaService, S3Service } from '@/services'

describe('FileController (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let s3Service: S3Service
  let authToken: string
  let userId: string
  let folderId: string
  let httpRequest: ReturnType<typeof request>

  beforeAll(async () => {
    const module = await createModule({
      imports: [AppModule],
      providers: [{ provide: S3Service, useValue: mockDeep<S3Service>() }],
    })

    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe())
    await app.init()

    prisma = app.get<PrismaService>(PrismaService)
    s3Service = app.get<S3Service>(S3Service)
    httpRequest = request(app.getHttpServer())

    const userRes = await httpRequest
      .post('/user/create')
      .send({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
      })
      .expect(201)

    userId = userRes.body.id
    authToken = userRes.body.access_token

    const folderRes = await httpRequest
      .post('/folder/create')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: faker.lorem.word(), description: faker.lorem.sentence() })
      .expect(201)

    folderId = folderRes.body.id

    jest.spyOn(s3Service, 'generateKey').mockReturnValue('users/test/test-file.txt')
    jest
      .spyOn(s3Service, 'uploadFile')
      .mockResolvedValue('https://s3.amazonaws.com/bucket/test-file.txt')
    jest
      .spyOn(s3Service, 'generateDownloadUrl')
      .mockResolvedValue('https://s3.amazonaws.com/bucket/test-file.txt?signature=abc123')
    jest.spyOn(s3Service, 'deleteFile').mockResolvedValue()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('/files/upload (POST)', () => {
    it('should upload a file successfully', async () => {
      const fileBuffer = Buffer.from('test file content')

      const response = await httpRequest
        .post('/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', fileBuffer, 'test.txt')
        .query({ description: 'Test file' })

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body.name).toBe('test.txt')
      expect(response.body.userId).toBe(userId)
      expect(response.body.folderId).toBeNull()
    })

    it('should upload a file to a folder successfully', async () => {
      const fileBuffer = Buffer.from('test file content for folder')

      const response = await httpRequest
        .post('/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', fileBuffer, 'folder-test.txt')
        .query({
          folderId,
          description: 'Test file in folder',
        })

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body.name).toBe('folder-test.txt')
      expect(response.body.userId).toBe(userId)
      expect(response.body.folderId).toBe(folderId)
    })

    it('should fail to upload to non-existent folder', async () => {
      const fileBuffer = Buffer.from('test file content')

      const response = await httpRequest
        .post('/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', fileBuffer, 'test.txt')
        .query({ folderId: 'non-existent-folder-id' })

      expect(response.status).toBe(400)
    })
  })

  describe('/files (GET)', () => {
    it('should get all files for the user', async () => {
      const fileBuffer = Buffer.from('test file content')
      await httpRequest
        .post('/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', fileBuffer, 'test.txt')
        .query({ description: 'Test file' })
        .expect(201)

      const response = await httpRequest.get('/files').set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
    })
  })

  describe('/files/root (GET)', () => {
    it('should get root files (not in folders)', async () => {
      const response = await httpRequest
        .get('/files/root')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
    })
  })

  describe('/files/folder/:folderId (GET)', () => {
    it('should get files in a specific folder', async () => {
      const response = await httpRequest
        .get(`/files/folder/${folderId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
    })

    it('should fail to get files from non-existent folder', async () => {
      const response = await httpRequest
        .get('/files/folder/non-existent-folder-id')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(404)
    })
  })

  describe('/files/:id (GET)', () => {
    let fileId: string

    beforeEach(async () => {
      const file = await prisma.file.create({
        data: {
          name: 'test-get.txt',
          originalName: 'test-get.txt',
          description: 'Test file for GET',
          mimeType: 'text/plain',
          size: 1024,
          s3Url: 'https://s3.amazonaws.com/bucket/test-get.txt',
          s3Key: 'users/test/test-get.txt',
          userId,
        },
      })
      fileId = file.id
    })

    it('should get a specific file by ID', async () => {
      const response = await httpRequest
        .get(`/files/${fileId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.id).toBe(fileId)
      expect(response.body.name).toBe('test-get.txt')
    })

    it('should fail to get non-existent file', async () => {
      const response = await httpRequest
        .get('/files/non-existent-file-id')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(404)
    })
  })

  describe('/files/:id/download-url (GET)', () => {
    let fileId: string

    beforeEach(async () => {
      const file = await prisma.file.create({
        data: {
          name: 'test-download.txt',
          originalName: 'test-download.txt',
          description: 'Test file for download',
          mimeType: 'text/plain',
          size: 1024,
          s3Url: 'https://s3.amazonaws.com/bucket/test-download.txt',
          s3Key: 'users/test/test-download.txt',
          userId,
        },
      })
      fileId = file.id
    })

    it('should generate download URL for a file', async () => {
      const response = await httpRequest
        .get(`/files/${fileId}/download-url`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('downloadUrl')
      expect(typeof response.body.downloadUrl).toBe('string')
    })
  })

  describe('/files/:id (PUT)', () => {
    let fileId: string

    beforeEach(async () => {
      const file = await prisma.file.create({
        data: {
          name: 'test-update.txt',
          originalName: 'test-update.txt',
          description: 'Test file for update',
          mimeType: 'text/plain',
          size: 1024,
          s3Url: 'https://s3.amazonaws.com/bucket/test-update.txt',
          s3Key: 'users/test/test-update.txt',
          userId,
        },
      })
      fileId = file.id
    })

    it('should update a file successfully', async () => {
      const updateData = {
        name: 'updated-test.txt',
        description: 'Updated description',
      }

      const response = await httpRequest
        .put(`/files/${fileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)

      expect(response.status).toBe(200)
      expect(response.body.name).toBe('updated-test.txt')
      expect(response.body.description).toBe('Updated description')
    })

    it('should fail to update non-existent file', async () => {
      const updateData = {
        name: 'updated-test.txt',
        description: 'Updated description',
      }

      const response = await httpRequest
        .put('/files/non-existent-file-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)

      expect(response.status).toBe(404)
    })
  })

  describe('/files/:id/move (PUT)', () => {
    let fileId: string

    beforeEach(async () => {
      const file = await prisma.file.create({
        data: {
          name: 'test-move.txt',
          originalName: 'test-move.txt',
          description: 'Test file for move',
          mimeType: 'text/plain',
          size: 1024,
          s3Url: 'https://s3.amazonaws.com/bucket/test-move.txt',
          s3Key: 'users/test/test-move.txt',
          userId,
        },
      })
      fileId = file.id
    })

    it('should move file to folder successfully', async () => {
      const response = await httpRequest
        .put(`/files/${fileId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ folderId })

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('File moved successfully')
    })

    it('should move file to root successfully', async () => {
      const response = await httpRequest
        .put(`/files/${fileId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ folderId: null })

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('File moved successfully')
    })
  })

  describe('/files/:id (DELETE)', () => {
    let fileId: string

    beforeEach(async () => {
      const file = await prisma.file.create({
        data: {
          name: 'test-delete.txt',
          originalName: 'test-delete.txt',
          description: 'Test file for deletion',
          mimeType: 'text/plain',
          size: 1024,
          s3Url: 'https://s3.amazonaws.com/bucket/test-delete.txt',
          s3Key: 'users/test/test-delete.txt',
          userId,
        },
      })
      fileId = file.id
    })

    it('should delete a file successfully', async () => {
      const response = await httpRequest
        .delete(`/files/${fileId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('File deleted successfully')
    })

    it('should fail to delete non-existent file', async () => {
      const response = await httpRequest
        .delete('/files/non-existent-file-id')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(404)
    })
  })
})
