import type { ExecutionContext } from '@nestjs/common'
import { createParamDecorator } from '@nestjs/common'

import type { CurrentUser as CurrentUserType } from '../types'

type RequestWithUser = Request & {
  user: CurrentUserType
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>()
    return request.user
  },
)
