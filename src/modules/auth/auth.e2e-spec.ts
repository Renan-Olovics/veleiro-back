import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../../app.module'
import { PrismaService } from '@/services/prisma.service'
import { hash } from 'bcryptjs'

describe('AuthController (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    prisma = app.get<PrismaService>(PrismaService)
  })

  beforeEach(async () => {
    // Clean database
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await prisma.user.deleteMany()
    await app.close()
  })

  describe('/auth/login (POST)', () => {
    it('should return JWT token for valid credentials', async () => {
      // Create test user
      const hashedPassword = await hash('password123', 10)
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword,
        },
      })

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(201)

      expect(response.body).toHaveProperty('access_token')
      expect(typeof response.body.access_token).toBe('string')
    })

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        })
        .expect(401)

      expect(response.body.message).toBe('Invalid credentials')
    })

    it('should return 400 for invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400)
    })
  })

  describe('/user/profile (GET) - Protected Route', () => {
    it('should return user profile with valid JWT token', async () => {
      // Create test user
      const hashedPassword = await hash('password123', 10)
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword,
        },
      })

      // Get JWT token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })

      const token = loginResponse.body.access_token

      // Access protected route
      const response = await request(app.getHttpServer())
        .get('/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toEqual({
        id: user.id,
        email: user.email,
        name: user.name,
      })
    })

    it('should return 401 without JWT token', async () => {
      await request(app.getHttpServer()).get('/user/profile').expect(401)
    })

    it('should return 401 with invalid JWT token', async () => {
      await request(app.getHttpServer())
        .get('/user/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)
    })
  })
})
