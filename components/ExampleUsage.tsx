import React, { useState } from 'react';
import { EditableGrid } from './EditableGrid';
import { DataChangeIndicator } from './DataChangeIndicator';
import { DownloadButton } from './DownloadButton';
import { useUpdatedData } from '@/lib/hooks/useUpdatedData';
import { EntityType } from '@/types/entities';

type CellValue = string | number | boolean | null | undefined;

interface ExampleUsageProps {
  entityType: EntityType;
}

export function ExampleUsage({ entityType }: ExampleUsageProps) {
  const [data, setData] = useState<CellValue[][]>([
    ['1', 'John Doe', 'High', 'task1,task2', 'GroupA', '{"attr1": "value1"}'],
    ['2', 'Jane Smith', 'Medium', 'task3', 'GroupB', '{"attr2": "value2"}'],
  ]);
  
  const [headers] = useState<string[]>([
    'ClientID', 'ClientName', 'PriorityLevel', 'RequestedTaskIDs', 'GroupTag', 'AttributesJSON'
  ]);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { getUpdatedData, resetEntity } = useUpdatedData(entityType);

  const handleClearErrors = (rowIdx: number, colIdx: number) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`${rowIdx}-${colIdx}`];
      return newErrors;
    });
  };

  const handleEdit = (rowIdx: number, colIdx: number, value: CellValue) => {
    handleClearErrors(rowIdx, colIdx);

    const newData = [...data];
    if (!newData[rowIdx]) {
      newData[rowIdx] = [];
    }
    newData[rowIdx] = [...newData[rowIdx]];
    newData[rowIdx][colIdx] = value;
    setData(newData);
    
    setTimeout(() => {
      if (value === '') {
        setErrors(prev => ({
          ...prev,
          [`${rowIdx}-${colIdx}`]: 'This field is required'
        }));
      }
    }, 100);
  };

  const handleSave = () => {
    // Get the updated data from the store
    const updatedData = getUpdatedData(entityType);
    console.log('Saving updated data:', updatedData);
    

    setData(updatedData);
  
    resetEntity(entityType);
  };

  const handleReset = () => {
    setErrors({});
  };

  const entityData = {
    headers,
    data
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold capitalize">{entityType} Data</h2>
          <div className="text-sm text-gray-500">
            Edit the data below and save your changes
          </div>
        </div>
        <DownloadButton 
          entityType={entityType} 
          entityData={entityData}
          disabled={data.length === 0}
        />
      </div>
      
      <EditableGrid
        data={data}
        headers={headers}
        onEdit={handleEdit}
        errors={errors}
        entityType={entityType}
      />
      
      <DataChangeIndicator
        onSave={handleSave}
        onReset={handleReset}
        entityType={entityType}
      />
    </div>
  );
} 