/**
 * File Service Implementation for Nen Platform
 *
 * This service manages file uploads, downloads, storage, versioning, and security.
 * Features include virus scanning, compression, metadata extraction, preview generation,
 * and comprehensive access control with audit logging.
 */
import { IFileService, IFile, IFolder, IFileUploadRequest, IFileSearchFilters, IFileStats, IVirusScanResult, ServiceResponse, PaginatedResponse, ServiceConfig } from '../interfaces/ServiceInterfaces';
export declare class FileService implements IFileService {
    private logger;
    private files;
    private folders;
    private fileVersions;
    private config;
    private storagePath;
    private maxFileSize;
    private allowedMimeTypes;
    constructor(config: ServiceConfig);
    /**
     * Upload a new file
     */
    uploadFile(request: IFileUploadRequest): Promise<ServiceResponse<IFile>>;
    /**
     * Download a file
     */
    downloadFile(fileId: string, userId: string): Promise<ServiceResponse<{
        stream: ReadableStream;
        metadata: IFile;
    }>>;
    /**
     * Get file metadata
     */
    getFile(fileId: string, userId: string): Promise<ServiceResponse<IFile | null>>;
    /**
     * Update file metadata
     */
    updateFile(fileId: string, updates: Partial<IFile>, userId: string): Promise<ServiceResponse<IFile>>;
    /**
     * Delete a file
     */
    deleteFile(fileId: string, userId: string): Promise<ServiceResponse<void>>;
    /**
     * Search files
     */
    searchFiles(filters: IFileSearchFilters, userId: string): Promise<ServiceResponse<PaginatedResponse<IFile>>>;
    /**
     * Share file with users
     */
    shareFile(fileId: string, shareWith: string[], permissions: string[], userId: string): Promise<ServiceResponse<void>>;
    /**
     * Create a folder
     */
    createFolder(name: string, parentId: string | null, userId: string): Promise<ServiceResponse<IFolder>>;
    /**
     * Get folder contents
     */
    getFolderContents(folderId: string, userId: string): Promise<ServiceResponse<{
        files: IFile[];
        folders: IFolder[];
    }>>;
    /**
     * Move file to different folder
     */
    moveFile(fileId: string, targetFolderId: string, userId: string): Promise<ServiceResponse<IFile>>;
    /**
     * Copy file to different folder
     */
    copyFile(fileId: string, targetFolderId: string, userId: string): Promise<ServiceResponse<IFile>>;
    /**
     * Get file versions
     */
    getFileVersions(fileId: string, userId: string): Promise<ServiceResponse<IFile[]>>;
    /**
     * Restore file version
     */
    restoreFileVersion(fileId: string, version: number, userId: string): Promise<ServiceResponse<IFile>>;
    /**
     * Generate file preview
     */
    generatePreview(fileId: string, userId: string): Promise<ServiceResponse<{
        url: string;
        type: 'image' | 'pdf' | 'video';
    }>>;
    /**
     * Get file statistics
     */
    getFileStats(userId?: string): Promise<ServiceResponse<IFileStats>>;
    /**
     * Scan file for viruses
     */
    scanForViruses(fileId: string): Promise<ServiceResponse<IVirusScanResult>>;
    /**
     * Compress file
     */
    compressFile(fileId: string, compressionLevel: number, userId: string): Promise<ServiceResponse<IFile>>;
    /**
     * Extract archive
     */
    extractArchive(fileId: string, targetFolderId: string, userId: string): Promise<ServiceResponse<IFile[]>>;
    /**
     * Clean up deleted files
     */
    cleanupDeletedFiles(olderThanDays: number): Promise<ServiceResponse<{
        deletedCount: number;
        freedSpace: number;
    }>>;
    private validateUploadRequest;
    private getFileWithPermissionCheck;
    private hasPermission;
    private hasFolderPermission;
    private getFileExtension;
    private generateFilePath;
    private generateFolderPath;
    private generateFileUrl;
    private streamToBuffer;
    private calculateChecksums;
    private performVirusScan;
    private extractMetadata;
    private initializeStorage;
    private startCleanupTasks;
    private cleanupOldVersions;
}
//# sourceMappingURL=FileService.d.ts.map