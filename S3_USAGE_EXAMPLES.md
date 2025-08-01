# S3Service Usage Examples

## File Size in Multiple Formats

The `getFileSize` method now returns file size in multiple formats:

```typescript
import { S3Service } from '@/services'

// Example usage
const s3Service = new S3Service()

// Get file size in multiple formats
const fileSize = await s3Service.getFileSize('users/123/folders/456/document.pdf')

console.log(fileSize)
// Output:
// {
//   bytes: 1048576,
//   kilobytes: 1024.00,
//   megabytes: 1.00,
//   gigabytes: 0.00,
//   formatted: "1.00 MB"
// }

// Access individual formats
console.log(`File size in bytes: ${fileSize.bytes}`)
console.log(`File size in KB: ${fileSize.kilobytes} KB`)
console.log(`File size in MB: ${fileSize.megabytes} MB`)
console.log(`File size in GB: ${fileSize.gigabytes} GB`)
console.log(`Human readable: ${fileSize.formatted}`)
```

## Complete File Management Example

```typescript
import { S3Service } from '@/services'

export class FileService {
  constructor(private readonly s3Service: S3Service) {}

  async uploadAndGetInfo(file: Buffer, originalName: string, userId: string, folderId?: string) {
    // Generate unique key
    const key = this.s3Service.generateKey(originalName, userId, folderId)

    // Upload file
    const url = await this.s3Service.uploadFile({
      key,
      file,
      contentType: 'application/pdf',
    })

    // Get file size in multiple formats
    const fileSize = await this.s3Service.getFileSize(key)

    // Get complete file info
    const fileInfo = await this.s3Service.getFileInfo(key)

    return {
      url,
      key,
      originalName,
      size: fileSize,
      info: fileInfo,
    }
  }
}
```

## File Size Format Examples

```typescript
// Different file sizes and their outputs:

// Small file (500 bytes)
{
  bytes: 500,
  kilobytes: 0.49,
  megabytes: 0.00,
  gigabytes: 0.00,
  formatted: "500 B"
}

// Medium file (2.5 MB)
{
  bytes: 2621440,
  kilobytes: 2560.00,
  megabytes: 2.50,
  gigabytes: 0.00,
  formatted: "2.50 MB"
}

// Large file (1.2 GB)
{
  bytes: 1288490188,
  kilobytes: 1258291.20,
  megabytes: 1228.80,
  gigabytes: 1.20,
  formatted: "1.20 GB"
}

// Empty file
{
  bytes: 0,
  kilobytes: 0.00,
  megabytes: 0.00,
  gigabytes: 0.00,
  formatted: "0 B"
}
```

## Integration with File Module

```typescript
// In your file controller
@Get(':id/size')
async getFileSize(@Param('id') id: string, @CurrentUser() user: User) {
  const file = await this.fileService.findById(id, user.id)

  const fileSize = await this.s3Service.getFileSize(file.s3Key)

  return {
    id: file.id,
    name: file.name,
    size: fileSize,
  }
}
```

## Error Handling

```typescript
try {
  const fileSize = await s3Service.getFileSize('non-existent-file.txt')
  console.log(fileSize.formatted)
} catch (error) {
  // File doesn't exist or other S3 error
  console.error('Error getting file size:', error.message)
}
```
