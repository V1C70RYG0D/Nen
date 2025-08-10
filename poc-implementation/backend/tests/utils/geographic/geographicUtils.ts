// Utility functions for GeographicClusterManager tests

/**
 * Function to add mock latency to a region
 */
export function addMockLatency(region: any, latency: number) {
  region.latencyTargets = {
    local: latency,
    regional: latency + 15,
    global: latency + 30
  };
}

/**
 * Function to reset a region's load
 */
export function resetRegionLoad(region: any) {
  region.currentLoad = 0;
}

/**
 * Function to mock a region going offline
 */
export function mockRegionOffline(region: any) {
  region.healthStatus = 'offline';
}

