import type { INestApplication } from '@nestjs/common'
import { ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { hash } from 'bcryptjs'

import { PrismaService } from '@/services/prisma.service'
import { AppModule } from '@/app.module'
import { createModule } from '@/config/test/module'

describe('AuthController (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const module = await createModule({ imports: [AppModule] })

    app = module.createNestApplication()

    app.useGlobalPipes(new ValidationPipe())

    await app.init()

    prisma = app.get<PrismaService>(PrismaService)
  })

  beforeEach(async () => {
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await prisma.user.deleteMany()
    await app.close()
  })

  describe('/auth/login (POST)', () => {
    it('should return JWT token for valid credentials', async () => {
      const hashedPassword = await hash('password123', 10)
      await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword,
        },
      })

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(201)

      expect(response.body).toHaveProperty('access_token')
      expect(typeof response.body.access_token).toBe('string')
    })

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'wrongpassword' })
        .expect(401)

      expect(response.body.message).toBe('Invalid credentials')
    })

    it('should return 400 for invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400)
    })
  })
})
