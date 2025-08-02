import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { CurrentUser, JwtAuthGuard, type CurrentUserType } from '@/modules/auth/guard'

import { UpdateFileDto } from './dto'
import { FileService } from './file.service'

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserType,
    @Query('folderId') folderId?: string,
    @Query('description') description?: string,
  ) {
    return await this.fileService.uploadFile(file, user.id, folderId, description)
  }

  @Get()
  @ApiOperation({ summary: 'Get all files for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Files retrieved successfully' })
  async findAll(@CurrentUser() user: CurrentUserType) {
    return await this.fileService.findAll(user.id)
  }

  @Get('root')
  @ApiOperation({ summary: 'Get root files (not in any folder) for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Root files retrieved successfully' })
  async findRootFiles(@CurrentUser() user: CurrentUserType) {
    return await this.fileService.findRootFiles(user.id)
  }

  @Get('folder/:folderId')
  @ApiOperation({ summary: 'Get files in a specific folder' })
  @ApiResponse({ status: 200, description: 'Files in folder retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findByFolderId(@Param('folderId') folderId: string, @CurrentUser() user: CurrentUserType) {
    return await this.fileService.findByFolderId(folderId, user.id)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific file by ID' })
  @ApiResponse({ status: 200, description: 'File retrieved successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findById(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return await this.fileService.findById(id, user.id)
  }

  @Get(':id/download-url')
  @ApiOperation({ summary: 'Generate a download URL for a file' })
  @ApiResponse({ status: 200, description: 'Download URL generated successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async generateDownloadUrl(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    const downloadUrl = await this.fileService.generateDownloadUrl(id, user.id)
    return { downloadUrl }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a file' })
  @ApiResponse({ status: 200, description: 'File updated successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(
    @Param('id') id: string,
    @Body() updateFileDto: UpdateFileDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return await this.fileService.update(id, updateFileDto, user.id)
  }

  @Put(':id/move')
  @ApiOperation({ summary: 'Move a file to a different folder' })
  @ApiResponse({ status: 200, description: 'File moved successfully' })
  @ApiResponse({ status: 404, description: 'File or folder not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async moveToFolder(
    @Param('id') id: string,
    @Body() body: { folderId?: string },
    @CurrentUser() user: CurrentUserType,
  ) {
    await this.fileService.moveToFolder(id, body.folderId || null, user.id)
    return { message: 'File moved successfully' }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async delete(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    await this.fileService.delete(id, user.id)
    return { message: 'File deleted successfully' }
  }
}
