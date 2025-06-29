import { create } from 'zustand';
import { EntityType } from '@/types/entities';

// Define a more specific type for cell values
type CellValue = string | number | boolean | null | undefined;

interface UpdatedDataState {
  // Store updated data for each entity type
  updatedData: Record<EntityType, CellValue[][]>;
  
  // Store the original data for comparison
  originalData: Record<EntityType, CellValue[][]>;
  
  // Track which cells have been modified
  modifiedCells: Record<EntityType, Set<string>>;
  
  // Actions
  initializeData: (entityType: EntityType, data: CellValue[][]) => void;
  updateCell: (entityType: EntityType, rowIdx: number, colIdx: number, value: CellValue) => void;
  resetEntity: (entityType: EntityType) => void;
  resetAll: () => void;
  getUpdatedData: (entityType: EntityType) => CellValue[][];
  hasChanges: (entityType: EntityType) => boolean;
  getModifiedCells: (entityType: EntityType) => string[];
}

export const useUpdatedDataStore = create<UpdatedDataState>((set, get) => ({
  updatedData: {
    clients: [],
    workers: [],
    tasks: []
  },
  
  originalData: {
    clients: [],
    workers: [],
    tasks: []
  },
  
  modifiedCells: {
    clients: new Set(),
    workers: new Set(),
    tasks: new Set()
  },

  initializeData: (entityType: EntityType, data: CellValue[][]) => {
    set((state) => ({
      updatedData: {
        ...state.updatedData,
        [entityType]: JSON.parse(JSON.stringify(data)) // Deep copy
      },
      originalData: {
        ...state.originalData,
        [entityType]: JSON.parse(JSON.stringify(data)) // Deep copy
      },
      modifiedCells: {
        ...state.modifiedCells,
        [entityType]: new Set()
      }
    }));
  },

  updateCell: (entityType: EntityType, rowIdx: number, colIdx: number, value: CellValue) => {
    set((state) => {
      const newUpdatedData = { ...state.updatedData };
      const newModifiedCells = { ...state.modifiedCells };
      
      // Ensure the row exists
      if (!newUpdatedData[entityType][rowIdx]) {
        newUpdatedData[entityType][rowIdx] = [];
      }
      
      // Update the cell value
      newUpdatedData[entityType][rowIdx] = [...newUpdatedData[entityType][rowIdx]];
      newUpdatedData[entityType][rowIdx][colIdx] = value;
      
      // Check if the value is different from original
      const originalValue = state.originalData[entityType][rowIdx]?.[colIdx];
      const cellKey = `${rowIdx}-${colIdx}`;
      
      if (value !== originalValue) {
        newModifiedCells[entityType].add(cellKey);
      } else {
        newModifiedCells[entityType].delete(cellKey);
      }
      
      return {
        updatedData: newUpdatedData,
        modifiedCells: newModifiedCells
      };
    });
  },

  resetEntity: (entityType: EntityType) => {
    set((state) => ({
      updatedData: {
        ...state.updatedData,
        [entityType]: JSON.parse(JSON.stringify(state.originalData[entityType]))
      },
      modifiedCells: {
        ...state.modifiedCells,
        [entityType]: new Set()
      }
    }));
  },

  resetAll: () => {
    set((state) => ({
      updatedData: {
        clients: JSON.parse(JSON.stringify(state.originalData.clients)),
        workers: JSON.parse(JSON.stringify(state.originalData.workers)),
        tasks: JSON.parse(JSON.stringify(state.originalData.tasks))
      },
      modifiedCells: {
        clients: new Set(),
        workers: new Set(),
        tasks: new Set()
      }
    }));
  },

  getUpdatedData: (entityType: EntityType) => {
    return get().updatedData[entityType];
  },

  hasChanges: (entityType: EntityType) => {
    return get().modifiedCells[entityType].size > 0;
  },

  getModifiedCells: (entityType: EntityType) => {
    return Array.from(get().modifiedCells[entityType]);
  }
})); 