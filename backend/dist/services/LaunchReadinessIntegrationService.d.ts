interface LaunchChecklistItem {
    id: string;
    category: string;
    requirement: string;
    status: 'PASS' | 'FAIL' | 'PENDING';
    details: string;
    critical: boolean;
}
interface LaunchReadinessReport {
    reportId: string;
    timestamp: Date;
    overallStatus: 'READY' | 'NOT_READY' | 'NEEDS_REVIEW';
    checklist: LaunchChecklistItem[];
    performanceMetrics: any;
    securityValidation: any;
    complianceStatus: any;
    recommendations: string[];
    estimatedLaunchDate: Date | null;
}
interface SystemHealthMetrics {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
    errorRate: number;
    responseTime: number;
    throughput: number;
}
export declare class LaunchReadinessIntegrationService {
    private currentReport;
    private healthMetrics;
    private readonly requiredPassRate;
    constructor();
    executeLaunchReadinessAssessment(): Promise<LaunchReadinessReport>;
    private executeProductionOptimizations;
    private executeLoadTesting;
    private validatePOCRequirements;
    private validateSecurityCompliance;
    private assessSystemHealth;
    private generateLaunchChecklist;
    private determineOverallStatus;
    private generateLaunchRecommendations;
    private calculateEstimatedLaunchDate;
    getCurrentReport(): LaunchReadinessReport | null;
    getSystemHealth(): SystemHealthMetrics;
    quickHealthCheck(): Promise<{
        status: string;
        issues: string[];
    }>;
}
export declare const launchReadinessService: LaunchReadinessIntegrationService;
export {};
//# sourceMappingURL=LaunchReadinessIntegrationService.d.ts.map