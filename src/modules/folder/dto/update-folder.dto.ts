import { IsOptional, IsString, IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateFolderDto {
  @ApiProperty({ example: 'Updated Documents', required: false })
  @IsOptional()
  @IsString()
  name?: string

  @ApiProperty({
    example: 'Updated personal documents folder',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ example: '#EF4444', required: false })
  @IsOptional()
  @IsString()
  color?: string

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  parentId?: string
}
