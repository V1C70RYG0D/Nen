//! BOLT ECS - High-performance Entity Component System for gaming applications
//! 
//! This crate provides an optimized ECS implementation designed for real-time
//! game state management, with particular focus on board games like Gungi.

pub mod components;
pub mod systems;
pub mod resources;
pub mod world;
pub mod errors;

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Re-export commonly used types
pub use components::*;
pub use systems::*;
pub use resources::*;
pub use world::*;
pub use errors::*;

/// Entity ID type for performance
pub type EntityId = u64;

/// Component type identifier
pub type ComponentType = u32;

/// System execution priority
pub type SystemPriority = i32;

/// BOLT ECS World - the main container for all entities, components, and systems
#[derive(Debug)]
pub struct BoltWorld {
    /// Hecs world for efficient component storage
    hecs_world: hecs::World,
    
    /// Bevy world for complex system scheduling
    bevy_world: bevy::ecs::world::World,
    
    /// Active systems registry
    systems: HashMap<String, Box<dyn BoltSystem>>,
    
    /// World resources
    resources: HashMap<String, Box<dyn std::any::Any + Send + Sync>>,
    
    /// Performance metrics
    metrics: PerformanceMetrics,
    
    /// Entity counter for ID generation
    next_entity_id: EntityId,
}

/// Performance metrics for monitoring ECS performance
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub total_entities: u64,
    pub active_systems: u64,
    pub average_update_time_ns: u64,
    pub peak_update_time_ns: u64,
    pub total_updates: u64,
}

/// Configuration for BOLT ECS
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoltConfig {
    pub max_entities: Option<u64>,
    pub enable_metrics: bool,
    pub enable_profiling: bool,
    pub thread_pool_size: Option<usize>,
}

impl Default for BoltConfig {
    fn default() -> Self {
        Self {
            max_entities: Some(100_000),
            enable_metrics: true,
            enable_profiling: false,
            thread_pool_size: None,
        }
    }
}

/// Initialize the BOLT ECS system
pub fn init_bolt_ecs(config: BoltConfig) -> Result<BoltWorld> {
    env_logger::try_init().ok(); // Initialize logging if not already done
    
    log::info!("Initializing BOLT ECS with config: {:?}", config);
    
    let world = BoltWorld::new(config)?;
    
    log::info!("BOLT ECS initialized successfully");
    Ok(world)
}

/// Trait for all BOLT systems
pub trait BoltSystem: Send + Sync {
    fn name(&self) -> &str;
    fn priority(&self) -> SystemPriority { 0 }
    fn execute(&mut self, world: &mut BoltWorld, delta_time: f32) -> Result<()>;
    fn initialize(&mut self, _world: &mut BoltWorld) -> Result<()> { Ok(()) }
    fn cleanup(&mut self, _world: &mut BoltWorld) -> Result<()> { Ok(()) }
}

/// Trait for all BOLT components
pub trait BoltComponent: Send + Sync + std::fmt::Debug {
    fn component_type(&self) -> ComponentType;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bolt_ecs_initialization() {
        let config = BoltConfig::default();
        let world = init_bolt_ecs(config);
        assert!(world.is_ok());
    }
    
    #[test]
    fn test_default_config() {
        let config = BoltConfig::default();
        assert_eq!(config.max_entities, Some(100_000));
        assert!(config.enable_metrics);
        assert!(!config.enable_profiling);
    }
}
