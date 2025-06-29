import React, { useState } from 'react';
import { EditableGrid } from './EditableGrid';
import { DataChangeIndicator } from './DataChangeIndicator';
import { useUpdatedData } from '@/lib/hooks/useUpdatedData';
import { EntityType } from '@/types/entities';

// Define a more specific type for cell values
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

  const handleEdit = (rowIdx: number, colIdx: number, value: CellValue) => {
    // Update local state
    const newData = [...data];
    if (!newData[rowIdx]) {
      newData[rowIdx] = [];
    }
    newData[rowIdx] = [...newData[rowIdx]];
    newData[rowIdx][colIdx] = value;
    setData(newData);
    
    // You can add validation logic here
    // For example, validate the value and set errors
    if (value === '') {
      setErrors(prev => ({
        ...prev,
        [`${rowIdx}-${colIdx}`]: 'This field is required'
      }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${rowIdx}-${colIdx}`];
        return newErrors;
      });
    }
  };

  const handleSave = () => {
    // Get the updated data from the store
    const updatedData = getUpdatedData(entityType);
    console.log('Saving updated data:', updatedData);
    
    // Here you would typically send the data to your API
    // For now, we'll just update the local state
    setData(updatedData);
    
    // Reset the store after successful save
    resetEntity(entityType);
  };

  const handleReset = () => {
    // Reset errors when resetting data
    setErrors({});
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold capitalize">{entityType} Data</h2>
        <div className="text-sm text-gray-500">
          Edit the data below and save your changes
        </div>
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