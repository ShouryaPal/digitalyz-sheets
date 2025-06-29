import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUpdatedData } from '@/lib/hooks/useUpdatedData';
import { EntityType } from '@/types/entities';

interface DataChangeIndicatorProps {
  onSave?: () => void;
  onReset?: () => void;
  entityType?: EntityType;
}

export function DataChangeIndicator({ 
  onSave, 
  onReset, 
  entityType 
}: DataChangeIndicatorProps) {
  const {
    hasAnyChanges,
    hasEntityChanges,
    getChangesSummary,
    resetAll,
    resetEntity
  } = useUpdatedData(entityType);

  const hasChanges = entityType ? hasEntityChanges?.() : hasAnyChanges();
  const changesSummary = getChangesSummary();

  if (!hasChanges) {
    return null;
  }

  const handleReset = () => {
    if (entityType) {
      resetEntity(entityType);
    } else {
      resetAll();
    }
    onReset?.();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-80">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Data Changes</h3>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {changesSummary.total} total
          </Badge>
        </div>
        
        <div className="space-y-2 mb-4">
          {entityType ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 capitalize">{entityType}</span>
              <Badge variant="outline">
                {changesSummary[entityType]} changes
              </Badge>
            </div>
          ) : (
            <>
              {changesSummary.clients > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Clients</span>
                  <Badge variant="outline">{changesSummary.clients} changes</Badge>
                </div>
              )}
              {changesSummary.workers > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Workers</span>
                  <Badge variant="outline">{changesSummary.workers} changes</Badge>
                </div>
              )}
              {changesSummary.tasks > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Tasks</span>
                  <Badge variant="outline">{changesSummary.tasks} changes</Badge>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={onSave} 
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Save Changes
          </Button>
          <Button 
            onClick={handleReset} 
            variant="outline" 
            className="flex-1"
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
} 