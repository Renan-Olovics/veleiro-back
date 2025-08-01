import { type INestApplication } from '@nestjs/common'
import { ValidationPipe } from '@nestjs/common'

import { faker } from '@faker-js/faker'
import * as request from 'supertest'

import { AppModule } from '@/app.module'
import { createModule } from '@/config/test/module'

describe('FolderModule (e2e)', () => {
  let app: INestApplication
  let authToken: string
  let userId: string

  beforeAll(async () => {
    const module = await createModule({ imports: [AppModule] })

    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe())
    await app.init()

    const userEmail = faker.internet.email()
    const userPassword = faker.internet.password()
    const userName = faker.person.fullName()

    const userRes = await request(app.getHttpServer())
      .post('/user/create')
      .send({ name: userName, email: userEmail, password: userPassword })
      .expect(201)

    userId = userRes.body.id

    // Login to get auth token
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userEmail, password: userPassword })
      .expect(201)

    authToken = loginRes.body.access_token
  })

  afterAll(async () => {
    await app.close()
  })

  describe('/folder/create (POST)', () => {
    it('should create folder without parent', async () => {
      const folderData = {
        name: 'Test Folder',
        description: 'Test description',
        color: '#3B82F6',
      }

      const res = await request(app.getHttpServer())
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(folderData)
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body).toHaveProperty('name', folderData.name)
      expect(res.body).toHaveProperty('description', folderData.description)
      expect(res.body).toHaveProperty('color', folderData.color)
      expect(res.body).toHaveProperty('userId', userId)
      expect(res.body).toHaveProperty('parentId', null)
    })

    it('should create folder with parent', async () => {
      const parentFolder = await request(app.getHttpServer())
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Parent Folder' })
        .expect(201)

      const childFolderData = {
        name: 'Child Folder',
        parentId: parentFolder.body.id,
      }

      const res = await request(app.getHttpServer())
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(childFolderData)
        .expect(201)

      expect(res.body).toHaveProperty('id')
      expect(res.body).toHaveProperty('name', childFolderData.name)
      expect(res.body).toHaveProperty('parentId', parentFolder.body.id)
    })

    it('should not create folder with invalid parent', async () => {
      const folderData = {
        name: 'Test Folder',
        parentId: faker.string.uuid(),
      }

      await request(app.getHttpServer())
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(folderData)
        .expect(400)
    })

    it('should not create folder without authentication', async () => {
      const folderData = {
        name: 'Test Folder',
      }

      await request(app.getHttpServer()).post('/folder/create').send(folderData).expect(401)
    })

    it('should not create folder without name', async () => {
      const folderData = {
        description: 'Test description',
      }

      await request(app.getHttpServer())
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(folderData)
        .expect(400)
    })
  })

  describe('/folder/all (GET)', () => {
    it('should return all folders for user', async () => {
      const res = await request(app.getHttpServer())
        .get('/folder/all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)
    })

    it('should not return folders without authentication', async () => {
      await request(app.getHttpServer()).get('/folder/all').expect(401)
    })
  })

  describe('/folder/root (GET)', () => {
    it('should return only root folders for user', async () => {
      const res = await request(app.getHttpServer())
        .get('/folder/root')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      res.body.forEach((folder: any) => {
        expect(folder.parentId).toBeNull()
      })
    })
  })

  describe('/folder/:id (GET)', () => {
    it('should return folder by ID with children and files', async () => {
      const folder = await request(app.getHttpServer())
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Folder for Get' })
        .expect(201)

      const res = await request(app.getHttpServer())
        .get(`/folder/${folder.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(res.body).toHaveProperty('id', folder.body.id)
      expect(res.body).toHaveProperty('name', 'Test Folder for Get')
      expect(res.body).toHaveProperty('children')
      expect(res.body).toHaveProperty('files')
    })

    it('should not return folder with invalid ID', async () => {
      await request(app.getHttpServer())
        .get(`/folder/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })

    it('should not return folder without authentication', async () => {
      const folder = await request(app.getHttpServer())
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Folder' })
        .expect(201)

      await request(app.getHttpServer()).get(`/folder/${folder.body.id}`).expect(401)
    })
  })

  describe('/folder/:id (PUT)', () => {
    it('should update folder successfully', async () => {
      const folder = await request(app.getHttpServer())
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Original Name' })
        .expect(201)

      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
        color: '#EF4444',
      }

      const res = await request(app.getHttpServer())
        .put(`/folder/${folder.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)

      expect(res.body).toHaveProperty('name', updateData.name)
      expect(res.body).toHaveProperty('description', updateData.description)
      expect(res.body).toHaveProperty('color', updateData.color)
    })

    it('should not update folder with invalid ID', async () => {
      const updateData = { name: 'Updated Name' }

      await request(app.getHttpServer())
        .put(`/folder/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404)
    })

    it('should not update folder without authentication', async () => {
      const folder = await request(app.getHttpServer())
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Folder' })
        .expect(201)

      const updateData = { name: 'Updated Name' }

      await request(app.getHttpServer())
        .put(`/folder/${folder.body.id}`)
        .send(updateData)
        .expect(401)
    })

    it('should not allow folder to be its own parent', async () => {
      const folder = await request(app.getHttpServer())
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Folder' })
        .expect(201)

      const updateData = { parentId: folder.body.id }

      await request(app.getHttpServer())
        .put(`/folder/${folder.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400)
    })
  })

  describe('/folder/:id (DELETE)', () => {
    it('should delete folder successfully', async () => {
      const folder = await request(app.getHttpServer())
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Folder to Delete' })
        .expect(201)

      const res = await request(app.getHttpServer())
        .delete(`/folder/${folder.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(res.body).toHaveProperty('message', 'Folder deleted successfully')

      await request(app.getHttpServer())
        .get(`/folder/${folder.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })

    it('should not delete folder with invalid ID', async () => {
      await request(app.getHttpServer())
        .delete(`/folder/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })

    it('should not delete folder without authentication', async () => {
      const folder = await request(app.getHttpServer())
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Folder' })
        .expect(201)

      await request(app.getHttpServer()).delete(`/folder/${folder.body.id}`).expect(401)
    })

    it('should delete folder and all its children recursively', async () => {
      const parentFolder = await request(app.getHttpServer())
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Parent Folder' })
        .expect(201)

      const childFolder = await request(app.getHttpServer())
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Child Folder',
          parentId: parentFolder.body.id,
        })
        .expect(201)

      await request(app.getHttpServer())
        .delete(`/folder/${parentFolder.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      await request(app.getHttpServer())
        .get(`/folder/${parentFolder.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      await request(app.getHttpServer())
        .get(`/folder/${childFolder.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })
  })

  describe('Folder hierarchy', () => {
    it('should handle complex folder structure', async () => {
      const rootFolder = await request(app.getHttpServer())
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Root Folder' })
        .expect(201)

      const subFolder = await request(app.getHttpServer())
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Sub Folder',
          parentId: rootFolder.body.id,
        })
        .expect(201)

      const subSubFolder = await request(app.getHttpServer())
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Sub Sub Folder',
          parentId: subFolder.body.id,
        })
        .expect(201)

      const rootWithChildren = await request(app.getHttpServer())
        .get(`/folder/${rootFolder.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(rootWithChildren.body.children).toHaveLength(1)
      expect(rootWithChildren.body.children[0].id).toBe(subFolder.body.id)

      const subWithChildren = await request(app.getHttpServer())
        .get(`/folder/${subFolder.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(subWithChildren.body.children).toHaveLength(1)
      expect(subWithChildren.body.children[0].id).toBe(subSubFolder.body.id)
    })
  })
})
