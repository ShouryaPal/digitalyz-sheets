import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Save, 
  X, 
  AlertCircle,
  Settings,
  Users,
  Calendar,
  Code,
  ArrowUpDown
} from 'lucide-react';
import { Rule, RuleType, Entities } from '@/types/entities';
import { createBaseRule, validateRule, getAvailableTaskIds, getAvailableWorkerGroups, getAvailableClientGroups } from '@/lib/ruleUtils';

interface RuleFormProps {
  ruleType: RuleType;
  entities: Entities;
  existingRule?: Rule | null;
  onSave: (rule: Rule) => void;
  onCancel: () => void;
}

export function RuleForm({ ruleType, entities, existingRule, onSave, onCancel }: RuleFormProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (existingRule) {
      setFormData(existingRule);
    } else {
      const baseRule = createBaseRule(ruleType, '', '');
      setFormData({
        ...baseRule,
        // Set default values based on rule type
        ...(ruleType === 'coRun' && { tasks: [] }),
        ...(ruleType === 'slotRestriction' && { groupType: 'workerGroup', minCommonSlots: 1 }),
        ...(ruleType === 'loadLimit' && { maxSlotsPerPhase: 1 }),
        ...(ruleType === 'phaseWindow' && { allowedPhases: [], strict: false }),
        ...(ruleType === 'patternMatch' && { regex: '', ruleTemplate: '', parameters: {}, targetEntity: 'tasks', targetField: 'TaskName' }),
        ...(ruleType === 'precedenceOverride' && { scope: 'global', overrideValue: '' }),
      });
    }
  }, [ruleType, existingRule]);

  useEffect(() => {
    if (formData.id) {
      const validation = validateRule(formData as Rule, entities);
      setErrors(validation.errors);
      setIsValid(validation.isValid);
    }
  }, [formData, entities]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleInputChange = (field: string, value: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
      updatedAt: new Date().toISOString()
    }));
  };

  const handleSave = () => {
    if (isValid) {
      onSave(formData as Rule);
    }
  };

  const renderCoRunFields = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="tasks">Task IDs (comma-separated)</Label>
        <Input
          id="tasks"
          value={formData.tasks?.join(', ') || ''}
          onChange={(e) => handleInputChange('tasks', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
          placeholder="T12, T14, T15"
        />
        <div className="text-xs text-gray-500 mt-1">
          Available tasks: {getAvailableTaskIds(entities).join(', ')}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="minTasks">Minimum Tasks</Label>
          <Input
            id="minTasks"
            type="number"
            value={formData.minTasks || ''}
            onChange={(e) => handleInputChange('minTasks', parseInt(e.target.value) || undefined)}
            placeholder="2"
          />
        </div>
        <div>
          <Label htmlFor="maxTasks">Maximum Tasks</Label>
          <Input
            id="maxTasks"
            type="number"
            value={formData.maxTasks || ''}
            onChange={(e) => handleInputChange('maxTasks', parseInt(e.target.value) || undefined)}
            placeholder="5"
          />
        </div>
      </div>
    </div>
  );

  const renderSlotRestrictionFields = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="groupType">Group Type</Label>
        <Select value={formData.groupType} onValueChange={(value) => handleInputChange('groupType', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="workerGroup">Worker Group</SelectItem>
            <SelectItem value="clientGroup">Client Group</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="groupName">Group Name</Label>
        <Select value={formData.groupName} onValueChange={(value) => handleInputChange('groupName', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select group" />
          </SelectTrigger>
          <SelectContent>
            {formData.groupType === 'workerGroup' 
              ? getAvailableWorkerGroups(entities).map(group => (
                  <SelectItem key={group} value={group}>{group}</SelectItem>
                ))
              : getAvailableClientGroups(entities).map(group => (
                  <SelectItem key={group} value={group}>{group}</SelectItem>
                ))
            }
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="minCommonSlots">Minimum Common Slots</Label>
        <Input
          id="minCommonSlots"
          type="number"
          value={formData.minCommonSlots || ''}
          onChange={(e) => handleInputChange('minCommonSlots', parseInt(e.target.value) || 1)}
          min="1"
        />
      </div>
    </div>
  );

  const renderLoadLimitFields = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="workerGroup">Worker Group</Label>
        <Select value={formData.workerGroup} onValueChange={(value) => handleInputChange('workerGroup', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select worker group" />
          </SelectTrigger>
          <SelectContent>
            {getAvailableWorkerGroups(entities).map(group => (
              <SelectItem key={group} value={group}>{group}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="maxSlotsPerPhase">Maximum Slots Per Phase</Label>
        <Input
          id="maxSlotsPerPhase"
          type="number"
          value={formData.maxSlotsPerPhase || ''}
          onChange={(e) => handleInputChange('maxSlotsPerPhase', parseInt(e.target.value) || 1)}
          min="1"
        />
      </div>
    </div>
  );

  const renderPhaseWindowFields = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="taskId">Task ID</Label>
        <Select value={formData.taskId} onValueChange={(value) => handleInputChange('taskId', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select task" />
          </SelectTrigger>
          <SelectContent>
            {getAvailableTaskIds(entities).map(taskId => (
              <SelectItem key={taskId} value={taskId}>{taskId}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="allowedPhases">Allowed Phases (comma-separated)</Label>
        <Input
          id="allowedPhases"
          value={Array.isArray(formData.allowedPhases) ? formData.allowedPhases.join(', ') : ''}
          onChange={(e) => handleInputChange('allowedPhases', e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)))}
          placeholder="1, 2, 3"
        />
      </div>
      <div className="flex items-center space-x-2">
        <input
          id="strict"
          type="checkbox"
          checked={formData.strict || false}
          onChange={(e) => handleInputChange('strict', e.target.checked)}
          className="rounded"
        />
        <Label htmlFor="strict">Strict mode (task can ONLY run in these phases)</Label>
      </div>
    </div>
  );

  const renderPatternMatchFields = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="regex">Regex Pattern</Label>
        <Input
          id="regex"
          value={formData.regex || ''}
          onChange={(e) => handleInputChange('regex', e.target.value)}
          placeholder="urgent|priority"
        />
      </div>
      <div>
        <Label htmlFor="ruleTemplate">Rule Template</Label>
        <Input
          id="ruleTemplate"
          value={formData.ruleTemplate || ''}
          onChange={(e) => handleInputChange('ruleTemplate', e.target.value)}
          placeholder="priority_override"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="targetEntity">Target Entity</Label>
          <Select value={formData.targetEntity} onValueChange={(value) => handleInputChange('targetEntity', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tasks">Tasks</SelectItem>
              <SelectItem value="workers">Workers</SelectItem>
              <SelectItem value="clients">Clients</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="targetField">Target Field</Label>
          <Input
            id="targetField"
            value={formData.targetField || ''}
            onChange={(e) => handleInputChange('targetField', e.target.value)}
            placeholder="TaskName"
          />
        </div>
      </div>
    </div>
  );

  const renderPrecedenceOverrideFields = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="scope">Scope</Label>
        <Select value={formData.scope} onValueChange={(value) => handleInputChange('scope', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Global</SelectItem>
            <SelectItem value="specific">Specific</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {formData.scope === 'specific' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="specificEntity">Specific Entity</Label>
            <Select value={formData.specificEntity} onValueChange={(value) => handleInputChange('specificEntity', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tasks">Tasks</SelectItem>
                <SelectItem value="workers">Workers</SelectItem>
                <SelectItem value="clients">Clients</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="specificField">Specific Field</Label>
            <Input
              id="specificField"
              value={formData.specificField || ''}
              onChange={(e) => handleInputChange('specificField', e.target.value)}
              placeholder="PriorityLevel"
            />
          </div>
        </div>
      )}
      <div>
        <Label htmlFor="overrideValue">Override Value</Label>
        <Input
          id="overrideValue"
          value={formData.overrideValue || ''}
          onChange={(e) => handleInputChange('overrideValue', e.target.value)}
          placeholder="1"
        />
      </div>
    </div>
  );

  const renderRuleTypeFields = () => {
    switch (ruleType) {
      case 'coRun':
        return renderCoRunFields();
      case 'slotRestriction':
        return renderSlotRestrictionFields();
      case 'loadLimit':
        return renderLoadLimitFields();
      case 'phaseWindow':
        return renderPhaseWindowFields();
      case 'patternMatch':
        return renderPatternMatchFields();
      case 'precedenceOverride':
        return renderPrecedenceOverrideFields();
      default:
        return null;
    }
  };

  const getRuleTypeIcon = () => {
    switch (ruleType) {
      case 'coRun': return <Settings className="h-5 w-5" />;
      case 'slotRestriction': return <Users className="h-5 w-5" />;
      case 'loadLimit': return <Users className="h-5 w-5" />;
      case 'phaseWindow': return <Calendar className="h-5 w-5" />;
      case 'patternMatch': return <Code className="h-5 w-5" />;
      case 'precedenceOverride': return <ArrowUpDown className="h-5 w-5" />;
      default: return <Settings className="h-5 w-5" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getRuleTypeIcon()}
          {existingRule ? 'Edit Rule' : 'Create New Rule'}
        </CardTitle>
        <CardDescription>
          Configure the parameters for your {ruleType} rule
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Fields */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Rule Name *</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter a descriptive name"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <div>
            <Label htmlFor="priority">Priority (1-10) *</Label>
            <Input
              id="priority"
              type="number"
              min="1"
              max="10"
              value={formData.priority || 5}
              onChange={(e) => handleInputChange('priority', parseInt(e.target.value) || 5)}
            />
          </div>
        </div>

        {/* Rule Type Specific Fields */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{ruleType}</Badge>
            <span className="text-sm font-medium">Rule Parameters</span>
          </div>
          {renderRuleTypeFields()}
        </div>

        {/* Validation Errors */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!isValid}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {existingRule ? 'Update Rule' : 'Create Rule'}
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 