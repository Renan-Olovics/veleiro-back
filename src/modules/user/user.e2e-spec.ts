import type { INestApplication } from '@nestjs/common'
import { ValidationPipe } from '@nestjs/common'
import { faker } from '@faker-js/faker'
import * as request from 'supertest'

import { createModule } from '@/config/test/module'
import { AppModule } from '@/app.module'

describe('UserModule (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const module = await createModule({ imports: [AppModule] })

    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe())
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('/user/create (POST) - should create user', async () => {
    const email = faker.internet.email()
    const password = faker.internet.password()
    const name = faker.person.fullName()

    const res = await request(app.getHttpServer())
      .post('/user/create')
      .send({ name, email, password })
      .expect(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body).toHaveProperty('email', email)
  })

  it('/user/create (POST) - should not allow duplicate email', async () => {
    const email = faker.internet.email()
    const password = faker.internet.password()
    const name = faker.person.fullName()

    await request(app.getHttpServer())
      .post('/user/create')
      .send({ name, email, password })
      .expect(201)

    await request(app.getHttpServer())
      .post('/user/create')
      .send({ name, email, password })
      .expect(400)
  })

  it('/user/check-email (GET) - should return inUse true for existing email', async () => {
    const email = faker.internet.email()
    const password = faker.internet.password()
    const name = faker.person.fullName()

    await request(app.getHttpServer())
      .post('/user/create')
      .send({ name, email, password })
      .expect(201)

    const res = await request(app.getHttpServer())
      .get('/user/check-email')
      .query({ email })
      .expect(200)
    expect(res.body).toEqual({ inUse: true })
  })

  it('/user/check-email (GET) - should return inUse false for new email', async () => {
    const email = faker.internet.email()
    const res = await request(app.getHttpServer())
      .get('/user/check-email')
      .query({ email })
      .expect(200)
    expect(res.body).toEqual({ inUse: false })
  })
})
