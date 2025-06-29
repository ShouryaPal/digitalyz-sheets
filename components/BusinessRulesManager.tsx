import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Settings, 
  Lightbulb, 
  Download,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Rule, RuleType, Entities, RuleSuggestion } from '@/types/entities';
import { RuleForm } from './RuleForm';
import { RuleSuggestionCard } from './RuleSuggestionCard';
import { NaturalLanguageInput } from './NaturalLanguageInput';
import { 
  generateRulesConfig, 
  downloadRulesConfig, 
  getRuleTypeDisplayName,
  validateRule 
} from '@/lib/ruleUtils';
import { getRuleSuggestions } from '@/lib/api';

interface BusinessRulesManagerProps {
  entities: Entities;
}

export function BusinessRulesManager({ entities }: BusinessRulesManagerProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [suggestions, setSuggestions] = useState<RuleSuggestion[]>([]);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [selectedRuleType, setSelectedRuleType] = useState<RuleType | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const hasData = Object.values(entities).some(entity => entity.data.length > 0);

  const generateSuggestions = useCallback(async () => {
    if (!hasData) return;
    
    setLoading(true);
    try {
      const result = await getRuleSuggestions(entities, rules);
      if (result.suggestions) {
        setSuggestions(result.suggestions as RuleSuggestion[]);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setLoading(false);
    }
  }, [hasData, entities, rules]);

  useEffect(() => {
    if (hasData && rules.length === 0) {
      generateSuggestions();
    }
  }, [hasData, rules.length, generateSuggestions]);

  const handleCreateRule = (ruleType: RuleType) => {
    setSelectedRuleType(ruleType);
    setEditingRule(null);
    setShowRuleForm(true);
  };

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule);
    setSelectedRuleType(rule.type);
    setShowRuleForm(true);
  };

  const handleSaveRule = (rule: Rule) => {
    if (editingRule) {
      // Update existing rule
      setRules(prev => prev.map(r => r.id === rule.id ? rule : r));
    } else {
      // Add new rule
      setRules(prev => [...prev, rule]);
    }
    setShowRuleForm(false);
    setEditingRule(null);
    setSelectedRuleType(null);
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId));
  };

  const handleToggleRule = (ruleId: string) => {
    setRules(prev => prev.map(r => 
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    ));
  };

  const handleAcceptSuggestion = (suggestion: RuleSuggestion) => {
    const rule = suggestion.suggestedRule as Rule;
    setRules(prev => [...prev, rule]);
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  };

  const handleGenerateConfig = () => {
    const rulesConfig = generateRulesConfig(rules);
    downloadRulesConfig(rulesConfig);
  };

  const getRuleValidation = (rule: Rule) => {
    return validateRule(rule, entities);
  };

  const enabledRules = rules.filter(r => r.enabled);
  const disabledRules = rules.filter(r => !r.enabled);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Business Rules</h2>
          <p className="text-gray-600">Configure scheduling rules and constraints</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={generateSuggestions}
            disabled={!hasData || loading}
            variant="outline"
            size="sm"
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            {loading ? 'Analyzing...' : 'Get AI Suggestions'}
          </Button>
          <Button
            onClick={handleGenerateConfig}
            disabled={rules.length === 0}
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Generate Rules Config
          </Button>
        </div>
      </div>

      {/* Natural Language Input */}
      <NaturalLanguageInput
        entities={entities}
        onRuleCreated={handleSaveRule}
        disabled={!hasData}
      />

      {/* Rule Type Selection */}
      {!showRuleForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Rule
            </CardTitle>
            <CardDescription>
              Choose a rule type to create a new business rule
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {(['coRun', 'slotRestriction', 'loadLimit', 'phaseWindow', 'patternMatch', 'precedenceOverride'] as RuleType[]).map((type) => (
                <Button
                  key={type}
                  onClick={() => handleCreateRule(type)}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  disabled={!hasData}
                >
                  <Settings className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">{getRuleTypeDisplayName(type)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {type === 'coRun' && 'Tasks run together'}
                      {type === 'slotRestriction' && 'Limit group availability'}
                      {type === 'loadLimit' && 'Limit worker capacity'}
                      {type === 'phaseWindow' && 'Restrict task phases'}
                      {type === 'patternMatch' && 'Pattern-based rules'}
                      {type === 'precedenceOverride' && 'Override priorities'}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rule Form */}
      {showRuleForm && selectedRuleType && (
        <RuleForm
          ruleType={selectedRuleType}
          entities={entities}
          existingRule={editingRule}
          onSave={handleSaveRule}
          onCancel={() => {
            setShowRuleForm(false);
            setEditingRule(null);
            setSelectedRuleType(null);
          }}
        />
      )}

      {/* AI Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              AI Rule Suggestions
            </CardTitle>
            <CardDescription>
              Based on your data patterns, here are some suggested rules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <RuleSuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAccept={() => handleAcceptSuggestion(suggestion)}
                  onDismiss={() => setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Rules */}
      {enabledRules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Active Rules ({enabledRules.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {enabledRules.map((rule) => {
                const validation = getRuleValidation(rule);
                return (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-green-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{getRuleTypeDisplayName(rule.type)}</Badge>
                        <span className="font-medium">{rule.name}</span>
                        {!validation.isValid && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      {rule.description && (
                        <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Priority: {rule.priority}</span>
                        <span>Created: {new Date(rule.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleEditRule(rule)}
                        variant="ghost"
                        size="sm"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleToggleRule(rule.id)}
                        variant="ghost"
                        size="sm"
                      >
                        <EyeOff className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteRule(rule.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disabled Rules */}
      {disabledRules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <EyeOff className="h-5 w-5 text-gray-400" />
              Disabled Rules ({disabledRules.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {disabledRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{getRuleTypeDisplayName(rule.type)}</Badge>
                      <span className="font-medium text-gray-600">{rule.name}</span>
                    </div>
                    {rule.description && (
                      <p className="text-sm text-gray-500 mt-1">{rule.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleEditRule(rule)}
                      variant="ghost"
                      size="sm"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleToggleRule(rule.id)}
                      variant="ghost"
                      size="sm"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteRule(rule.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Rules State */}
      {rules.length === 0 && hasData && (
        <Card>
          <CardContent className="text-center py-8">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Rules Created</h3>
            <p className="text-gray-600 mb-4">
              Create your first business rule to start configuring scheduling constraints
            </p>
            <Button onClick={() => setShowSuggestions(true)}>
              <Lightbulb className="h-4 w-4 mr-2" />
              Get AI Suggestions
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {!hasData && (
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600">
              Upload data files first to create business rules
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 