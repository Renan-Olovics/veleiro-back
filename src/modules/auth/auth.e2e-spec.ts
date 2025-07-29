import type { INestApplication } from '@nestjs/common'
import { ValidationPipe } from '@nestjs/common'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'

import { AppModule } from '@/app.module'

describe('AuthModule (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe())
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('/auth/login (POST) - should fail with invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: faker.internet.email(),
        password: faker.internet.password(),
      })
      .expect(401)
  })

  it('/auth/login (POST) - should login with valid credentials', async () => {
    const email = faker.internet.email()
    const password = faker.internet.password()
    const name = faker.person.fullName()

    await request(app.getHttpServer())
      .post('/user/register')
      .send({ name, email, password })
      .expect(201)

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201)
    expect(res.body).toHaveProperty('access_token')
  })
})
