export type S3Config = {
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
}

export type UploadFileOptions = {
  key: string
  file: Buffer
  contentType: string
  metadata?: Record<string, string>
}

export type FileInfo = {
  key: string
  size: number
  lastModified: Date
  contentType: string
  metadata?: Record<string, string>
}

export type FileSize = {
  bytes: number
  kilobytes: number
  megabytes: number
  gigabytes: number
  formatted: string
}
