import { MappingResult } from "@/types/entities";

type EntityType = "clients" | "workers" | "tasks";

export function validateRelationships(
  entities: {
    clients: { headers: string[]; data: any[][]; mappingInfo?: MappingResult };
    workers: { headers: string[]; data: any[][]; mappingInfo?: MappingResult };
    tasks: { headers: string[]; data: any[][]; mappingInfo?: MappingResult };
  }
): Record<string, string> {
  const relationshipErrors: Record<string, string> = {};

  const taskIds = new Set<string>();
  if (entities.tasks.data.length > 0) {
    const taskIdIndex = entities.tasks.headers.indexOf("TaskID");
    if (taskIdIndex !== -1) {
      entities.tasks.data.forEach(row => {
        if (row[taskIdIndex]) {
          taskIds.add(row[taskIdIndex].toString().trim());
        }
      });
    }
  }

  const workerSkills = new Set<string>();
  if (entities.workers.data.length > 0) {
    const skillsIndex = entities.workers.headers.indexOf("Skills");
    if (skillsIndex !== -1) {
      entities.workers.data.forEach(row => {
        if (row[skillsIndex]) {
          const skills = row[skillsIndex].toString().split(',').map((s: string) => s.trim());
          skills.forEach((skill: string) => {
            if (skill) workerSkills.add(skill.toLowerCase());
          });
        }
      });
    }
  }

  if (entities.clients.data.length > 0 && taskIds.size > 0) {
    const requestedTasksIndex = entities.clients.headers.indexOf("RequestedTaskIDs");
    if (requestedTasksIndex !== -1) {
      entities.clients.data.forEach((row, rowIdx) => {
        if (row[requestedTasksIndex]) {
          const requestedTasks = row[requestedTasksIndex].toString().split(',').map((s: string) => s.trim());
          const missingTasks = requestedTasks.filter((taskId: string) => !taskIds.has(taskId));
          if (missingTasks.length > 0) {
            relationshipErrors[`clients-${rowIdx}-${requestedTasksIndex}`] = 
              `Requested tasks not found: ${missingTasks.join(', ')}`;
          }
        }
      });
    }
  }

  if (entities.tasks.data.length > 0 && workerSkills.size > 0) {
    const requiredSkillsIndex = entities.tasks.headers.indexOf("RequiredSkills");
    if (requiredSkillsIndex !== -1) {
      entities.tasks.data.forEach((row, rowIdx) => {
        if (row[requiredSkillsIndex]) {
          const requiredSkills = row[requiredSkillsIndex].toString().split(',').map((s: string) => s.trim());
          const missingSkills = requiredSkills.filter((skill: string) => !workerSkills.has(skill.toLowerCase()));
          if (missingSkills.length > 0) {
            relationshipErrors[`tasks-${rowIdx}-${requiredSkillsIndex}`] = 
              `Required skills not available: ${missingSkills.join(', ')}`;
          }
        }
      });
    }
  }
  
  return relationshipErrors;
} 