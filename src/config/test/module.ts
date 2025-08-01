import { type ModuleMetadata, type Provider } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'

import { mockDeep } from 'jest-mock-extended'

import { PrismaService } from '@/services'

type createModule = {
  providers?: Provider[]
  imports?: Exclude<ModuleMetadata['imports'], undefined>
}

export const createModule = async ({
  providers = [],
  imports = [],
}: createModule): Promise<TestingModule> => {
  const module = await Test.createTestingModule({
    imports: [...imports],
    providers: [
      ...providers,
      {
        provide: PrismaService,
        useValue: mockDeep<PrismaService>() as PrismaService,
      },
    ],
  }).compile()

  return module
}
