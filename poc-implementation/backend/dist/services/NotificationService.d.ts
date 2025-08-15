/**
 * Notification Service Implementation for Nen Platform
 *
 * This service manages comprehensive notification delivery across multiple channels
 * including in-app, email, SMS, push notifications, webhooks, and social platforms.
 * Features scheduling, templating, preferences, and robust error handling.
 */
import { INotificationService, INotification, INotificationTemplate, INotificationPreference, IBulkNotificationRequest, INotificationFilters, INotificationStats, ServiceResponse, PaginatedResponse, ServiceConfig } from '../interfaces/ServiceInterfaces';
export declare class NotificationService implements INotificationService {
    private logger;
    private notifications;
    private templates;
    private preferences;
    private scheduledNotifications;
    private config;
    private emailTransporter?;
    private smsProvider?;
    private pushProvider?;
    constructor(config: ServiceConfig);
    /**
     * Send a single notification
     */
    sendNotification(notification: Partial<INotification>): Promise<ServiceResponse<INotification>>;
    /**
     * Send bulk notifications
     */
    sendBulkNotifications(request: IBulkNotificationRequest): Promise<ServiceResponse<{
        sent: number;
        failed: number;
    }>>;
    /**
     * Get user notifications with filtering and pagination
     */
    getUserNotifications(userId: string, filters?: INotificationFilters): Promise<ServiceResponse<PaginatedResponse<INotification>>>;
    /**
     * Mark notification as read
     */
    markAsRead(notificationId: string, userId: string): Promise<ServiceResponse<void>>;
    /**
     * Mark all notifications as read for user
     */
    markAllAsRead(userId: string): Promise<ServiceResponse<void>>;
    /**
     * Delete notification
     */
    deleteNotification(notificationId: string, userId: string): Promise<ServiceResponse<void>>;
    /**
     * Get notification preferences for user
     */
    getNotificationPreferences(userId: string): Promise<ServiceResponse<INotificationPreference[]>>;
    /**
     * Update notification preferences for user
     */
    updateNotificationPreferences(userId: string, preferences: INotificationPreference[]): Promise<ServiceResponse<void>>;
    /**
     * Create notification template
     */
    createTemplate(template: Partial<INotificationTemplate>): Promise<ServiceResponse<INotificationTemplate>>;
    /**
     * Update notification template
     */
    updateTemplate(templateId: string, updates: Partial<INotificationTemplate>): Promise<ServiceResponse<INotificationTemplate>>;
    /**
     * Delete notification template
     */
    deleteTemplate(templateId: string): Promise<ServiceResponse<void>>;
    /**
     * Get all templates
     */
    getTemplates(): Promise<ServiceResponse<INotificationTemplate[]>>;
    /**
     * Schedule notification for future delivery
     */
    scheduleNotification(notification: Partial<INotification>, scheduledFor: Date): Promise<ServiceResponse<INotification>>;
    /**
     * Cancel scheduled notification
     */
    cancelScheduledNotification(notificationId: string): Promise<ServiceResponse<void>>;
    /**
     * Get notification statistics
     */
    getNotificationStats(userId?: string): Promise<ServiceResponse<INotificationStats>>;
    /**
     * Retry failed notifications
     */
    retryFailedNotifications(): Promise<ServiceResponse<{
        retried: number;
        succeeded: number;
    }>>;
    private getUserNotificationPreferences;
    private getDefaultPreferences;
    private filterChannelsByPreferences;
    private scheduleNotificationDelivery;
    private deliverNotification;
    private deliverInApp;
    private deliverEmail;
    private deliverSMS;
    private deliverPush;
    private deliverWebhook;
    private getUserIdsByFilters;
    private processTemplate;
    private initializeProviders;
    private startBackgroundTasks;
    private cleanupOldNotifications;
}
//# sourceMappingURL=NotificationService.d.ts.map