export type CreateFileData = {
  name: string
  originalName: string
  description?: string | null
  mimeType: string
  size: number
  s3Url: string
  s3Key: string
  extension?: string | null
  pulseData?: any | null
  userId: string
  folderId?: string | null
}
