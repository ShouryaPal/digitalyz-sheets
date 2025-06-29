import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { downloadEntityAsCSV, downloadEntityAsXLSX } from '@/lib/downloadUtils';
import { EntityType } from '@/types/entities';

type CellValue = string | number | boolean | null | undefined;

interface DownloadButtonProps {
  entityType: EntityType;
  entityData: { headers: string[]; data: CellValue[][] };
  disabled?: boolean;
}

export function DownloadButton({ entityType, entityData, disabled = false }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (format: 'csv' | 'xlsx') => {
    if (!entityData.data.length) {
      alert('No data to download');
      return;
    }

    setIsDownloading(true);
    try {
      if (format === 'csv') {
        downloadEntityAsCSV(entityType, entityData);
      } else {
        downloadEntityAsXLSX(entityType, entityData);
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={() => handleDownload('csv')}
        disabled={disabled || isDownloading || !entityData.data.length}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <FileText className="h-4 w-4" />
        {isDownloading ? 'Downloading...' : 'CSV'}
      </Button>
      <Button
        onClick={() => handleDownload('xlsx')}
        disabled={disabled || isDownloading || !entityData.data.length}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <FileSpreadsheet className="h-4 w-4" />
        {isDownloading ? 'Downloading...' : 'XLSX'}
      </Button>
    </div>
  );
} 