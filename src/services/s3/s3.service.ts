import { Injectable, Logger } from '@nestjs/common'

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { type FileInfo, type FileSize, type S3Config, type UploadFileOptions } from './types'

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name)
  private readonly s3Client: S3Client
  private readonly bucket: string

  constructor() {
    const config: S3Config = {
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.AWS_S3_BUCKET || '',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    }

    this.bucket = config.bucket
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  }

  async uploadFile(options: UploadFileOptions): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: options.key,
        Body: options.file,
        ContentType: options.contentType,
        Metadata: options.metadata,
      })

      await this.s3Client.send(command)

      return this.getFileUrl(options.key)
    } catch (error) {
      throw new Error(`Failed to upload file: ${error.message}`)
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })

      await this.s3Client.send(command)
    } catch (error) {
      throw new Error(`Failed to delete file: ${error.message}`)
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })

      await this.s3Client.send(command)
      return true
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false
      }
      throw new Error(`Failed to check file existence: ${error.message}`)
    }
  }

  async getFileInfo(key: string): Promise<FileInfo | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })

      const response = await this.s3Client.send(command)

      return {
        key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType || 'application/octet-stream',
        metadata: response.Metadata,
      }
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return null
      }
      throw new Error(`Failed to get file info: ${error.message}`)
    }
  }

  async generateUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      })

      const url = await getSignedUrl(this.s3Client, command, { expiresIn })

      return url
    } catch (error) {
      throw new Error(`Failed to generate upload URL: ${error.message}`)
    }
  }

  async generateDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })

      const url = await getSignedUrl(this.s3Client, command, { expiresIn })

      return url
    } catch (error) {
      throw new Error(`Failed to generate download URL: ${error.message}`)
    }
  }

  getFileUrl(key: string): string {
    return `https://${this.bucket}.s3.amazonaws.com/${key}`
  }

  generateKey(originalName: string, userId: string, folderId?: string): string {
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const extension = originalName.includes('.')
      ? originalName.substring(originalName.lastIndexOf('.'))
      : ''
    const nameWithoutExtension = originalName.includes('.')
      ? originalName.substring(0, originalName.lastIndexOf('.'))
      : originalName

    const sanitizedName = nameWithoutExtension.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()

    const folderPath = folderId ? `folders/${folderId}/` : 'root/'

    return `users/${userId}/${folderPath}${sanitizedName}_${timestamp}_${randomId}${extension}`
  }

  async copyFile(sourceKey: string, destinationKey: string): Promise<string> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.bucket,
        Key: destinationKey,
        CopySource: `${this.bucket}/${sourceKey}`,
      })

      await this.s3Client.send(command)

      return this.getFileUrl(destinationKey)
    } catch (error) {
      throw new Error(`Failed to copy file: ${error.message}`)
    }
  }

  async getFileSize(key: string): Promise<FileSize> {
    const fileInfo = await this.getFileInfo(key)
    const bytes = fileInfo?.size || 0

    const kilobytes = bytes / 1024
    const megabytes = kilobytes / 1024
    const gigabytes = megabytes / 1024

    let formatted: string
    if (bytes === 0) {
      formatted = '0 B'
    } else if (bytes < 1024) {
      formatted = `${bytes} B`
    } else if (kilobytes < 1024) {
      formatted = `${kilobytes.toFixed(2)} KB`
    } else if (megabytes < 1024) {
      formatted = `${megabytes.toFixed(2)} MB`
    } else {
      formatted = `${gigabytes.toFixed(2)} GB`
    }

    return {
      bytes,
      kilobytes: Number(kilobytes.toFixed(2)),
      megabytes: Number(megabytes.toFixed(2)),
      gigabytes: Number(gigabytes.toFixed(2)),
      formatted,
    }
  }
}
