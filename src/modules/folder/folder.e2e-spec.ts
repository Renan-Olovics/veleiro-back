import { ValidationPipe, type INestApplication } from '@nestjs/common'

import { faker } from '@faker-js/faker'
import * as request from 'supertest'

import { AppModule } from '@/app.module'
import { createModule } from '@/config/test/module'

describe('FolderModule (e2e)', () => {
  let app: INestApplication
  let authToken: string
  let userId: string
  let httpRequest: ReturnType<typeof request>

  beforeAll(async () => {
    const module = await createModule({ imports: [AppModule] })

    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe())
    await app.init()

    httpRequest = request(app.getHttpServer())

    const email = faker.internet.email()
    const password = faker.internet.password()

    const userRes = await httpRequest
      .post('/user/create')
      .send({
        name: faker.person.fullName(),
        email,
        password,
      })
      .expect(201)

    userId = userRes.body.id

    const loginRes = await httpRequest.post('/auth/login').send({ email, password }).expect(201)

    authToken = loginRes.body.access_token
  })

  afterAll(async () => {
    await app.close()
  })

  describe('/folder/create (POST)', () => {
    it('should create folder without parent', async () => {
      const folderData = {
        name: faker.lorem.word(),
        description: faker.lorem.sentence(),
        color: faker.color.rgb(),
      }

      const res = await httpRequest
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
      const parentFolder = await httpRequest
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: faker.lorem.word() })
        .expect(201)

      const childFolderData = {
        name: faker.lorem.word(),
        parentId: parentFolder.body.id,
      }

      const res = await httpRequest
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
        name: faker.lorem.word(),
        parentId: faker.string.uuid(),
      }

      await httpRequest
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(folderData)
        .expect(400)
    })

    it('should not create folder without authentication', async () => {
      const folderData = {
        name: faker.lorem.word(),
      }

      await httpRequest.post('/folder/create').send(folderData).expect(401)
    })

    it('should not create folder without name', async () => {
      const folderData = {
        description: faker.lorem.sentence(),
      }

      await httpRequest
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(folderData)
        .expect(400)
    })
  })

  describe('/folder/all (GET)', () => {
    it('should return all folders for user', async () => {
      const res = await httpRequest
        .get('/folder/all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)
    })

    it('should not return folders without authentication', async () => {
      await httpRequest.get('/folder/all').expect(401)
    })
  })

  describe('/folder/root (GET)', () => {
    it('should return only root folders for user', async () => {
      const res = await httpRequest
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
      const folder = await httpRequest
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: faker.lorem.word() })
        .expect(201)

      const res = await httpRequest
        .get(`/folder/${folder.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(res.body).toHaveProperty('id', folder.body.id)
      expect(res.body).toHaveProperty('name', folder.body.name)
      expect(res.body).toHaveProperty('children')
      expect(res.body).toHaveProperty('files')
    })

    it('should not return folder with invalid ID', async () => {
      await httpRequest
        .get(`/folder/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })

    it('should not return folder without authentication', async () => {
      const folder = await httpRequest
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Folder' })
        .expect(201)

      await httpRequest.get(`/folder/${folder.body.id}`).expect(401)
    })
  })

  describe('/folder/:id (PUT)', () => {
    it('should update folder successfully', async () => {
      const folder = await httpRequest
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: faker.lorem.word() })
        .expect(201)

      const updateData = {
        name: faker.lorem.word(),
        description: faker.lorem.sentence(),
        color: faker.color.rgb(),
      }

      const res = await httpRequest
        .put(`/folder/${folder.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)

      expect(res.body).toHaveProperty('name', updateData.name)
      expect(res.body).toHaveProperty('description', updateData.description)
      expect(res.body).toHaveProperty('color', updateData.color)
    })

    it('should not update folder with invalid ID', async () => {
      const updateData = { name: faker.lorem.word() }

      await httpRequest
        .put(`/folder/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404)
    })

    it('should not update folder without authentication', async () => {
      const folder = await httpRequest
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: faker.lorem.word() })
        .expect(201)

      const updateData = { name: faker.lorem.word() }

      await httpRequest.put(`/folder/${folder.body.id}`).send(updateData).expect(401)
    })

    it('should not allow folder to be its own parent', async () => {
      const folder = await httpRequest
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: faker.lorem.word() })
        .expect(201)

      const updateData = { parentId: folder.body.id }

      await httpRequest
        .put(`/folder/${folder.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400)
    })
  })

  describe('/folder/:id (DELETE)', () => {
    it('should delete folder successfully', async () => {
      const folder = await httpRequest
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: faker.lorem.word() })
        .expect(201)

      await httpRequest
        .delete(`/folder/${folder.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      await httpRequest
        .get(`/folder/${folder.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })

    it('should not delete folder with invalid ID', async () => {
      await httpRequest
        .delete(`/folder/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })

    it('should not delete folder without authentication', async () => {
      const folder = await httpRequest
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: faker.lorem.word() })
        .expect(201)

      await httpRequest.delete(`/folder/${folder.body.id}`).expect(401)
    })

    it('should delete folder and all its children recursively', async () => {
      const parentFolder = await httpRequest
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: faker.lorem.word() })
        .expect(201)

      const childFolder = await httpRequest
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: faker.lorem.word(),
          parentId: parentFolder.body.id,
        })
        .expect(201)

      await httpRequest
        .delete(`/folder/${parentFolder.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      await httpRequest
        .get(`/folder/${parentFolder.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      await httpRequest
        .get(`/folder/${childFolder.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })
  })

  describe('Folder hierarchy', () => {
    it('should handle complex folder structure', async () => {
      const rootFolder = await httpRequest
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: faker.lorem.word() })
        .expect(201)

      const subFolder = await httpRequest
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: faker.lorem.word(),
          parentId: rootFolder.body.id,
        })
        .expect(201)

      const subSubFolder = await httpRequest
        .post('/folder/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: faker.lorem.word(),
          parentId: subFolder.body.id,
        })
        .expect(201)

      const rootWithChildren = await httpRequest
        .get(`/folder/${rootFolder.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(rootWithChildren.body.children).toHaveLength(1)
      expect(rootWithChildren.body.children[0].id).toBe(subFolder.body.id)

      const subWithChildren = await httpRequest
        .get(`/folder/${subFolder.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(subWithChildren.body.children).toHaveLength(1)
      expect(subWithChildren.body.children[0].id).toBe(subSubFolder.body.id)
    })
  })
})
