import { ValidationPipe, type INestApplication } from '@nestjs/common'

import { faker } from '@faker-js/faker/.'
import * as request from 'supertest'

import { AppModule } from '@/app.module'
import { createModule } from '@/config/test/module'

describe('AuthController (e2e)', () => {
  let app: INestApplication
  let httpRequest: ReturnType<typeof request>

  beforeAll(async () => {
    const module = await createModule({ imports: [AppModule] })

    app = module.createNestApplication()

    app.useGlobalPipes(new ValidationPipe())

    await app.init()

    httpRequest = request(app.getHttpServer())
  })

  afterAll(async () => {
    await app.close()
  })

  describe('/auth/login (POST)', () => {
    it('should return JWT token for valid credentials', async () => {
      const name = faker.person.fullName()
      const email = faker.internet.email()
      const password = faker.internet.password()

      await httpRequest.post('/user/create').send({ name, email, password }).expect(201)
      const response = await httpRequest.post('/auth/login').send({ email, password }).expect(201)

      expect(response.body).toHaveProperty('access_token')
      expect(typeof response.body.access_token).toBe('string')
    })

    it('should return 401 for invalid credentials', async () => {
      const response = await httpRequest
        .post('/auth/login')
        .send({ email: faker.internet.email(), password: faker.internet.password() })
        .expect(401)

      expect(response.body.message).toBe('Invalid credentials')
    })

    it('should return 400 for invalid email format', async () => {
      await httpRequest
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: faker.internet.password(),
        })
        .expect(400)
    })
  })
})
