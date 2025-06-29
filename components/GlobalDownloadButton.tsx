import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { downloadAllEntitiesAsCSV, downloadAllEntitiesAsXLSX } from '@/lib/downloadUtils';
import { Entities } from '@/types/entities';

interface GlobalDownloadButtonProps {
  entities: Entities;
  disabled?: boolean;
}

export function GlobalDownloadButton({ entities, disabled = false }: GlobalDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const hasData = Object.values(entities).some(entity => entity.data.length > 0);

  const handleDownload = async (format: 'csv' | 'xlsx') => {
    if (!hasData) {
      alert('No data to download');
      return;
    }

    setIsDownloading(true);
    try {
      if (format === 'csv') {
        downloadAllEntitiesAsCSV(entities);
      } else {
        downloadAllEntitiesAsXLSX(entities);
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
        disabled={disabled || isDownloading || !hasData}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <FileText className="h-4 w-4" />
        {isDownloading ? 'Downloading...' : 'All CSV'}
      </Button>
      <Button
        onClick={() => handleDownload('xlsx')}
        disabled={disabled || isDownloading || !hasData}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <FileSpreadsheet className="h-4 w-4" />
        {isDownloading ? 'Downloading...' : 'All XLSX'}
      </Button>
    </div>
  );
} 