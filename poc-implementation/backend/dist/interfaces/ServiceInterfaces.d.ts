/**
 * Comprehensive Service Interfaces for Nen Platform
 *
 * This file defines TypeScript interfaces for all platform services
 * following the rules for production-ready implementation with proper error handling,
 * security, and scalability considerations.
 */
import { Logger } from 'winston';
export interface ServiceResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    code?: string;
    timestamp: Date;
}
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}
export interface ServiceConfig {
    environment: 'development' | 'staging' | 'production';
    logger: Logger;
    enableCaching: boolean;
    enableMetrics: boolean;
}
export interface IUser {
    id: string;
    wallet: string;
    username: string;
    email?: string;
    avatar?: string;
    preferences: IUserPreferences;
    stats: IUserStats;
    createdAt: Date;
    lastLoginAt: Date;
    isActive: boolean;
    role: UserRole;
    metadata?: Record<string, any>;
}
export interface IUserPreferences {
    theme: 'light' | 'dark';
    notifications: INotificationPreferences;
    privacy: IPrivacySettings;
    gameSettings: IGameSettings;
    language?: string;
    timezone?: string;
}
export interface INotificationPreferences {
    email: boolean;
    inApp: boolean;
    betting: boolean;
    gameResults: boolean;
    aiUpdates: boolean;
    push: boolean;
    sms: boolean;
}
export interface IPrivacySettings {
    showStats: boolean;
    showWallet: boolean;
    allowDirectMessages: boolean;
    profileVisibility: 'public' | 'friends' | 'private';
    showOnline: boolean;
}
export interface IGameSettings {
    autoPlay: boolean;
    soundEnabled: boolean;
    animationsEnabled: boolean;
    boardTheme: string;
    difficulty: 'easy' | 'medium' | 'hard';
}
export interface IUserStats {
    totalGamesPlayed: number;
    totalGamesWon: number;
    totalBetsPlaced: number;
    totalBetsWon: number;
    totalWagered: number;
    totalWinnings: number;
    favoriteAIAgent?: string;
    winStreak: number;
    bestWinStreak: number;
    aiAgentsOwned: number;
    aiAgentsCreated: number;
    eloRating: number;
}
export declare enum UserRole {
    USER = "user",
    MODERATOR = "moderator",
    ADMIN = "admin",
    DEVELOPER = "developer",
    SUPPORT = "support"
}
export interface IAuthToken {
    token: string;
    refreshToken: string;
    expiresAt: Date;
    user: IUser;
    permissions: string[];
}
export interface ILoginRequest {
    wallet: string;
    signature: string;
    message: string;
    timestamp: number;
    deviceInfo?: IDeviceInfo;
}
export interface IRegistrationRequest {
    wallet: string;
    username: string;
    email?: string;
    signature: string;
    message: string;
    timestamp: number;
    termsAccepted: boolean;
    deviceInfo?: IDeviceInfo;
}
export interface IDeviceInfo {
    userAgent: string;
    platform: string;
    browser: string;
    ipAddress: string;
}
export interface IAuthenticationService {
    register(request: IRegistrationRequest): Promise<ServiceResponse<IAuthToken>>;
    login(request: ILoginRequest): Promise<ServiceResponse<IAuthToken>>;
    logout(token: string): Promise<ServiceResponse<void>>;
    refreshToken(refreshToken: string): Promise<ServiceResponse<IAuthToken>>;
    verifyToken(token: string): Promise<IUser | null>;
    updateProfile(userId: string, updates: Partial<IUser>): Promise<ServiceResponse<IUser>>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<ServiceResponse<void>>;
    resetPassword(email: string): Promise<ServiceResponse<void>>;
    invalidateAllSessions(userId: string): Promise<ServiceResponse<void>>;
    getSecurityLog(userId: string): Promise<ServiceResponse<ISecurityEvent[]>>;
}
export interface ISecurityEvent {
    id: string;
    userId: string;
    eventType: 'login' | 'logout' | 'password_change' | 'profile_update' | 'suspicious_activity';
    timestamp: Date;
    metadata: Record<string, any>;
    ipAddress: string;
    userAgent: string;
}
export interface IUserProfile extends IUser {
    socialConnections: ISocialConnection[];
    achievements: IAchievement[];
    subscriptions: ISubscription[];
}
export interface ISocialConnection {
    id: string;
    platform: 'twitter' | 'discord' | 'telegram' | 'github';
    username: string;
    isVerified: boolean;
    connectedAt: Date;
}
export interface IAchievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    unlockedAt: Date;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    points: number;
}
export interface ISubscription {
    id: string;
    type: 'premium' | 'pro' | 'enterprise';
    status: 'active' | 'inactive' | 'cancelled' | 'expired';
    startDate: Date;
    endDate: Date;
    features: string[];
}
export interface IUserManagementService {
    createUser(userData: Partial<IUser>): Promise<ServiceResponse<IUser>>;
    getUserById(userId: string): Promise<ServiceResponse<IUser | null>>;
    getUserByWallet(wallet: string): Promise<ServiceResponse<IUser | null>>;
    updateUser(userId: string, updates: Partial<IUser>): Promise<ServiceResponse<IUser>>;
    deleteUser(userId: string): Promise<ServiceResponse<void>>;
    searchUsers(query: string, filters?: IUserSearchFilters): Promise<ServiceResponse<PaginatedResponse<IUser>>>;
    getUserStats(userId: string): Promise<ServiceResponse<IUserStats>>;
    updateUserStats(userId: string, updates: Partial<IUserStats>): Promise<ServiceResponse<void>>;
    getUserProfile(userId: string): Promise<ServiceResponse<IUserProfile>>;
    blockUser(userId: string, blockedUserId: string): Promise<ServiceResponse<void>>;
    unblockUser(userId: string, unblockedUserId: string): Promise<ServiceResponse<void>>;
    reportUser(reporterId: string, reportedUserId: string, reason: string): Promise<ServiceResponse<void>>;
    getLeaderboard(criteria: 'elo' | 'winnings' | 'games_won', limit?: number): Promise<ServiceResponse<PaginatedResponse<IUser>>>;
}
export interface IUserSearchFilters {
    role?: UserRole;
    isActive?: boolean;
    minEloRating?: number;
    maxEloRating?: number;
    registeredAfter?: Date;
    registeredBefore?: Date;
}
export interface IApplication {
    id: string;
    name: string;
    version: string;
    description: string;
    status: ApplicationStatus;
    owner: string;
    permissions: IPermission[];
    apiKeys: IApiKey[];
    rateLimit: IRateLimit;
    webhooks: IWebhook[];
    createdAt: Date;
    updatedAt: Date;
    lastAccessedAt?: Date;
    metadata: Record<string, any>;
}
export declare enum ApplicationStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    SUSPENDED = "suspended",
    PENDING_APPROVAL = "pending_approval",
    REJECTED = "rejected"
}
export interface IPermission {
    id: string;
    name: string;
    description: string;
    scope: string[];
    level: 'read' | 'write' | 'admin';
}
export interface IApiKey {
    id: string;
    key: string;
    name: string;
    permissions: string[];
    expiresAt?: Date;
    lastUsedAt?: Date;
    isActive: boolean;
    usageCount: number;
    createdAt: Date;
}
export interface IRateLimit {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
    concurrentRequests: number;
}
export interface IWebhook {
    id: string;
    url: string;
    events: string[];
    secret: string;
    isActive: boolean;
    failureCount: number;
    lastTriggeredAt?: Date;
    createdAt: Date;
}
export interface IApplicationUsageMetrics {
    totalRequests: number;
    successfulRequests: number;
    errorRate: number;
    averageResponseTime: number;
    peakUsage: number;
    bandwidthUsed: number;
    dailyActiveUsers: number;
    monthlyActiveUsers: number;
}
export interface IApplicationService {
    createApplication(appData: Partial<IApplication>): Promise<ServiceResponse<IApplication>>;
    getApplication(appId: string): Promise<ServiceResponse<IApplication | null>>;
    updateApplication(appId: string, updates: Partial<IApplication>): Promise<ServiceResponse<IApplication>>;
    deleteApplication(appId: string): Promise<ServiceResponse<void>>;
    listApplications(ownerId: string): Promise<ServiceResponse<PaginatedResponse<IApplication>>>;
    generateApiKey(appId: string, keyData: Partial<IApiKey>): Promise<ServiceResponse<IApiKey>>;
    revokeApiKey(appId: string, keyId: string): Promise<ServiceResponse<void>>;
    updateRateLimit(appId: string, limits: IRateLimit): Promise<ServiceResponse<void>>;
    getApplicationMetrics(appId: string, period: '1h' | '1d' | '7d' | '30d'): Promise<ServiceResponse<IApplicationUsageMetrics>>;
    validateApiKey(apiKey: string): Promise<ServiceResponse<IApplication | null>>;
    logApiUsage(apiKey: string, endpoint: string, responseTime: number, success: boolean): Promise<ServiceResponse<void>>;
    suspendApplication(appId: string, reason: string): Promise<ServiceResponse<void>>;
    activateApplication(appId: string): Promise<ServiceResponse<void>>;
}
export interface INotification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    priority: NotificationPriority;
    channels: NotificationChannel[];
    status: NotificationStatus;
    data?: Record<string, any>;
    scheduledFor?: Date;
    sentAt?: Date;
    readAt?: Date;
    createdAt: Date;
    expiresAt?: Date;
    retryCount: number;
    maxRetries: number;
}
export declare enum NotificationType {
    SYSTEM = "system",
    GAME_RESULT = "game_result",
    BET_RESULT = "bet_result",
    ACCOUNT_SECURITY = "account_security",
    ACHIEVEMENT = "achievement",
    SOCIAL = "social",
    PROMOTION = "promotion",
    UPDATE = "update",
    WARNING = "warning",
    ERROR = "error"
}
export declare enum NotificationPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare enum NotificationChannel {
    IN_APP = "in_app",
    EMAIL = "email",
    SMS = "sms",
    PUSH = "push",
    WEBHOOK = "webhook",
    DISCORD = "discord",
    TELEGRAM = "telegram"
}
export declare enum NotificationStatus {
    PENDING = "pending",
    SCHEDULED = "scheduled",
    SENT = "sent",
    DELIVERED = "delivered",
    READ = "read",
    FAILED = "failed",
    CANCELLED = "cancelled",
    EXPIRED = "expired"
}
export interface INotificationTemplate {
    id: string;
    name: string;
    type: NotificationType;
    channels: NotificationChannel[];
    subject: string;
    content: string;
    variables: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface INotificationPreference {
    userId: string;
    type: NotificationType;
    channels: NotificationChannel[];
    enabled: boolean;
    frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
    quietHours?: {
        start: string;
        end: string;
        timezone: string;
    };
}
export interface IBulkNotificationRequest {
    userIds?: string[];
    userFilters?: IUserNotificationFilters;
    templateId?: string;
    type: NotificationType;
    title: string;
    message: string;
    priority: NotificationPriority;
    channels: NotificationChannel[];
    scheduledFor?: Date;
    data?: Record<string, any>;
}
export interface IUserNotificationFilters {
    roles?: UserRole[];
    isActive?: boolean;
    hasPermission?: string;
    registeredAfter?: Date;
    eloRatingMin?: number;
    preferences?: Record<string, any>;
}
export interface INotificationService {
    sendNotification(notification: Partial<INotification>): Promise<ServiceResponse<INotification>>;
    sendBulkNotifications(request: IBulkNotificationRequest): Promise<ServiceResponse<{
        sent: number;
        failed: number;
    }>>;
    getUserNotifications(userId: string, filters?: INotificationFilters): Promise<ServiceResponse<PaginatedResponse<INotification>>>;
    markAsRead(notificationId: string, userId: string): Promise<ServiceResponse<void>>;
    markAllAsRead(userId: string): Promise<ServiceResponse<void>>;
    deleteNotification(notificationId: string, userId: string): Promise<ServiceResponse<void>>;
    getNotificationPreferences(userId: string): Promise<ServiceResponse<INotificationPreference[]>>;
    updateNotificationPreferences(userId: string, preferences: INotificationPreference[]): Promise<ServiceResponse<void>>;
    createTemplate(template: Partial<INotificationTemplate>): Promise<ServiceResponse<INotificationTemplate>>;
    updateTemplate(templateId: string, updates: Partial<INotificationTemplate>): Promise<ServiceResponse<INotificationTemplate>>;
    deleteTemplate(templateId: string): Promise<ServiceResponse<void>>;
    getTemplates(): Promise<ServiceResponse<INotificationTemplate[]>>;
    scheduleNotification(notification: Partial<INotification>, scheduledFor: Date): Promise<ServiceResponse<INotification>>;
    cancelScheduledNotification(notificationId: string): Promise<ServiceResponse<void>>;
    getNotificationStats(userId?: string): Promise<ServiceResponse<INotificationStats>>;
    retryFailedNotifications(): Promise<ServiceResponse<{
        retried: number;
        succeeded: number;
    }>>;
}
export interface INotificationFilters {
    type?: NotificationType;
    status?: NotificationStatus;
    priority?: NotificationPriority;
    unreadOnly?: boolean;
    from?: Date;
    to?: Date;
}
export interface INotificationStats {
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    totalFailed: number;
    deliveryRate: number;
    readRate: number;
    channelBreakdown: Record<NotificationChannel, number>;
    typeBreakdown: Record<NotificationType, number>;
}
export interface IFile {
    id: string;
    name: string;
    originalName: string;
    path: string;
    url: string;
    size: number;
    mimeType: string;
    extension: string;
    metadata: IFileMetadata;
    owner: string;
    permissions: IFilePermission[];
    tags: string[];
    version: number;
    parentId?: string;
    isDeleted: boolean;
    uploadedAt: Date;
    updatedAt: Date;
    lastAccessedAt?: Date;
    checksums: IFileChecksum;
    virusScanResult?: IVirusScanResult;
}
export interface IFileMetadata {
    width?: number;
    height?: number;
    duration?: number;
    pages?: number;
    encoding?: string;
    compression?: string;
    colorProfile?: string;
    exifData?: Record<string, any>;
    customFields: Record<string, any>;
}
export interface IFilePermission {
    userId: string;
    role: string;
    permissions: ('read' | 'write' | 'delete' | 'share')[];
    grantedAt: Date;
    grantedBy: string;
}
export interface IFileChecksum {
    md5: string;
    sha256: string;
    sha512?: string;
}
export interface IVirusScanResult {
    isClean: boolean;
    engine: string;
    scannedAt: Date;
    threats?: string[];
    quarantined: boolean;
}
export interface IFileUploadRequest {
    file: Buffer | ReadableStream;
    name: string;
    mimeType: string;
    owner: string;
    folder?: string;
    tags?: string[];
    permissions?: IFilePermission[];
    metadata?: Record<string, any>;
    virusScan?: boolean;
}
export interface IFileSearchFilters {
    owner?: string;
    mimeType?: string;
    extension?: string;
    tags?: string[];
    sizeMin?: number;
    sizeMax?: number;
    uploadedAfter?: Date;
    uploadedBefore?: Date;
    folder?: string;
}
export interface IFileStats {
    totalFiles: number;
    totalSize: number;
    averageSize: number;
    filesByType: Record<string, number>;
    filesByOwner: Record<string, number>;
    storageUsed: number;
    storageQuota: number;
}
export interface IFolder {
    id: string;
    name: string;
    path: string;
    owner: string;
    parentId?: string;
    permissions: IFilePermission[];
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface IFileService {
    uploadFile(request: IFileUploadRequest): Promise<ServiceResponse<IFile>>;
    downloadFile(fileId: string, userId: string): Promise<ServiceResponse<{
        stream: ReadableStream;
        metadata: IFile;
    }>>;
    getFile(fileId: string, userId: string): Promise<ServiceResponse<IFile | null>>;
    updateFile(fileId: string, updates: Partial<IFile>, userId: string): Promise<ServiceResponse<IFile>>;
    deleteFile(fileId: string, userId: string): Promise<ServiceResponse<void>>;
    searchFiles(filters: IFileSearchFilters, userId: string): Promise<ServiceResponse<PaginatedResponse<IFile>>>;
    shareFile(fileId: string, shareWith: string[], permissions: string[], userId: string): Promise<ServiceResponse<void>>;
    createFolder(name: string, parentId: string | null, userId: string): Promise<ServiceResponse<IFolder>>;
    getFolderContents(folderId: string, userId: string): Promise<ServiceResponse<{
        files: IFile[];
        folders: IFolder[];
    }>>;
    moveFile(fileId: string, targetFolderId: string, userId: string): Promise<ServiceResponse<IFile>>;
    copyFile(fileId: string, targetFolderId: string, userId: string): Promise<ServiceResponse<IFile>>;
    getFileVersions(fileId: string, userId: string): Promise<ServiceResponse<IFile[]>>;
    restoreFileVersion(fileId: string, version: number, userId: string): Promise<ServiceResponse<IFile>>;
    generatePreview(fileId: string, userId: string): Promise<ServiceResponse<{
        url: string;
        type: 'image' | 'pdf' | 'video';
    }>>;
    getFileStats(userId?: string): Promise<ServiceResponse<IFileStats>>;
    scanForViruses(fileId: string): Promise<ServiceResponse<IVirusScanResult>>;
    compressFile(fileId: string, compressionLevel: number, userId: string): Promise<ServiceResponse<IFile>>;
    extractArchive(fileId: string, targetFolderId: string, userId: string): Promise<ServiceResponse<IFile[]>>;
    cleanupDeletedFiles(olderThanDays: number): Promise<ServiceResponse<{
        deletedCount: number;
        freedSpace: number;
    }>>;
}
export interface IServiceFactory {
    createAuthenticationService(config: ServiceConfig): IAuthenticationService;
    createUserManagementService(config: ServiceConfig): IUserManagementService;
    createApplicationService(config: ServiceConfig): IApplicationService;
    createNotificationService(config: ServiceConfig): INotificationService;
    createFileService(config: ServiceConfig): IFileService;
}
export interface IServiceError {
    code: string;
    message: string;
    details?: Record<string, any>;
    stack?: string;
    timestamp: Date;
}
export declare class ServiceError extends Error implements IServiceError {
    code: string;
    details?: Record<string, any>;
    timestamp: Date;
    constructor(code: string, message: string, details?: Record<string, any>);
}
export interface IValidationRule {
    field: string;
    type: 'required' | 'email' | 'wallet' | 'length' | 'pattern' | 'custom';
    value?: any;
    message: string;
    validator?: (value: any) => boolean;
}
export interface IValidationResult {
    isValid: boolean;
    errors: Array<{
        field: string;
        message: string;
    }>;
}
export interface IValidator {
    validate(data: any, rules: IValidationRule[]): IValidationResult;
    validateWalletAddress(address: string): boolean;
    validateEmail(email: string): boolean;
    validateUsername(username: string): boolean;
}
//# sourceMappingURL=ServiceInterfaces.d.ts.map