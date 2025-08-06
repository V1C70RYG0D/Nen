/**
 * File Service Implementation for Nen Platform
 * 
 * This service manages file uploads, downloads, storage, versioning, and security.
 * Features include virus scanning, compression, metadata extraction, preview generation,
 * and comprehensive access control with audit logging.
 */

import { Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import {
  IFileService,
  IFile,
  IFolder,
  IFileUploadRequest,
  IFileSearchFilters,
  IFileStats,
  IFileMetadata,
  IFilePermission,
  IFileChecksum,
  IVirusScanResult,
  ServiceResponse,
  PaginatedResponse,
  ServiceError,
  ServiceConfig
} from '../interfaces/ServiceInterfaces';

export class FileService implements IFileService {
  private logger: Logger;
  private files: Map<string, IFile> = new Map();
  private folders: Map<string, IFolder> = new Map();
  private fileVersions: Map<string, IFile[]> = new Map();
  private config: ServiceConfig;
  private storagePath: string;
  private maxFileSize: number = 100 * 1024 * 1024; // 100MB default
  private allowedMimeTypes: Set<string>;

  constructor(config: ServiceConfig) {
    this.config = config;
    this.logger = config.logger.child({ service: 'FileService' });
    
    this.storagePath = process.env.FILE_STORAGE_PATH || './storage/files';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '104857600'); // 100MB

    // Default allowed mime types
    this.allowedMimeTypes = new Set([
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/csv',
      'application/json', 'application/zip',
      'video/mp4', 'audio/mp3', 'audio/wav'
    ]);

    this.logger.info('FileService initialized', {
      environment: config.environment,
      storagePath: this.storagePath,
      maxFileSize: this.maxFileSize,
      allowedTypes: Array.from(this.allowedMimeTypes).length
    });

    this.initializeStorage();
    this.startCleanupTasks();
  }

  /**
   * Upload a new file
   */
  async uploadFile(request: IFileUploadRequest): Promise<ServiceResponse<IFile>> {
    try {
      this.logger.info('Uploading file', {
        name: request.name,
        mimeType: request.mimeType,
        owner: request.owner
      });

      // Validate request
      await this.validateUploadRequest(request);

      const fileId = uuidv4();
      const now = new Date();
      
      // Generate file path and name
      const extension = this.getFileExtension(request.name);
      const storedName = `${fileId}${extension}`;
      const relativePath = this.generateFilePath(request.owner, storedName);
      const fullPath = path.join(this.storagePath, relativePath);

      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      // Calculate file size and checksums
      const fileBuffer = Buffer.isBuffer(request.file) ? request.file : await this.streamToBuffer(request.file);
      const size = fileBuffer.length;
      const checksums = await this.calculateChecksums(fileBuffer);

      // Virus scan if enabled
      let virusScanResult: IVirusScanResult | undefined;
      if (request.virusScan !== false) {
        virusScanResult = await this.performVirusScan(fileBuffer);
        if (!virusScanResult.isClean) {
          throw new ServiceError('VIRUS_DETECTED', 'File contains malicious content');
        }
      }

      // Extract metadata
      const metadata = await this.extractMetadata(fileBuffer, request.mimeType);

      // Write file to storage
      await fs.writeFile(fullPath, fileBuffer);

      const file: IFile = {
        id: fileId,
        name: request.name,
        originalName: request.name,
        path: relativePath,
        url: this.generateFileUrl(fileId),
        size,
        mimeType: request.mimeType,
        extension,
        metadata: {
          ...metadata,
          customFields: request.metadata || {}
        },
        owner: request.owner,
        permissions: request.permissions || [{
          userId: request.owner,
          role: 'owner',
          permissions: ['read', 'write', 'delete', 'share'],
          grantedAt: now,
          grantedBy: request.owner
        }],
        tags: request.tags || [],
        version: 1,
        parentId: request.folder,
        isDeleted: false,
        uploadedAt: now,
        updatedAt: now,
        checksums,
        virusScanResult
      };

      // Store file record
      this.files.set(fileId, file);
      this.fileVersions.set(fileId, [file]);

      this.logger.info('File uploaded successfully', {
        fileId,
        name: file.name,
        size: file.size,
        owner: file.owner
      });

      return {
        success: true,
        data: file,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to upload file', {
        name: request.name,
        owner: request.owner,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to upload file',
        code: error instanceof ServiceError ? error.code : 'UPLOAD_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Download a file
   */
  async downloadFile(fileId: string, userId: string): Promise<ServiceResponse<{ stream: ReadableStream; metadata: IFile }>> {
    try {
      this.logger.info('Downloading file', { fileId, userId });

      const file = await this.getFileWithPermissionCheck(fileId, userId, 'read');
      if (!file) {
        throw new ServiceError('NOT_FOUND', 'File not found or access denied');
      }

      const fullPath = path.join(this.storagePath, file.path);
      
      try {
        await fs.access(fullPath);
      } catch {
        throw new ServiceError('FILE_NOT_FOUND', 'File not found on storage');
      }

      // Update access time
      file.lastAccessedAt = new Date();
      this.files.set(fileId, file);

      // Create read stream (mock implementation)
      const stream = new ReadableStream({
        start(controller) {
          // Mock stream implementation
          controller.enqueue(new TextEncoder().encode('Mock file content'));
          controller.close();
        }
      });

      this.logger.info('File download initiated', { fileId, userId });

      return {
        success: true,
        data: { stream, metadata: file },
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to download file', {
        fileId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to download file',
        code: error instanceof ServiceError ? error.code : 'DOWNLOAD_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Get file metadata
   */
  async getFile(fileId: string, userId: string): Promise<ServiceResponse<IFile | null>> {
    try {
      const file = await this.getFileWithPermissionCheck(fileId, userId, 'read');
      
      return {
        success: true,
        data: file,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to get file', {
        fileId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to get file',
        code: error instanceof ServiceError ? error.code : 'GET_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Update file metadata
   */
  async updateFile(fileId: string, updates: Partial<IFile>, userId: string): Promise<ServiceResponse<IFile>> {
    try {
      this.logger.info('Updating file', { fileId, userId });

      const file = await this.getFileWithPermissionCheck(fileId, userId, 'write');
      if (!file) {
        throw new ServiceError('NOT_FOUND', 'File not found or access denied');
      }

      // Prevent updating sensitive fields
      const { id, path, size, checksums, uploadedAt, version, ...allowedUpdates } = updates;

      const updatedFile: IFile = {
        ...file,
        ...allowedUpdates,
        updatedAt: new Date()
      };

      this.files.set(fileId, updatedFile);

      this.logger.info('File updated successfully', { fileId, userId });

      return {
        success: true,
        data: updatedFile,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to update file', {
        fileId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to update file',
        code: error instanceof ServiceError ? error.code : 'UPDATE_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string, userId: string): Promise<ServiceResponse<void>> {
    try {
      this.logger.info('Deleting file', { fileId, userId });

      const file = await this.getFileWithPermissionCheck(fileId, userId, 'delete');
      if (!file) {
        throw new ServiceError('NOT_FOUND', 'File not found or access denied');
      }

      // Mark as deleted (soft delete)
      file.isDeleted = true;
      file.updatedAt = new Date();
      this.files.set(fileId, file);

      this.logger.info('File deleted successfully', { fileId, userId });

      return {
        success: true,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to delete file', {
        fileId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to delete file',
        code: error instanceof ServiceError ? error.code : 'DELETE_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Search files
   */
  async searchFiles(filters: IFileSearchFilters, userId: string): Promise<ServiceResponse<PaginatedResponse<IFile>>> {
    try {
      this.logger.debug('Searching files', { userId, filters });

      let files = Array.from(this.files.values())
        .filter(file => !file.isDeleted && this.hasPermission(file, userId, 'read'));

      // Apply filters
      if (filters.owner) {
        files = files.filter(f => f.owner === filters.owner);
      }
      if (filters.mimeType) {
        files = files.filter(f => f.mimeType === filters.mimeType);
      }
      if (filters.extension) {
        files = files.filter(f => f.extension === filters.extension);
      }
      if (filters.tags && filters.tags.length > 0) {
        files = files.filter(f => filters.tags!.some(tag => f.tags.includes(tag)));
      }
      if (filters.sizeMin) {
        files = files.filter(f => f.size >= filters.sizeMin!);
      }
      if (filters.sizeMax) {
        files = files.filter(f => f.size <= filters.sizeMax!);
      }
      if (filters.uploadedAfter) {
        files = files.filter(f => f.uploadedAt >= filters.uploadedAfter!);
      }
      if (filters.uploadedBefore) {
        files = files.filter(f => f.uploadedAt <= filters.uploadedBefore!);
      }
      if (filters.folder) {
        files = files.filter(f => f.parentId === filters.folder);
      }

      // Sort by upload date (newest first)
      files.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

      const paginatedResponse: PaginatedResponse<IFile> = {
        items: files,
        total: files.length,
        page: 1,
        pageSize: files.length,
        hasNextPage: false,
        hasPreviousPage: false
      };

      return {
        success: true,
        data: paginatedResponse,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to search files', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: 'Failed to search files',
        code: 'SEARCH_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Share file with users
   */
  async shareFile(fileId: string, shareWith: string[], permissions: string[], userId: string): Promise<ServiceResponse<void>> {
    try {
      this.logger.info('Sharing file', { fileId, shareWith, userId });

      const file = await this.getFileWithPermissionCheck(fileId, userId, 'share');
      if (!file) {
        throw new ServiceError('NOT_FOUND', 'File not found or access denied');
      }

      const now = new Date();

      // Add permissions for each user
      shareWith.forEach(targetUserId => {
        const existingPermissionIndex = file.permissions.findIndex(p => p.userId === targetUserId);
        
        const newPermission: IFilePermission = {
          userId: targetUserId,
          role: 'shared',
          permissions: permissions as ('read' | 'write' | 'delete' | 'share')[],
          grantedAt: now,
          grantedBy: userId
        };

        if (existingPermissionIndex >= 0) {
          file.permissions[existingPermissionIndex] = newPermission;
        } else {
          file.permissions.push(newPermission);
        }
      });

      file.updatedAt = now;
      this.files.set(fileId, file);

      this.logger.info('File shared successfully', { fileId, shareWith, userId });

      return {
        success: true,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to share file', {
        fileId,
        shareWith,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to share file',
        code: error instanceof ServiceError ? error.code : 'SHARE_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Create a folder
   */
  async createFolder(name: string, parentId: string | null, userId: string): Promise<ServiceResponse<IFolder>> {
    try {
      this.logger.info('Creating folder', { name, parentId, userId });

      // Validate parent folder if specified
      if (parentId) {
        const parentFolder = this.folders.get(parentId);
        if (!parentFolder || !this.hasFolderPermission(parentFolder, userId, 'write')) {
          throw new ServiceError('INVALID_PARENT', 'Parent folder not found or access denied');
        }
      }

      const folderId = uuidv4();
      const now = new Date();

      const folder: IFolder = {
        id: folderId,
        name,
        path: this.generateFolderPath(parentId, name),
        owner: userId,
        parentId,
        permissions: [{
          userId,
          role: 'owner',
          permissions: ['read', 'write', 'delete', 'share'],
          grantedAt: now,
          grantedBy: userId
        }],
        isDeleted: false,
        createdAt: now,
        updatedAt: now
      };

      this.folders.set(folderId, folder);

      this.logger.info('Folder created successfully', { folderId, name, userId });

      return {
        success: true,
        data: folder,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to create folder', {
        name,
        parentId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to create folder',
        code: error instanceof ServiceError ? error.code : 'FOLDER_CREATE_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Get folder contents
   */
  async getFolderContents(folderId: string, userId: string): Promise<ServiceResponse<{ files: IFile[]; folders: IFolder[] }>> {
    try {
      this.logger.debug('Getting folder contents', { folderId, userId });

      const folder = this.folders.get(folderId);
      if (!folder || !this.hasFolderPermission(folder, userId, 'read')) {
        throw new ServiceError('NOT_FOUND', 'Folder not found or access denied');
      }

      const files = Array.from(this.files.values())
        .filter(file => !file.isDeleted && file.parentId === folderId && this.hasPermission(file, userId, 'read'));

      const subfolders = Array.from(this.folders.values())
        .filter(f => !f.isDeleted && f.parentId === folderId && this.hasFolderPermission(f, userId, 'read'));

      return {
        success: true,
        data: { files, folders: subfolders },
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to get folder contents', {
        folderId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to get folder contents',
        code: error instanceof ServiceError ? error.code : 'FOLDER_CONTENTS_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Move file to different folder
   */
  async moveFile(fileId: string, targetFolderId: string, userId: string): Promise<ServiceResponse<IFile>> {
    try {
      this.logger.info('Moving file', { fileId, targetFolderId, userId });

      const file = await this.getFileWithPermissionCheck(fileId, userId, 'write');
      if (!file) {
        throw new ServiceError('NOT_FOUND', 'File not found or access denied');
      }

      // Validate target folder
      const targetFolder = this.folders.get(targetFolderId);
      if (!targetFolder || !this.hasFolderPermission(targetFolder, userId, 'write')) {
        throw new ServiceError('INVALID_TARGET', 'Target folder not found or access denied');
      }

      file.parentId = targetFolderId;
      file.updatedAt = new Date();
      this.files.set(fileId, file);

      this.logger.info('File moved successfully', { fileId, targetFolderId, userId });

      return {
        success: true,
        data: file,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to move file', {
        fileId,
        targetFolderId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to move file',
        code: error instanceof ServiceError ? error.code : 'MOVE_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Copy file to different folder
   */
  async copyFile(fileId: string, targetFolderId: string, userId: string): Promise<ServiceResponse<IFile>> {
    try {
      this.logger.info('Copying file', { fileId, targetFolderId, userId });

      const originalFile = await this.getFileWithPermissionCheck(fileId, userId, 'read');
      if (!originalFile) {
        throw new ServiceError('NOT_FOUND', 'File not found or access denied');
      }

      // Validate target folder
      const targetFolder = this.folders.get(targetFolderId);
      if (!targetFolder || !this.hasFolderPermission(targetFolder, userId, 'write')) {
        throw new ServiceError('INVALID_TARGET', 'Target folder not found or access denied');
      }

      const newFileId = uuidv4();
      const now = new Date();

      const copiedFile: IFile = {
        ...originalFile,
        id: newFileId,
        name: `Copy of ${originalFile.name}`,
        parentId: targetFolderId,
        owner: userId,
        permissions: [{
          userId,
          role: 'owner',
          permissions: ['read', 'write', 'delete', 'share'],
          grantedAt: now,
          grantedBy: userId
        }],
        version: 1,
        uploadedAt: now,
        updatedAt: now,
        url: this.generateFileUrl(newFileId)
      };

      this.files.set(newFileId, copiedFile);
      this.fileVersions.set(newFileId, [copiedFile]);

      this.logger.info('File copied successfully', { fileId, newFileId, userId });

      return {
        success: true,
        data: copiedFile,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to copy file', {
        fileId,
        targetFolderId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to copy file',
        code: error instanceof ServiceError ? error.code : 'COPY_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Get file versions
   */
  async getFileVersions(fileId: string, userId: string): Promise<ServiceResponse<IFile[]>> {
    try {
      const file = await this.getFileWithPermissionCheck(fileId, userId, 'read');
      if (!file) {
        throw new ServiceError('NOT_FOUND', 'File not found or access denied');
      }

      const versions = this.fileVersions.get(fileId) || [];

      return {
        success: true,
        data: versions,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to get file versions', {
        fileId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to get file versions',
        code: error instanceof ServiceError ? error.code : 'VERSIONS_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Restore file version
   */
  async restoreFileVersion(fileId: string, version: number, userId: string): Promise<ServiceResponse<IFile>> {
    try {
      this.logger.info('Restoring file version', { fileId, version, userId });

      const file = await this.getFileWithPermissionCheck(fileId, userId, 'write');
      if (!file) {
        throw new ServiceError('NOT_FOUND', 'File not found or access denied');
      }

      const versions = this.fileVersions.get(fileId) || [];
      const targetVersion = versions.find(v => v.version === version);
      
      if (!targetVersion) {
        throw new ServiceError('VERSION_NOT_FOUND', 'File version not found');
      }

      // Create new version from restored version
      const newVersion = versions.length + 1;
      const restoredFile: IFile = {
        ...targetVersion,
        version: newVersion,
        updatedAt: new Date()
      };

      // Update current file
      this.files.set(fileId, restoredFile);
      
      // Add to versions
      versions.push(restoredFile);
      this.fileVersions.set(fileId, versions);

      this.logger.info('File version restored successfully', { fileId, version, newVersion, userId });

      return {
        success: true,
        data: restoredFile,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to restore file version', {
        fileId,
        version,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to restore file version',
        code: error instanceof ServiceError ? error.code : 'RESTORE_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Generate file preview
   */
  async generatePreview(fileId: string, userId: string): Promise<ServiceResponse<{ url: string; type: 'image' | 'pdf' | 'video' }>> {
    try {
      const file = await this.getFileWithPermissionCheck(fileId, userId, 'read');
      if (!file) {
        throw new ServiceError('NOT_FOUND', 'File not found or access denied');
      }

      // Mock preview generation
      let previewType: 'image' | 'pdf' | 'video';
      if (file.mimeType.startsWith('image/')) {
        previewType = 'image';
      } else if (file.mimeType === 'application/pdf') {
        previewType = 'pdf';
      } else if (file.mimeType.startsWith('video/')) {
        previewType = 'video';
      } else {
        throw new ServiceError('UNSUPPORTED_PREVIEW', 'Preview not supported for this file type');
      }

      const previewUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/api/files/${fileId}/preview`;

      return {
        success: true,
        data: { url: previewUrl, type: previewType },
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to generate preview', {
        fileId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to generate preview',
        code: error instanceof ServiceError ? error.code : 'PREVIEW_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Get file statistics
   */
  async getFileStats(userId?: string): Promise<ServiceResponse<IFileStats>> {
    try {
      let files = Array.from(this.files.values()).filter(f => !f.isDeleted);

      if (userId) {
        files = files.filter(f => f.owner === userId || this.hasPermission(f, userId, 'read'));
      }

      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const filesByType: Record<string, number> = {};
      const filesByOwner: Record<string, number> = {};

      files.forEach(file => {
        filesByType[file.mimeType] = (filesByType[file.mimeType] || 0) + 1;
        filesByOwner[file.owner] = (filesByOwner[file.owner] || 0) + 1;
      });

      const stats: IFileStats = {
        totalFiles: files.length,
        totalSize,
        averageSize: files.length > 0 ? totalSize / files.length : 0,
        filesByType,
        filesByOwner,
        storageUsed: totalSize,
        storageQuota: parseInt(process.env.STORAGE_QUOTA || '1073741824') // 1GB default
      };

      return {
        success: true,
        data: stats,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to get file stats', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: 'Failed to get file stats',
        code: 'STATS_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Scan file for viruses
   */
  async scanForViruses(fileId: string): Promise<ServiceResponse<IVirusScanResult>> {
    try {
      const file = this.files.get(fileId);
      if (!file) {
        throw new ServiceError('NOT_FOUND', 'File not found');
      }

      // Mock virus scan
      const scanResult = await this.performVirusScan(Buffer.from('mock'));
      
      // Update file with scan result
      file.virusScanResult = scanResult;
      file.updatedAt = new Date();
      this.files.set(fileId, file);

      return {
        success: true,
        data: scanResult,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to scan for viruses', {
        fileId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to scan for viruses',
        code: error instanceof ServiceError ? error.code : 'SCAN_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Compress file
   */
  async compressFile(fileId: string, compressionLevel: number, userId: string): Promise<ServiceResponse<IFile>> {
    try {
      this.logger.info('Compressing file', { fileId, compressionLevel, userId });

      const file = await this.getFileWithPermissionCheck(fileId, userId, 'write');
      if (!file) {
        throw new ServiceError('NOT_FOUND', 'File not found or access denied');
      }

      // Mock compression - reduce size by percentage based on compression level
      const compressionRatio = Math.min(compressionLevel / 10, 0.9); // Max 90% compression
      const newSize = Math.floor(file.size * (1 - compressionRatio));

      // Create new version
      const newVersion = (this.fileVersions.get(fileId)?.length || 0) + 1;
      const compressedFile: IFile = {
        ...file,
        version: newVersion,
        size: newSize,
        metadata: {
          ...file.metadata,
          compression: `Level ${compressionLevel}`,
          originalSize: file.size
        },
        updatedAt: new Date()
      };

      this.files.set(fileId, compressedFile);
      
      // Add to versions
      const versions = this.fileVersions.get(fileId) || [];
      versions.push(compressedFile);
      this.fileVersions.set(fileId, versions);

      this.logger.info('File compressed successfully', { fileId, oldSize: file.size, newSize, userId });

      return {
        success: true,
        data: compressedFile,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to compress file', {
        fileId,
        compressionLevel,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to compress file',
        code: error instanceof ServiceError ? error.code : 'COMPRESSION_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Extract archive
   */
  async extractArchive(fileId: string, targetFolderId: string, userId: string): Promise<ServiceResponse<IFile[]>> {
    try {
      this.logger.info('Extracting archive', { fileId, targetFolderId, userId });

      const file = await this.getFileWithPermissionCheck(fileId, userId, 'read');
      if (!file) {
        throw new ServiceError('NOT_FOUND', 'File not found or access denied');
      }

      if (!file.mimeType.includes('zip') && !file.mimeType.includes('archive')) {
        throw new ServiceError('INVALID_FORMAT', 'File is not a supported archive format');
      }

      // Validate target folder
      const targetFolder = this.folders.get(targetFolderId);
      if (!targetFolder || !this.hasFolderPermission(targetFolder, userId, 'write')) {
        throw new ServiceError('INVALID_TARGET', 'Target folder not found or access denied');
      }

      // Mock extraction - create a few mock files
      const extractedFiles: IFile[] = [];
      const now = new Date();

      for (let i = 1; i <= 3; i++) {
        const extractedFileId = uuidv4();
        const extractedFile: IFile = {
          id: extractedFileId,
          name: `extracted_file_${i}.txt`,
          originalName: `extracted_file_${i}.txt`,
          path: this.generateFilePath(userId, `extracted_file_${i}.txt`),
          url: this.generateFileUrl(extractedFileId),
          size: 1024 * i, // Mock sizes
          mimeType: 'text/plain',
          extension: '.txt',
          metadata: {
            extractedFrom: fileId,
            customFields: {}
          },
          owner: userId,
          permissions: [{
            userId,
            role: 'owner',
            permissions: ['read', 'write', 'delete', 'share'],
            grantedAt: now,
            grantedBy: userId
          }],
          tags: ['extracted'],
          version: 1,
          parentId: targetFolderId,
          isDeleted: false,
          uploadedAt: now,
          updatedAt: now,
          checksums: {
            md5: crypto.randomBytes(16).toString('hex'),
            sha256: crypto.randomBytes(32).toString('hex')
          }
        };

        this.files.set(extractedFileId, extractedFile);
        this.fileVersions.set(extractedFileId, [extractedFile]);
        extractedFiles.push(extractedFile);
      }

      this.logger.info('Archive extracted successfully', { fileId, extractedCount: extractedFiles.length, userId });

      return {
        success: true,
        data: extractedFiles,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to extract archive', {
        fileId,
        targetFolderId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to extract archive',
        code: error instanceof ServiceError ? error.code : 'EXTRACTION_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Clean up deleted files
   */
  async cleanupDeletedFiles(olderThanDays: number): Promise<ServiceResponse<{ deletedCount: number; freedSpace: number }>> {
    try {
      this.logger.info('Cleaning up deleted files', { olderThanDays });

      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      let deletedCount = 0;
      let freedSpace = 0;

      for (const [fileId, file] of this.files.entries()) {
        if (file.isDeleted && file.updatedAt < cutoffDate) {
          freedSpace += file.size;
          this.files.delete(fileId);
          this.fileVersions.delete(fileId);
          deletedCount++;

          // In real implementation, would also delete physical files
        }
      }

      this.logger.info('Cleanup completed', { deletedCount, freedSpace });

      return {
        success: true,
        data: { deletedCount, freedSpace },
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to cleanup deleted files', {
        olderThanDays,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: 'Failed to cleanup deleted files',
        code: 'CLEANUP_ERROR',
        timestamp: new Date()
      };
    }
  }

  // Private helper methods

  private async validateUploadRequest(request: IFileUploadRequest): Promise<void> {
    if (!request.name || !request.mimeType || !request.owner) {
      throw new ServiceError('VALIDATION_ERROR', 'Name, mimeType, and owner are required');
    }

    if (!this.allowedMimeTypes.has(request.mimeType)) {
      throw new ServiceError('UNSUPPORTED_TYPE', 'File type not supported');
    }

    const fileBuffer = Buffer.isBuffer(request.file) ? request.file : await this.streamToBuffer(request.file);
    if (fileBuffer.length > this.maxFileSize) {
      throw new ServiceError('FILE_TOO_LARGE', `File size exceeds maximum of ${this.maxFileSize} bytes`);
    }
  }

  private async getFileWithPermissionCheck(fileId: string, userId: string, permission: string): Promise<IFile | null> {
    const file = this.files.get(fileId);
    if (!file || file.isDeleted || !this.hasPermission(file, userId, permission)) {
      return null;
    }
    return file;
  }

  private hasPermission(file: IFile, userId: string, permission: string): boolean {
    const userPermission = file.permissions.find(p => p.userId === userId);
    return userPermission ? userPermission.permissions.includes(permission as any) : false;
  }

  private hasFolderPermission(folder: IFolder, userId: string, permission: string): boolean {
    const userPermission = folder.permissions.find(p => p.userId === userId);
    return userPermission ? userPermission.permissions.includes(permission as any) : false;
  }

  private getFileExtension(filename: string): string {
    return path.extname(filename).toLowerCase();
  }

  private generateFilePath(owner: string, filename: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${owner}/${year}/${month}/${filename}`;
  }

  private generateFolderPath(parentId: string | null, name: string): string {
    if (!parentId) {
      return `/${name}`;
    }
    
    const parent = this.folders.get(parentId);
    return parent ? `${parent.path}/${name}` : `/${name}`;
  }

  private generateFileUrl(fileId: string): string {
    return `${process.env.BASE_URL || 'http://localhost:3000'}/api/files/${fileId}`;
  }

  private async streamToBuffer(stream: ReadableStream): Promise<Buffer> {
    // Mock implementation - in real system would convert stream to buffer
    return Buffer.from('mock file content');
  }

  private async calculateChecksums(buffer: Buffer): Promise<IFileChecksum> {
    return {
      md5: crypto.createHash('md5').update(buffer).digest('hex'),
      sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
      sha512: crypto.createHash('sha512').update(buffer).digest('hex')
    };
  }

  private async performVirusScan(buffer: Buffer): Promise<IVirusScanResult> {
    // Mock virus scan - always returns clean
    return {
      isClean: true,
      engine: 'MockScanner v1.0',
      scannedAt: new Date(),
      quarantined: false
    };
  }

  private async extractMetadata(buffer: Buffer, mimeType: string): Promise<IFileMetadata> {
    const metadata: IFileMetadata = {
      customFields: {}
    };

    // Mock metadata extraction based on file type
    if (mimeType.startsWith('image/')) {
      metadata.width = 1920;
      metadata.height = 1080;
      metadata.colorProfile = 'sRGB';
    } else if (mimeType.startsWith('video/')) {
      metadata.width = 1920;
      metadata.height = 1080;
      metadata.duration = 120; // seconds
    } else if (mimeType === 'application/pdf') {
      metadata.pages = 10;
    }

    return metadata;
  }

  private async initializeStorage(): Promise<void> {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
      this.logger.info('Storage directory initialized', { storagePath: this.storagePath });
    } catch (error) {
      this.logger.error('Failed to initialize storage directory', {
        storagePath: this.storagePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private startCleanupTasks(): void {
    // Clean up deleted files every 24 hours
    setInterval(() => {
      this.cleanupDeletedFiles(30); // Delete files older than 30 days
    }, 24 * 60 * 60 * 1000);

    // Clean up expired file versions every week
    setInterval(() => {
      this.cleanupOldVersions();
    }, 7 * 24 * 60 * 60 * 1000);
  }

  private cleanupOldVersions(): void {
    try {
      const maxVersionsPerFile = parseInt(process.env.MAX_FILE_VERSIONS || '10');
      let cleanedCount = 0;

      for (const [fileId, versions] of this.fileVersions.entries()) {
        if (versions.length > maxVersionsPerFile) {
          // Keep only the most recent versions
          const sortedVersions = versions.sort((a, b) => b.version - a.version);
          const versionsToKeep = sortedVersions.slice(0, maxVersionsPerFile);
          this.fileVersions.set(fileId, versionsToKeep);
          cleanedCount += versions.length - versionsToKeep.length;
        }
      }

      if (cleanedCount > 0) {
        this.logger.info('Cleaned up old file versions', { cleanedCount });
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old versions', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
