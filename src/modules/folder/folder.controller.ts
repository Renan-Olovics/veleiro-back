import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'

import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '@/modules/auth/guard'
import { type CurrentUser as CurrentUserType } from '@/modules/auth/types'

import { CreateFolderDto, UpdateFolderDto } from './dto'
import { FolderService } from './folder.service'

@ApiTags('folder')
@ApiBearerAuth('JWT-auth')
@Controller('folder')
@UseGuards(JwtAuthGuard)
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @Post('create')
  @ApiOperation({
    summary: 'Create folder',
    description: 'Create a new folder in the system.',
  })
  @ApiBody({
    description: 'Folder creation data',
    type: CreateFolderDto,
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'Folder created successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or parent folder not found.',
  })
  @ApiResponse({
    status: 403,
    description: 'Parent folder does not belong to user.',
  })
  async create(@Body() body: CreateFolderDto, @CurrentUser() { id: userId }: CurrentUserType) {
    return this.folderService.create({ ...body, userId })
  }

  @Get('all')
  @ApiOperation({
    summary: 'Get all folders',
    description: 'Get all folders for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Folders retrieved successfully.' })
  async findAll(@CurrentUser() user: CurrentUserType) {
    return this.folderService.findAll(user.id)
  }

  @Get('root')
  @ApiOperation({
    summary: 'Get root folders',
    description: 'Get only root folders (without parent) for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Root folders retrieved successfully.',
  })
  async findRootFolders(@CurrentUser() { id: userId }: CurrentUserType) {
    return this.folderService.findRootFolders(userId)
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get folder by ID',
    description: 'Get a specific folder with its children and files.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'Folder ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Folder retrieved successfully.' })
  @ApiResponse({
    status: 404,
    description: 'Folder not found.',
  })
  @ApiResponse({
    status: 403,
    description: 'Folder does not belong to user.',
  })
  async findById(@Param('id') id: string, @CurrentUser() { id: userId }: CurrentUserType) {
    return this.folderService.findById(id, userId)
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update folder',
    description: 'Update an existing folder.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'Folder ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    description: 'Folder update data',
    type: UpdateFolderDto,
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Folder updated successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Validation error, parent folder not found, or circular reference.',
  })
  @ApiResponse({
    status: 404,
    description: 'Folder not found.',
  })
  @ApiResponse({
    status: 403,
    description: 'Folder does not belong to user.',
  })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateFolderDto,
    @CurrentUser() { id: userId }: CurrentUserType,
  ) {
    return this.folderService.update(id, body, userId)
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete folder',
    description: 'Delete a folder and all its children recursively.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'Folder ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Folder deleted successfully.' })
  @ApiResponse({
    status: 404,
    description: 'Folder not found.',
  })
  @ApiResponse({
    status: 403,
    description: 'Folder does not belong to user.',
  })
  async delete(@Param('id') id: string, @CurrentUser() { id: userId }: CurrentUserType) {
    await this.folderService.delete(id, userId)
    return { message: 'Folder deleted successfully' }
  }
}
