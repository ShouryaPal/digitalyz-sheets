import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Sparkles, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Rule, Entities } from '@/types/entities';
import { processNaturalLanguageRequest } from '@/lib/api';

interface NaturalLanguageInputProps {
  entities: Entities;
  onRuleCreated: (rule: Rule) => void;
  disabled?: boolean;
}

export function NaturalLanguageInput({ entities, onRuleCreated, disabled = false }: NaturalLanguageInputProps) {
  const [request, setRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request.trim() || disabled) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await processNaturalLanguageRequest(request, entities);
      
      if (response.success && response.rule) {
        setResult(response);
        // Auto-create the rule
        onRuleCreated(response.rule);
        setRequest('');
      } else {
        setError(response.error || 'Failed to process request');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setRequest('');
    setResult(null);
    setError(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Natural Language Rules
        </CardTitle>
        <CardDescription>
          Describe your business rule in plain English and AI will convert it to a structured rule
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="e.g., Tasks T12 and T14 must always run together"
              disabled={disabled || loading}
              className="text-sm"
            />
            <div className="text-xs text-gray-500">
              Examples: "Engineering team can handle max 3 tasks per phase", "VIP clients get priority 1"
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={!request.trim() || disabled || loading}
              size="sm"
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {loading ? 'Processing...' : 'Generate Rule'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={loading}
            >
              Clear
            </Button>
          </div>
        </form>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && result.success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{result.rule.type}</Badge>
                  <span className="font-medium">{result.rule.name}</span>
                </div>
                <p className="text-sm">{result.reasoning}</p>
                <div className="text-xs text-green-600">
                  Confidence: {Math.round(result.confidence * 100)}%
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {result && result.validationIssues && result.validationIssues.length > 0 && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">Validation Issues:</div>
                <ul className="text-sm list-disc list-inside">
                  {result.validationIssues.map((issue: string, index: number) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
} 