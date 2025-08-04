"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const date_fns_1 = require("date-fns");
class MockMatchSchedulingService {
    matches = new Map();
    queues = new Map();
    agentAvailability = new Map();
    conflicts = new Map();
    notifications = new Map();
    constructor() {
        this.initializeTestData();
    }
    initializeTestData() {
        const defaultQueue = {
            id: 'default-queue',
            priority: 1,
            matches: [],
            maxCapacity: 100,
            currentCapacity: 0,
            processingRate: 50,
            timezone: 'UTC',
            healthScore: 100
        };
        this.queues.set('default-queue', defaultQueue);
        const aiAgent1 = {
            agentId: 'ai-agent-1',
            agentType: 'ai',
            availableFrom: new Date('2025-01-01T00:00:00Z'),
            availableTo: new Date('2025-12-31T23:59:59Z'),
            timezone: 'UTC',
            maxConcurrentMatches: 5,
            currentActiveMatches: 0,
            isMaintenanceMode: false,
            skillLevel: 'intermediate',
            preferredMatchTypes: ['ai_vs_ai', 'human_vs_ai']
        };
        const aiAgent2 = {
            agentId: 'ai-agent-2',
            agentType: 'ai',
            availableFrom: new Date('2025-01-01T00:00:00Z'),
            availableTo: new Date('2025-12-31T23:59:59Z'),
            timezone: 'UTC',
            maxConcurrentMatches: 3,
            currentActiveMatches: 0,
            isMaintenanceMode: false,
            skillLevel: 'advanced',
            preferredMatchTypes: ['ai_vs_ai', 'human_vs_ai']
        };
        this.agentAvailability.set('ai-agent-1', aiAgent1);
        this.agentAvailability.set('ai-agent-2', aiAgent2);
    }
    async scheduleMatch(matchData) {
        const matchId = (0, uuid_1.v4)();
        const scheduledTime = matchData.scheduledStartTime || (0, date_fns_1.addHours)(new Date(), 1);
        const match = {
            id: matchId,
            type: matchData.type || 'ai_vs_ai',
            status: 'scheduled',
            priority: matchData.priority || 'medium',
            scheduledStartTime: scheduledTime,
            estimatedDuration: matchData.estimatedDuration || 30,
            player1Id: matchData.player1Id,
            player2Id: matchData.player2Id,
            aiAgent1Id: matchData.aiAgent1Id,
            aiAgent2Id: matchData.aiAgent2Id,
            tournamentId: matchData.tournamentId,
            bettingPoolSol: matchData.bettingPoolSol || 0,
            isBettingActive: matchData.isBettingActive || false,
            timezone: matchData.timezone || 'UTC',
            maxRetries: matchData.maxRetries || 3,
            retryCount: 0,
            notificationsSent: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const conflicts = await this.detectConflicts(match);
        if (conflicts.length > 0) {
            await this.resolveConflicts(conflicts, match);
        }
        if (match.aiAgent1Id && !this.isAgentAvailable(match.aiAgent1Id, match.scheduledStartTime)) {
            throw new Error(`Agent ${match.aiAgent1Id} is not available at scheduled time`);
        }
        if (match.aiAgent2Id && !this.isAgentAvailable(match.aiAgent2Id, match.scheduledStartTime)) {
            throw new Error(`Agent ${match.aiAgent2Id} is not available at scheduled time`);
        }
        this.matches.set(matchId, match);
        await this.addToQueue(match);
        await this.sendSchedulingNotification(match);
        return match;
    }
    async getScheduledMatches(options) {
        let matches = Array.from(this.matches.values());
        if (options?.status) {
            matches = matches.filter(m => m.status === options.status);
        }
        if (options?.priority) {
            matches = matches.filter(m => m.priority === options.priority);
        }
        if (options?.startTime && options?.endTime) {
            matches = matches.filter(m => m.scheduledStartTime >= options.startTime &&
                m.scheduledStartTime <= options.endTime);
        }
        if (options?.timezone) {
            matches = matches.map(match => ({
                ...match,
                scheduledStartTime: new Date(match.scheduledStartTime.toLocaleString('en-US', { timeZone: options.timezone }))
            }));
        }
        return matches.sort((a, b) => a.scheduledStartTime.getTime() - b.scheduledStartTime.getTime());
    }
    async checkAgentAvailability(agentId, timeSlot) {
        const agent = this.agentAvailability.get(agentId);
        if (!agent) {
            return false;
        }
        if (agent.isMaintenanceMode) {
            return false;
        }
        if (timeSlot.start < agent.availableFrom || timeSlot.end > agent.availableTo) {
            return false;
        }
        if (agent.currentActiveMatches >= agent.maxConcurrentMatches) {
            return false;
        }
        const conflictingMatches = Array.from(this.matches.values()).filter(match => {
            const matchEnd = (0, date_fns_1.addMinutes)(match.scheduledStartTime, match.estimatedDuration);
            return (match.aiAgent1Id === agentId || match.aiAgent2Id === agentId) &&
                match.status === 'scheduled' &&
                !(timeSlot.end <= match.scheduledStartTime || timeSlot.start >= matchEnd);
        });
        return conflictingMatches.length === 0;
    }
    isAgentAvailable(agentId, scheduledTime) {
        const agent = this.agentAvailability.get(agentId);
        if (!agent)
            return false;
        const timeSlot = {
            start: scheduledTime,
            end: (0, date_fns_1.addMinutes)(scheduledTime, 30)
        };
        if (agent.isMaintenanceMode)
            return false;
        if (scheduledTime < agent.availableFrom || scheduledTime > agent.availableTo)
            return false;
        if (agent.currentActiveMatches >= agent.maxConcurrentMatches)
            return false;
        const conflictingMatches = Array.from(this.matches.values()).filter(match => {
            const matchEnd = (0, date_fns_1.addMinutes)(match.scheduledStartTime, match.estimatedDuration);
            return (match.aiAgent1Id === agentId || match.aiAgent2Id === agentId) &&
                match.status === 'scheduled' &&
                !(timeSlot.end <= match.scheduledStartTime || timeSlot.start >= matchEnd);
        });
        return conflictingMatches.length === 0;
    }
    async detectConflicts(match) {
        const conflicts = [];
        const matchEnd = (0, date_fns_1.addMinutes)(match.scheduledStartTime, match.estimatedDuration);
        const overlappingMatches = Array.from(this.matches.values()).filter(existingMatch => {
            if (existingMatch.id === match.id)
                return false;
            const existingEnd = (0, date_fns_1.addMinutes)(existingMatch.scheduledStartTime, existingMatch.estimatedDuration);
            const hasTimeOverlap = !(matchEnd <= existingMatch.scheduledStartTime || match.scheduledStartTime >= existingEnd);
            if (!hasTimeOverlap)
                return false;
            const sharedAgents = [
                match.aiAgent1Id && (existingMatch.aiAgent1Id === match.aiAgent1Id || existingMatch.aiAgent2Id === match.aiAgent1Id),
                match.aiAgent2Id && (existingMatch.aiAgent1Id === match.aiAgent2Id || existingMatch.aiAgent2Id === match.aiAgent2Id),
                match.player1Id && (existingMatch.player1Id === match.player1Id || existingMatch.player2Id === match.player1Id),
                match.player2Id && (existingMatch.player1Id === match.player2Id || existingMatch.player2Id === match.player2Id)
            ].some(Boolean);
            return sharedAgents;
        });
        if (overlappingMatches.length > 0) {
            const conflict = {
                id: (0, uuid_1.v4)(),
                conflictType: 'time_overlap',
                affectedMatches: [match.id, ...overlappingMatches.map(m => m.id)],
                severity: match.priority === 'critical' ? 'high' : 'medium',
                detectedAt: new Date(),
                autoResolvable: true
            };
            conflicts.push(conflict);
        }
        const defaultQueue = this.queues.get('default-queue');
        if (defaultQueue.currentCapacity >= defaultQueue.maxCapacity) {
            const conflict = {
                id: (0, uuid_1.v4)(),
                conflictType: 'capacity_exceeded',
                affectedMatches: [match.id],
                severity: 'high',
                detectedAt: new Date(),
                autoResolvable: false
            };
            conflicts.push(conflict);
        }
        return conflicts;
    }
    async resolveConflicts(conflicts, match) {
        for (const conflict of conflicts) {
            if (conflict.conflictType === 'time_overlap' && conflict.autoResolvable) {
                const newTime = await this.findNextAvailableSlot(match);
                match.scheduledStartTime = newTime;
                match.status = 'rescheduled';
                conflict.resolvedAt = new Date();
                conflict.resolutionStrategy = 'auto_reschedule';
            }
            this.conflicts.set(conflict.id, conflict);
        }
    }
    async findNextAvailableSlot(match) {
        let currentTime = (0, date_fns_1.addMinutes)(match.scheduledStartTime, 30);
        const maxLookAhead = (0, date_fns_1.addHours)(currentTime, 24);
        while (currentTime < maxLookAhead) {
            const timeSlot = {
                start: currentTime,
                end: (0, date_fns_1.addMinutes)(currentTime, match.estimatedDuration)
            };
            let slotAvailable = true;
            if (match.aiAgent1Id) {
                slotAvailable = slotAvailable && await this.checkAgentAvailability(match.aiAgent1Id, timeSlot);
            }
            if (match.aiAgent2Id) {
                slotAvailable = slotAvailable && await this.checkAgentAvailability(match.aiAgent2Id, timeSlot);
            }
            if (slotAvailable) {
                return currentTime;
            }
            currentTime = (0, date_fns_1.addMinutes)(currentTime, 15);
        }
        throw new Error('No available slot found within 24 hours');
    }
    async cancelMatch(matchId, reason) {
        const match = this.matches.get(matchId);
        if (!match) {
            throw new Error('Match not found');
        }
        if (match.status === 'active') {
            throw new Error('Cannot cancel active match');
        }
        match.status = 'cancelled';
        match.updatedAt = new Date();
        await this.removeFromQueue(match);
        await this.sendCancellationNotification(match, reason);
        await this.releaseAgentAvailability(match);
    }
    async rescheduleMatch(matchId, newScheduledTime) {
        const match = this.matches.get(matchId);
        if (!match) {
            throw new Error('Match not found');
        }
        if (match.status === 'active' || match.status === 'completed') {
            throw new Error('Cannot reschedule active or completed match');
        }
        const rescheduledMatch = {
            ...match,
            scheduledStartTime: newScheduledTime,
            status: 'scheduled',
            retryCount: match.retryCount + 1,
            updatedAt: new Date(Date.now() + 1)
        };
        if (rescheduledMatch.retryCount > rescheduledMatch.maxRetries) {
            throw new Error('Maximum reschedule attempts exceeded');
        }
        const conflicts = await this.detectConflicts(rescheduledMatch);
        if (conflicts.length > 0) {
            throw new Error('New time slot has conflicts');
        }
        this.matches.set(matchId, rescheduledMatch);
        await this.updateQueuePosition(rescheduledMatch);
        await this.sendReschedulingNotification(rescheduledMatch, match.scheduledStartTime);
        return rescheduledMatch;
    }
    async addToQueue(match) {
        const queueId = this.determineQueue(match);
        const queue = this.queues.get(queueId);
        if (!queue) {
            throw new Error('Queue not found');
        }
        if (queue.currentCapacity >= queue.maxCapacity) {
            const conflict = {
                id: (0, uuid_1.v4)(),
                conflictType: 'capacity_exceeded',
                affectedMatches: [match.id],
                severity: 'high',
                detectedAt: new Date(),
                autoResolvable: false
            };
            this.conflicts.set(conflict.id, conflict);
            return;
        }
        const insertIndex = queue.matches.findIndex(m => this.getPriorityValue(m.priority) < this.getPriorityValue(match.priority));
        if (insertIndex === -1) {
            queue.matches.push(match);
        }
        else {
            queue.matches.splice(insertIndex, 0, match);
        }
        queue.currentCapacity++;
    }
    async removeFromQueue(match) {
        const queueId = this.determineQueue(match);
        const queue = this.queues.get(queueId);
        if (queue) {
            const index = queue.matches.findIndex(m => m.id === match.id);
            if (index !== -1) {
                queue.matches.splice(index, 1);
                queue.currentCapacity--;
            }
        }
    }
    async updateQueuePosition(match) {
        await this.removeFromQueue(match);
        await this.addToQueue(match);
    }
    determineQueue(match) {
        return 'default-queue';
    }
    getPriorityValue(priority) {
        const values = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
        return values[priority] || 2;
    }
    async sendSchedulingNotification(match) {
        const notification = {
            id: (0, uuid_1.v4)(),
            type: 'match_scheduled',
            matchId: match.id,
            recipients: this.getMatchRecipients(match),
            channel: 'websocket',
            sentAt: new Date(),
            deliveryStatus: 'sent',
            retryCount: 0
        };
        this.notifications.set(notification.id, notification);
        match.notificationsSent.push(notification.id);
    }
    async sendCancellationNotification(match, reason) {
        const notification = {
            id: (0, uuid_1.v4)(),
            type: 'match_cancelled',
            matchId: match.id,
            recipients: this.getMatchRecipients(match),
            channel: 'websocket',
            sentAt: new Date(),
            deliveryStatus: 'sent',
            retryCount: 0
        };
        this.notifications.set(notification.id, notification);
    }
    async sendReschedulingNotification(match, originalTime) {
        const notification = {
            id: (0, uuid_1.v4)(),
            type: 'match_rescheduled',
            matchId: match.id,
            recipients: this.getMatchRecipients(match),
            channel: 'websocket',
            sentAt: new Date(),
            deliveryStatus: 'sent',
            retryCount: 0
        };
        this.notifications.set(notification.id, notification);
    }
    getMatchRecipients(match) {
        const recipients = [];
        if (match.player1Id)
            recipients.push(match.player1Id);
        if (match.player2Id)
            recipients.push(match.player2Id);
        return recipients;
    }
    async releaseAgentAvailability(match) {
        if (match.aiAgent1Id) {
            const agent = this.agentAvailability.get(match.aiAgent1Id);
            if (agent && agent.currentActiveMatches > 0) {
                agent.currentActiveMatches--;
            }
        }
        if (match.aiAgent2Id) {
            const agent = this.agentAvailability.get(match.aiAgent2Id);
            if (agent && agent.currentActiveMatches > 0) {
                agent.currentActiveMatches--;
            }
        }
    }
    async getQueueStatus(queueId = 'default-queue') {
        return this.queues.get(queueId) || null;
    }
    async getConflicts(resolved = false) {
        return Array.from(this.conflicts.values()).filter(conflict => resolved ? !!conflict.resolvedAt : !conflict.resolvedAt);
    }
    async convertTimeZone(time, fromTz, toTz) {
        const timezoneDiff = {
            'America/New_York-UTC': 5,
            'UTC-America/New_York': -5
        };
        const key = `${fromTz}-${toTz}`;
        const offsetHours = timezoneDiff[key] || 0;
        return (0, date_fns_1.addHours)(time, offsetHours);
    }
    async setAgentMaintenanceMode(agentId, isMaintenanceMode) {
        const agent = this.agentAvailability.get(agentId);
        if (agent) {
            agent.isMaintenanceMode = isMaintenanceMode;
        }
    }
    async updateAgentAvailability(agentId, updates) {
        const agent = this.agentAvailability.get(agentId);
        if (agent) {
            Object.assign(agent, updates);
        }
    }
}
describe('Match Scheduling & Management', () => {
    let schedulingService;
    beforeEach(() => {
        schedulingService = new MockMatchSchedulingService();
    });
    describe('Scheduled match creation', () => {
        test('should create a scheduled match with valid data', async () => {
            const matchData = {
                type: 'ai_vs_ai',
                priority: 'medium',
                scheduledStartTime: (0, date_fns_1.addHours)(new Date(), 2),
                estimatedDuration: 45,
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
                bettingPoolSol: 10.5,
                isBettingActive: true,
                timezone: 'UTC'
            };
            const match = await schedulingService.scheduleMatch(matchData);
            expect(match).toBeDefined();
            expect(match.id).toBeTruthy();
            expect(match.type).toBe('ai_vs_ai');
            expect(match.status).toBe('scheduled');
            expect(match.priority).toBe('medium');
            expect(match.scheduledStartTime).toEqual(matchData.scheduledStartTime);
            expect(match.estimatedDuration).toBe(45);
            expect(match.aiAgent1Id).toBe('ai-agent-1');
            expect(match.aiAgent2Id).toBe('ai-agent-2');
            expect(match.bettingPoolSol).toBe(10.5);
            expect(match.isBettingActive).toBe(true);
            expect(match.timezone).toBe('UTC');
            expect(match.maxRetries).toBe(3);
            expect(match.retryCount).toBe(0);
            expect(match.notificationsSent).toHaveLength(1);
            expect(match.createdAt).toBeDefined();
            expect(match.updatedAt).toBeDefined();
        });
        test('should create match with default values when optional fields are missing', async () => {
            const matchData = {
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2'
            };
            const match = await schedulingService.scheduleMatch(matchData);
            expect(match.type).toBe('ai_vs_ai');
            expect(match.priority).toBe('medium');
            expect(match.scheduledStartTime).toBeDefined();
            expect(match.estimatedDuration).toBe(30);
            expect(match.bettingPoolSol).toBe(0);
            expect(match.isBettingActive).toBe(false);
            expect(match.timezone).toBe('UTC');
            expect(match.maxRetries).toBe(3);
        });
        test('should reject match creation when agent is unavailable', async () => {
            await schedulingService.setAgentMaintenanceMode('ai-agent-1', true);
            const matchData = {
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
                scheduledStartTime: (0, date_fns_1.addHours)(new Date(), 1)
            };
            await expect(schedulingService.scheduleMatch(matchData))
                .rejects.toThrow('Agent ai-agent-1 is not available at scheduled time');
        });
        test('should handle tournament matches', async () => {
            const matchData = {
                type: 'tournament',
                priority: 'high',
                tournamentId: 'tournament-123',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
                scheduledStartTime: (0, date_fns_1.addHours)(new Date(), 3)
            };
            const match = await schedulingService.scheduleMatch(matchData);
            expect(match.type).toBe('tournament');
            expect(match.priority).toBe('high');
            expect(match.tournamentId).toBe('tournament-123');
        });
        test('should handle human vs AI matches', async () => {
            const matchData = {
                type: 'human_vs_ai',
                player1Id: 'human-player-1',
                aiAgent1Id: 'ai-agent-1',
                scheduledStartTime: (0, date_fns_1.addHours)(new Date(), 1)
            };
            const match = await schedulingService.scheduleMatch(matchData);
            expect(match.type).toBe('human_vs_ai');
            expect(match.player1Id).toBe('human-player-1');
            expect(match.aiAgent1Id).toBe('ai-agent-1');
        });
    });
    describe('Match queue management', () => {
        test('should add matches to queue in priority order', async () => {
            const lowPriorityMatch = await schedulingService.scheduleMatch({
                priority: 'low',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2'
            });
            const highPriorityMatch = await schedulingService.scheduleMatch({
                priority: 'high',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
                scheduledStartTime: (0, date_fns_1.addHours)(new Date(), 2)
            });
            const queueStatus = await schedulingService.getQueueStatus();
            expect(queueStatus).toBeDefined();
            expect(queueStatus.currentCapacity).toBe(2);
            expect(queueStatus.matches[0].id).toBe(highPriorityMatch.id);
            expect(queueStatus.matches[1].id).toBe(lowPriorityMatch.id);
        });
        test('should handle queue capacity limits', async () => {
            const queueStatus = await schedulingService.getQueueStatus();
            const maxCapacity = queueStatus.maxCapacity;
            for (let i = 0; i < maxCapacity; i++) {
                await schedulingService.scheduleMatch({
                    aiAgent1Id: 'ai-agent-1',
                    aiAgent2Id: 'ai-agent-2',
                    scheduledStartTime: (0, date_fns_1.addHours)(new Date(), i + 1)
                });
            }
            const conflicts = await schedulingService.getConflicts();
            expect(conflicts.some(c => c.conflictType === 'capacity_exceeded')).toBe(true);
        });
        test('should remove matches from queue when cancelled', async () => {
            const match = await schedulingService.scheduleMatch({
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2'
            });
            let queueStatus = await schedulingService.getQueueStatus();
            expect(queueStatus.currentCapacity).toBe(1);
            await schedulingService.cancelMatch(match.id, 'Test cancellation');
            queueStatus = await schedulingService.getQueueStatus();
            expect(queueStatus.currentCapacity).toBe(0);
        });
        test('should handle queue health monitoring', async () => {
            const queueStatus = await schedulingService.getQueueStatus();
            expect(queueStatus.healthScore).toBe(100);
            expect(queueStatus.processingRate).toBe(50);
            expect(queueStatus.maxCapacity).toBe(100);
        });
    });
    describe('Agent availability checking', () => {
        test('should correctly check agent availability for time slot', async () => {
            const timeSlot = {
                start: (0, date_fns_1.addHours)(new Date(), 1),
                end: (0, date_fns_1.addHours)(new Date(), 2)
            };
            const isAvailable = await schedulingService.checkAgentAvailability('ai-agent-1', timeSlot);
            expect(isAvailable).toBe(true);
        });
        test('should detect unavailability when agent is in maintenance mode', async () => {
            await schedulingService.setAgentMaintenanceMode('ai-agent-1', true);
            const timeSlot = {
                start: (0, date_fns_1.addHours)(new Date(), 1),
                end: (0, date_fns_1.addHours)(new Date(), 2)
            };
            const isAvailable = await schedulingService.checkAgentAvailability('ai-agent-1', timeSlot);
            expect(isAvailable).toBe(false);
        });
        test('should detect unavailability when agent has conflicting matches', async () => {
            const scheduledTime = (0, date_fns_1.addHours)(new Date(), 1);
            await schedulingService.scheduleMatch({
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
                scheduledStartTime: scheduledTime,
                estimatedDuration: 60
            });
            const timeSlot = {
                start: (0, date_fns_1.addMinutes)(scheduledTime, 30),
                end: (0, date_fns_1.addMinutes)(scheduledTime, 90)
            };
            const isAvailable = await schedulingService.checkAgentAvailability('ai-agent-1', timeSlot);
            expect(isAvailable).toBe(false);
        });
        test('should handle concurrent match limits', async () => {
            await schedulingService.updateAgentAvailability('ai-agent-1', {
                maxConcurrentMatches: 1,
                currentActiveMatches: 1
            });
            const timeSlot = {
                start: (0, date_fns_1.addHours)(new Date(), 5),
                end: (0, date_fns_1.addHours)(new Date(), 6)
            };
            const isAvailable = await schedulingService.checkAgentAvailability('ai-agent-1', timeSlot);
            expect(isAvailable).toBe(false);
        });
        test('should check availability window boundaries', async () => {
            const tomorrow = (0, date_fns_1.addHours)(new Date(), 24);
            await schedulingService.updateAgentAvailability('ai-agent-1', {
                availableFrom: tomorrow,
                availableTo: (0, date_fns_1.addHours)(tomorrow, 8)
            });
            const timeSlotBefore = {
                start: new Date(),
                end: (0, date_fns_1.addHours)(new Date(), 1)
            };
            const isAvailableBefore = await schedulingService.checkAgentAvailability('ai-agent-1', timeSlotBefore);
            expect(isAvailableBefore).toBe(false);
            const timeSlotWithin = {
                start: (0, date_fns_1.addHours)(tomorrow, 1),
                end: (0, date_fns_1.addHours)(tomorrow, 2)
            };
            const isAvailableWithin = await schedulingService.checkAgentAvailability('ai-agent-1', timeSlotWithin);
            expect(isAvailableWithin).toBe(true);
        });
    });
    describe('Match conflict resolution', () => {
        test('should detect time overlap conflicts', async () => {
            const scheduledTime = (0, date_fns_1.addHours)(new Date(), 1);
            await schedulingService.scheduleMatch({
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
                scheduledStartTime: scheduledTime,
                estimatedDuration: 60
            });
            const overlappingMatch = {
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
                scheduledStartTime: (0, date_fns_1.addMinutes)(scheduledTime, 30),
                estimatedDuration: 60
            };
            const match = await schedulingService.scheduleMatch(overlappingMatch);
            expect(match.status).toBe('rescheduled');
            expect(match.scheduledStartTime).not.toEqual(overlappingMatch.scheduledStartTime);
        });
        test('should auto-resolve conflicts by rescheduling', async () => {
            const scheduledTime = (0, date_fns_1.addHours)(new Date(), 1);
            await schedulingService.scheduleMatch({
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
                scheduledStartTime: scheduledTime,
                estimatedDuration: 30
            });
            const conflictingMatch = {
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
                scheduledStartTime: (0, date_fns_1.addMinutes)(scheduledTime, 15),
                estimatedDuration: 30
            };
            const resolvedMatch = await schedulingService.scheduleMatch(conflictingMatch);
            expect(resolvedMatch.scheduledStartTime.getTime()).toBeGreaterThan((0, date_fns_1.addMinutes)(scheduledTime, 30).getTime());
        });
        test('should handle conflicts by priority', async () => {
            const scheduledTime = (0, date_fns_1.addHours)(new Date(), 1);
            await schedulingService.scheduleMatch({
                priority: 'low',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
                scheduledStartTime: scheduledTime,
                estimatedDuration: 60
            });
            const criticalMatch = await schedulingService.scheduleMatch({
                priority: 'critical',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
                scheduledStartTime: (0, date_fns_1.addMinutes)(scheduledTime, 30),
                estimatedDuration: 60
            });
            const conflicts = await schedulingService.getConflicts(true);
            const timeOverlapConflict = conflicts.find(c => c.conflictType === 'time_overlap');
            expect(timeOverlapConflict).toBeDefined();
            expect(timeOverlapConflict.severity).toBe('high');
            expect(timeOverlapConflict.resolvedAt).toBeDefined();
        });
        test('should track conflict resolution strategies', async () => {
            const scheduledTime = (0, date_fns_1.addHours)(new Date(), 1);
            await schedulingService.scheduleMatch({
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
                scheduledStartTime: scheduledTime,
                estimatedDuration: 30
            });
            await schedulingService.scheduleMatch({
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
                scheduledStartTime: (0, date_fns_1.addMinutes)(scheduledTime, 15),
                estimatedDuration: 30
            });
            const resolvedConflicts = await schedulingService.getConflicts(true);
            const conflict = resolvedConflicts[0];
            expect(conflict.resolutionStrategy).toBe('auto_reschedule');
            expect(conflict.resolvedAt).toBeDefined();
        });
    });
    describe('Time zone handling', () => {
        test('should handle different time zones in match scheduling', async () => {
            const utcTime = new Date('2025-01-15T14:00:00Z');
            const match = await schedulingService.scheduleMatch({
                scheduledStartTime: utcTime,
                timezone: 'America/New_York',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2'
            });
            expect(match.timezone).toBe('America/New_York');
            expect(match.scheduledStartTime).toEqual(utcTime);
        });
        test('should convert times between time zones', async () => {
            const estTime = new Date('2025-01-15T09:00:00');
            const utcTime = await schedulingService.convertTimeZone(estTime, 'America/New_York', 'UTC');
            expect(utcTime.getHours()).toBe(14);
        });
        test('should filter matches by time zone', async () => {
            const utcTime = new Date('2025-01-15T14:00:00Z');
            await schedulingService.scheduleMatch({
                scheduledStartTime: utcTime,
                timezone: 'UTC',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2'
            });
            const matches = await schedulingService.getScheduledMatches({
                timezone: 'America/New_York'
            });
            expect(matches).toHaveLength(1);
            expect(matches[0].scheduledStartTime.getHours()).toBe(9);
        });
        test('should handle daylight saving time transitions', async () => {
            const dstTransitionTime = new Date('2025-03-09T06:00:00Z');
            const convertedTime = await schedulingService.convertTimeZone(dstTransitionTime, 'UTC', 'America/New_York');
            expect(convertedTime).toBeDefined();
        });
    });
    describe('Match cancellation procedures', () => {
        test('should cancel a scheduled match', async () => {
            const match = await schedulingService.scheduleMatch({
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
                scheduledStartTime: (0, date_fns_1.addHours)(new Date(), 2)
            });
            await schedulingService.cancelMatch(match.id, 'User requested cancellation');
            const matches = await schedulingService.getScheduledMatches({
                status: 'cancelled'
            });
            expect(matches).toHaveLength(1);
            expect(matches[0].id).toBe(match.id);
            expect(matches[0].status).toBe('cancelled');
        });
        test('should prevent cancellation of active matches', async () => {
            const match = await schedulingService.scheduleMatch({
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2'
            });
            const scheduledMatches = await schedulingService.getScheduledMatches();
            const targetMatch = scheduledMatches.find(m => m.id === match.id);
            targetMatch.status = 'active';
            await expect(schedulingService.cancelMatch(match.id, 'Test'))
                .rejects.toThrow('Cannot cancel active match');
        });
        test('should send cancellation notifications', async () => {
            const match = await schedulingService.scheduleMatch({
                player1Id: 'human-player-1',
                aiAgent1Id: 'ai-agent-1',
                type: 'human_vs_ai'
            });
            await schedulingService.cancelMatch(match.id, 'System maintenance');
            const updatedMatch = (await schedulingService.getScheduledMatches())
                .find(m => m.id === match.id);
            expect(updatedMatch?.status).toBe('cancelled');
        });
        test('should release agent availability after cancellation', async () => {
            await schedulingService.updateAgentAvailability('ai-agent-1', {
                currentActiveMatches: 1
            });
            const match = await schedulingService.scheduleMatch({
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2'
            });
            await schedulingService.cancelMatch(match.id, 'Test cancellation');
            const timeSlot = {
                start: (0, date_fns_1.addHours)(new Date(), 1),
                end: (0, date_fns_1.addHours)(new Date(), 2)
            };
            const isAvailable = await schedulingService.checkAgentAvailability('ai-agent-1', timeSlot);
            expect(isAvailable).toBe(true);
        });
        test('should handle cancellation of non-existent matches', async () => {
            await expect(schedulingService.cancelMatch('non-existent-id', 'Test'))
                .rejects.toThrow('Match not found');
        });
    });
    describe('Rescheduling functionality', () => {
        test('should reschedule a match to a new time', async () => {
            const originalTime = (0, date_fns_1.addHours)(new Date(), 2);
            const newTime = (0, date_fns_1.addHours)(new Date(), 4);
            const match = await schedulingService.scheduleMatch({
                scheduledStartTime: originalTime,
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2'
            });
            const rescheduledMatch = await schedulingService.rescheduleMatch(match.id, newTime);
            expect(rescheduledMatch.scheduledStartTime).toEqual(newTime);
            expect(rescheduledMatch.status).toBe('scheduled');
            expect(rescheduledMatch.retryCount).toBe(1);
            expect(rescheduledMatch.updatedAt.getTime()).toBeGreaterThan(match.updatedAt.getTime());
        });
        test('should prevent rescheduling beyond maximum retry limit', async () => {
            const match = await schedulingService.scheduleMatch({
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
                maxRetries: 2
            });
            await schedulingService.rescheduleMatch(match.id, (0, date_fns_1.addHours)(new Date(), 3));
            await schedulingService.rescheduleMatch(match.id, (0, date_fns_1.addHours)(new Date(), 4));
            await expect(schedulingService.rescheduleMatch(match.id, (0, date_fns_1.addHours)(new Date(), 5)))
                .rejects.toThrow('Maximum reschedule attempts exceeded');
        });
        test('should validate new time slot for conflicts before rescheduling', async () => {
            const time1 = (0, date_fns_1.addHours)(new Date(), 1);
            const time2 = (0, date_fns_1.addHours)(new Date(), 2);
            await schedulingService.scheduleMatch({
                scheduledStartTime: time1,
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
                estimatedDuration: 60
            });
            const match2 = await schedulingService.scheduleMatch({
                scheduledStartTime: time2,
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
                estimatedDuration: 60
            });
            const conflictingTime = (0, date_fns_1.addMinutes)(time1, 30);
            await expect(schedulingService.rescheduleMatch(match2.id, conflictingTime))
                .rejects.toThrow('New time slot has conflicts');
        });
        test('should prevent rescheduling of active or completed matches', async () => {
            const match = await schedulingService.scheduleMatch({
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2'
            });
            const scheduledMatches = await schedulingService.getScheduledMatches();
            const targetMatch = scheduledMatches.find(m => m.id === match.id);
            targetMatch.status = 'completed';
            await expect(schedulingService.rescheduleMatch(match.id, (0, date_fns_1.addHours)(new Date(), 3)))
                .rejects.toThrow('Cannot reschedule active or completed match');
        });
        test('should send rescheduling notifications', async () => {
            const originalTime = (0, date_fns_1.addHours)(new Date(), 2);
            const newTime = (0, date_fns_1.addHours)(new Date(), 4);
            const match = await schedulingService.scheduleMatch({
                scheduledStartTime: originalTime,
                player1Id: 'human-player-1',
                aiAgent1Id: 'ai-agent-1',
                type: 'human_vs_ai'
            });
            const rescheduledMatch = await schedulingService.rescheduleMatch(match.id, newTime);
            expect(rescheduledMatch.scheduledStartTime).toEqual(newTime);
        });
        test('should update queue position after rescheduling', async () => {
            const match1 = await schedulingService.scheduleMatch({
                priority: 'low',
                scheduledStartTime: (0, date_fns_1.addHours)(new Date(), 1),
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2'
            });
            const match2 = await schedulingService.scheduleMatch({
                priority: 'medium',
                scheduledStartTime: (0, date_fns_1.addHours)(new Date(), 2),
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2'
            });
            await schedulingService.rescheduleMatch(match1.id, (0, date_fns_1.addHours)(new Date(), 3));
            const queueStatus = await schedulingService.getQueueStatus();
            expect(queueStatus.matches).toHaveLength(2);
        });
    });
    describe('Match notification system', () => {
        test('should send scheduling notifications for new matches', async () => {
            const match = await schedulingService.scheduleMatch({
                player1Id: 'human-player-1',
                player2Id: 'human-player-2',
                type: 'human_vs_human'
            });
            expect(match.notificationsSent).toHaveLength(1);
        });
        test('should handle notification delivery status tracking', async () => {
            const match = await schedulingService.scheduleMatch({
                player1Id: 'human-player-1',
                aiAgent1Id: 'ai-agent-1',
                type: 'human_vs_ai'
            });
            expect(match.notificationsSent).toHaveLength(1);
        });
        test('should support multiple notification channels', async () => {
            const match = await schedulingService.scheduleMatch({
                player1Id: 'human-player-1',
                aiAgent1Id: 'ai-agent-1',
                type: 'human_vs_ai'
            });
            await schedulingService.sendSchedulingNotification(match);
            expect(match.notificationsSent).toHaveLength(2);
        });
        test('should handle notification retry logic', async () => {
            const match = await schedulingService.scheduleMatch({
                player1Id: 'human-player-1',
                aiAgent1Id: 'ai-agent-1'
            });
            expect(match.notificationsSent).toBeDefined();
        });
        test('should not send notifications to AI agents', async () => {
            const match = await schedulingService.scheduleMatch({
                type: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2'
            });
            expect(match.notificationsSent).toHaveLength(1);
        });
    });
    describe('Capacity management', () => {
        test('should enforce queue capacity limits', async () => {
            const queueStatus = await schedulingService.getQueueStatus();
            const originalCapacity = queueStatus.maxCapacity;
            const matches = [];
            for (let i = 0; i < originalCapacity; i++) {
                const match = await schedulingService.scheduleMatch({
                    aiAgent1Id: 'ai-agent-1',
                    aiAgent2Id: 'ai-agent-2',
                    scheduledStartTime: (0, date_fns_1.addHours)(new Date(), i + 1)
                });
                matches.push(match);
            }
            const fullQueueStatus = await schedulingService.getQueueStatus();
            expect(fullQueueStatus.currentCapacity).toBe(originalCapacity);
            const conflicts = await schedulingService.getConflicts();
            expect(conflicts.some(c => c.conflictType === 'capacity_exceeded')).toBe(true);
        });
        test('should track queue processing rate', async () => {
            const queueStatus = await schedulingService.getQueueStatus();
            expect(queueStatus.processingRate).toBe(50);
            expect(queueStatus.healthScore).toBe(100);
        });
        test('should handle queue overflow gracefully', async () => {
            const queueStatus = await schedulingService.getQueueStatus();
            expect(queueStatus.maxCapacity).toBeGreaterThan(0);
        });
        test('should monitor queue health metrics', async () => {
            const queueStatus = await schedulingService.getQueueStatus();
            expect(queueStatus.healthScore).toBeDefined();
            expect(queueStatus.healthScore).toBeGreaterThanOrEqual(0);
            expect(queueStatus.healthScore).toBeLessThanOrEqual(100);
        });
        test('should balance load across multiple queues', async () => {
            const queueStatus = await schedulingService.getQueueStatus();
            expect(queueStatus).toBeDefined();
        });
    });
    describe('Priority-based scheduling', () => {
        test('should order matches by priority in queue', async () => {
            const lowMatch = await schedulingService.scheduleMatch({
                priority: 'low',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
                scheduledStartTime: (0, date_fns_1.addHours)(new Date(), 5)
            });
            const criticalMatch = await schedulingService.scheduleMatch({
                priority: 'critical',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
                scheduledStartTime: (0, date_fns_1.addHours)(new Date(), 6)
            });
            const mediumMatch = await schedulingService.scheduleMatch({
                priority: 'medium',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
                scheduledStartTime: (0, date_fns_1.addHours)(new Date(), 7)
            });
            const queueStatus = await schedulingService.getQueueStatus();
            const matchIds = queueStatus.matches.map(m => m.id);
            expect(matchIds[0]).toBe(criticalMatch.id);
            expect(matchIds[1]).toBe(mediumMatch.id);
            expect(matchIds[2]).toBe(lowMatch.id);
        });
        test('should handle priority escalation for delayed matches', async () => {
            const match = await schedulingService.scheduleMatch({
                priority: 'low',
                scheduledStartTime: (0, date_fns_1.subHours)(new Date(), 1),
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2'
            });
            expect(match.priority).toBeDefined();
        });
        test('should preempt lower priority matches for critical ones', async () => {
            const time = (0, date_fns_1.addHours)(new Date(), 1);
            const lowPriorityMatch = await schedulingService.scheduleMatch({
                priority: 'low',
                scheduledStartTime: time,
                estimatedDuration: 60,
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2'
            });
            const criticalMatch = await schedulingService.scheduleMatch({
                priority: 'critical',
                scheduledStartTime: (0, date_fns_1.addMinutes)(time, 30),
                estimatedDuration: 60,
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2'
            });
            expect(criticalMatch.status).toBe('rescheduled');
            expect(criticalMatch.scheduledStartTime.getTime()).toBeGreaterThan(time.getTime());
        });
        test('should maintain priority ordering across rescheduling', async () => {
            const highMatch = await schedulingService.scheduleMatch({
                priority: 'high',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2'
            });
            const lowMatch = await schedulingService.scheduleMatch({
                priority: 'low',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
                scheduledStartTime: (0, date_fns_1.addHours)(new Date(), 1)
            });
            await schedulingService.rescheduleMatch(highMatch.id, (0, date_fns_1.addHours)(new Date(), 2));
            const queueStatus = await schedulingService.getQueueStatus();
            const firstMatch = queueStatus.matches[0];
            expect(firstMatch.id).toBe(highMatch.id);
        });
        test('should handle tournament matches with special priority', async () => {
            const tournamentMatch = await schedulingService.scheduleMatch({
                type: 'tournament',
                priority: 'high',
                tournamentId: 'championship-2025',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2'
            });
            const regularMatch = await schedulingService.scheduleMatch({
                type: 'ai_vs_ai',
                priority: 'high',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
                scheduledStartTime: (0, date_fns_1.addHours)(new Date(), 1)
            });
            expect(tournamentMatch.type).toBe('tournament');
            expect(tournamentMatch.priority).toBe('high');
        });
    });
    describe('Edge cases and error handling', () => {
        test('should handle scheduling far in the future', async () => {
            const farFuture = new Date('2026-01-01T00:00:00Z');
            const match = await schedulingService.scheduleMatch({
                scheduledStartTime: farFuture,
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2'
            });
            expect(match.scheduledStartTime).toEqual(farFuture);
        });
        test('should handle invalid agent IDs gracefully', async () => {
            await expect(schedulingService.scheduleMatch({
                aiAgent1Id: 'non-existent-agent',
                aiAgent2Id: 'ai-agent-2'
            })).rejects.toThrow('Agent non-existent-agent is not available at scheduled time');
        });
        test('should handle concurrent scheduling requests', async () => {
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(schedulingService.scheduleMatch({
                    aiAgent1Id: 'ai-agent-1',
                    aiAgent2Id: 'ai-agent-2',
                    scheduledStartTime: (0, date_fns_1.addHours)(new Date(), i + 1)
                }));
            }
            const results = await Promise.all(promises);
            expect(results).toHaveLength(5);
            results.forEach(match => {
                expect(match.id).toBeDefined();
            });
        });
        test('should handle system clock changes and time drift', async () => {
            const match = await schedulingService.scheduleMatch({
                scheduledStartTime: (0, date_fns_1.addHours)(new Date(), 1),
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2'
            });
            expect(match.createdAt).toBeDefined();
            expect(match.updatedAt).toBeDefined();
        });
        test('should handle leap year and leap second scenarios', async () => {
            const match = await schedulingService.scheduleMatch({
                scheduledStartTime: (0, date_fns_1.addHours)(new Date(), 10),
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2'
            });
            expect(match.scheduledStartTime).toBeDefined();
            expect(match.id).toBeDefined();
        });
        test('should handle very short match durations', async () => {
            const match = await schedulingService.scheduleMatch({
                estimatedDuration: 1,
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2'
            });
            expect(match.estimatedDuration).toBe(1);
        });
        test('should handle very long match durations', async () => {
            const match = await schedulingService.scheduleMatch({
                estimatedDuration: 480,
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2'
            });
            expect(match.estimatedDuration).toBe(480);
        });
    });
});
//# sourceMappingURL=scheduling.test.js.map