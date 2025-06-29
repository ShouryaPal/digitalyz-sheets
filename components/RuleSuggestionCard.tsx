import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Check, X, BarChart3 } from 'lucide-react';
import { RuleSuggestion } from '@/types/entities';

interface RuleSuggestionCardProps {
  suggestion: RuleSuggestion;
  onAccept: () => void;
  onDismiss: () => void;
}

export function RuleSuggestionCard({ suggestion, onAccept, onDismiss }: RuleSuggestionCardProps) {
  const confidenceColor = suggestion.confidence > 0.8 ? 'bg-green-100 text-green-800' :
                         suggestion.confidence > 0.6 ? 'bg-yellow-100 text-yellow-800' :
                         'bg-red-100 text-red-800';

  return (
    <Card className="border-l-4 border-l-yellow-400 bg-yellow-50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-600" />
              <Badge variant="outline" className={confidenceColor}>
                {Math.round(suggestion.confidence * 100)}% confidence
              </Badge>
              <Badge variant="secondary">{suggestion.type}</Badge>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
            </div>

            <div className="text-sm text-gray-700">
              <div className="font-medium mb-1">Reasoning:</div>
              <p className="text-gray-600">{suggestion.reasoning}</p>
            </div>

            {suggestion.dataEvidence && suggestion.dataEvidence.length > 0 && (
              <div className="text-sm">
                <div className="font-medium mb-1 flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  Data Evidence:
                </div>
                <div className="space-y-1">
                  {suggestion.dataEvidence.slice(0, 3).map((evidence, index) => (
                    <div key={index} className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
                      {evidence.entity}.{evidence.field}: {evidence.value}
                      {evidence.frequency && ` (${evidence.frequency} occurrences)`}
                    </div>
                  ))}
                  {suggestion.dataEvidence.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{suggestion.dataEvidence.length - 3} more pieces of evidence
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 ml-4">
            <Button
              onClick={onAccept}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-1" />
              Accept
            </Button>
            <Button
              onClick={onDismiss}
              variant="outline"
              size="sm"
            >
              <X className="h-4 w-4 mr-1" />
              Dismiss
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 