import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateFolderDto {
  @ApiProperty({ example: 'My Documents' })
  @IsNotEmpty()
  @IsString()
  name: string

  @ApiProperty({ example: 'Personal documents folder', required: false })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ example: '#3B82F6', required: false })
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
