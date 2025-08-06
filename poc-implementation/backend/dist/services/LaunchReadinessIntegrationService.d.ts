/**
 * Launch Readiness Integration Service - Final 5% Gap Closure
 * Complete integration service that validates all POC backend plan requirements
 * Following GI.md guidelines for production-ready, launch-grade quality
 */
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
    /**
     * Execute complete launch readiness assessment
     */
    executeLaunchReadinessAssessment(): Promise<LaunchReadinessReport>;
    /**
     * Execute production optimizations validation
     */
    private executeProductionOptimizations;
    /**
     * Execute comprehensive load testing
     */
    private executeLoadTesting;
    /**
     * Validate POC backend plan requirements
     */
    private validatePOCRequirements;
    /**
     * Validate security and compliance
     */
    private validateSecurityCompliance;
    /**
     * Assess current system health
     */
    private assessSystemHealth;
    /**
     * Generate comprehensive launch checklist
     */
    private generateLaunchChecklist;
    /**
     * Determine overall launch readiness status
     */
    private determineOverallStatus;
    /**
     * Generate launch recommendations
     */
    private generateLaunchRecommendations;
    /**
     * Calculate estimated launch date
     */
    private calculateEstimatedLaunchDate;
    /**
     * Get current launch readiness report
     */
    getCurrentReport(): LaunchReadinessReport | null;
    /**
     * Get system health metrics
     */
    getSystemHealth(): SystemHealthMetrics;
    /**
     * Quick health check for immediate status
     */
    quickHealthCheck(): Promise<{
        status: string;
        issues: string[];
    }>;
}
export declare const launchReadinessService: LaunchReadinessIntegrationService;
export {};
//# sourceMappingURL=LaunchReadinessIntegrationService.d.ts.map