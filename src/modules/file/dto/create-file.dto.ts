import { ApiProperty } from '@nestjs/swagger'

import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'

export class CreateFileDto {
  @ApiProperty({ example: 'document.pdf' })
  @IsNotEmpty()
  @IsString()
  name: string

  @ApiProperty({ example: 'Important document', required: false })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  folderId?: string
}
