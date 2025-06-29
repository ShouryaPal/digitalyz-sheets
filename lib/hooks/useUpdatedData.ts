import { useUpdatedDataStore } from '../updatedDataStore';
import { EntityType } from '@/types/entities';

// Define a more specific type for cell values
type CellValue = string | number | boolean | null | undefined;

export const useUpdatedData = (entityType?: EntityType) => {
  const store = useUpdatedDataStore();
  
  return {
    // Store actions
    initializeData: store.initializeData,
    updateCell: store.updateCell,
    resetEntity: store.resetEntity,
    resetAll: store.resetAll,
    
    // Getters
    getUpdatedData: store.getUpdatedData,
    hasChanges: store.hasChanges,
    getModifiedCells: store.getModifiedCells,
    
    // Direct access to store state
    updatedData: store.updatedData,
    originalData: store.originalData,
    modifiedCells: store.modifiedCells,
    
    // Convenience methods for specific entity type
    getEntityData: entityType ? () => store.getUpdatedData(entityType) : undefined,
    hasEntityChanges: entityType ? () => store.hasChanges(entityType) : undefined,
    getEntityModifiedCells: entityType ? () => store.getModifiedCells(entityType) : undefined,
    
    // Utility methods
    getAllChanges: () => {
      const changes: Record<EntityType, CellValue[][]> = {
        clients: [],
        workers: [],
        tasks: []
      };
      
      ['clients', 'workers', 'tasks'].forEach((type) => {
        if (store.hasChanges(type as EntityType)) {
          changes[type as EntityType] = store.getUpdatedData(type as EntityType);
        }
      });
      
      return changes;
    },
    
    hasAnyChanges: () => {
      return store.hasChanges('clients') || 
             store.hasChanges('workers') || 
             store.hasChanges('tasks');
    },
    
    getChangesSummary: () => {
      const summary = {
        clients: store.getModifiedCells('clients').length,
        workers: store.getModifiedCells('workers').length,
        tasks: store.getModifiedCells('tasks').length
      };
      
      return {
        ...summary,
        total: summary.clients + summary.workers + summary.tasks
      };
    }
  };
}; 