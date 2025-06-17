import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  TrashIcon, 
  FolderIcon,
  Bars3Icon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { calendarService } from '../services/calendarService';

interface ProjectItem {
  id: string;
  text: string;
  projectId: string;
  isCompleted: boolean;
  scheduled: boolean;
  scheduledEventId?: string;
  estimatedDuration: number;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

interface Project {
  id: string;
  name: string;
  items: ProjectItem[];
  isExpanded: boolean;
  createdAt: Date;
}

interface ProjectListWidgetProps {
  contextId: string;
  userId: string;
  onItemScheduled?: () => void;
  compact?: boolean;
}

interface ScheduleProjectItemData {
  id: string;
  title: string;
  estimatedDuration: number;
  priority: string;
  projectName: string;
  projectId: string;
}

const ProjectListWidget: React.FC<ProjectListWidgetProps> = ({
  contextId,
  userId,
  onItemScheduled,
  compact = false
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [showAddProject, setShowAddProject] = useState(false);
  const [newItemTexts, setNewItemTexts] = useState<{[projectId: string]: string}>({});

  useEffect(() => {
    loadProjects();
  }, [contextId]);

  useEffect(() => {
    const handleProjectItemScheduled = (event: CustomEvent) => {
      const { projectItemId, eventId } = event.detail;
      console.log('ProjectListWidget received projectItemScheduled event:', { projectItemId, eventId });
      markItemAsScheduled(projectItemId, eventId);
    };

    window.addEventListener('projectItemScheduled', handleProjectItemScheduled as EventListener);
    
    return () => {
      window.removeEventListener('projectItemScheduled', handleProjectItemScheduled as EventListener);
    };
  }, []);

  const loadProjects = () => {
    // For now, load from localStorage (could be replaced with Firebase later)
    const key = `projects_${contextId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      setProjects(parsed.map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        items: p.items.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          scheduled: item.scheduled ?? false,
          scheduledEventId: item.scheduledEventId
        }))
      })));
    }
  };

  const saveProjects = (updatedProjects: Project[]) => {
    const key = `projects_${contextId}`;
    localStorage.setItem(key, JSON.stringify(updatedProjects));
    setProjects(updatedProjects);
  };

  const addProject = () => {
    if (!newProjectName.trim()) return;

    const newProject: Project = {
      id: `project_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      name: newProjectName.trim(),
      items: [],
      isExpanded: true,
      createdAt: new Date()
    };

    const updatedProjects = [...projects, newProject];
    saveProjects(updatedProjects);
    setNewProjectName('');
    setShowAddProject(false);
  };

  const deleteProject = (projectId: string) => {
    const updatedProjects = projects.filter(p => p.id !== projectId);
    saveProjects(updatedProjects);
  };

  const toggleProject = (projectId: string) => {
    const updatedProjects = projects.map(p => 
      p.id === projectId ? { ...p, isExpanded: !p.isExpanded } : p
    );
    saveProjects(updatedProjects);
  };

  const addItem = (projectId: string) => {
    const text = newItemTexts[projectId]?.trim();
    if (!text) return;

    const newItem: ProjectItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      text,
      projectId,
      isCompleted: false,
      scheduled: false,
      estimatedDuration: 30,
      priority: 'medium',
      createdAt: new Date()
    };

    const updatedProjects = projects.map(p => 
      p.id === projectId ? { ...p, items: [...p.items, newItem] } : p
    );
    saveProjects(updatedProjects);
    setNewItemTexts({ ...newItemTexts, [projectId]: '' });
  };

  const deleteItem = (projectId: string, itemId: string) => {
    const updatedProjects = projects.map(p => 
      p.id === projectId 
        ? { ...p, items: p.items.filter(item => item.id !== itemId) }
        : p
    );
    saveProjects(updatedProjects);
  };

  const toggleItemCompletion = (projectId: string, itemId: string) => {
    const updatedProjects = projects.map(p => 
      p.id === projectId 
        ? { 
            ...p, 
            items: p.items.map(item => 
              item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
            )
          }
        : p
    );
    saveProjects(updatedProjects);
  };

  const markItemAsScheduled = (itemId: string, eventId: string) => {
    console.log('markItemAsScheduled called:', { itemId, eventId });
    const updatedProjects = projects.map(project => ({
      ...project,
      items: project.items.map(item => 
        item.id === itemId 
          ? { ...item, scheduled: true, scheduledEventId: eventId }
          : item
      )
    }));
    console.log('Updated projects after scheduling:', updatedProjects);
    saveProjects(updatedProjects);
  };

  const markItemAsUnscheduled = async (itemId: string) => {
    // Find the item to get its scheduledEventId
    let scheduledEventId: string | undefined;
    for (const project of projects) {
      const item = project.items.find(item => item.id === itemId);
      if (item?.scheduledEventId) {
        scheduledEventId = item.scheduledEventId;
        break;
      }
    }

    // Remove from calendar if event ID exists
    if (scheduledEventId) {
      try {
        await calendarService.deleteEvent(scheduledEventId);
      } catch (error) {
        console.error('Error removing calendar event:', error);
        // Continue with unscheduling even if calendar removal fails
      }
    }

    const updatedProjects = projects.map(project => ({
      ...project,
      items: project.items.map(item => 
        item.id === itemId 
          ? { ...item, scheduled: false, scheduledEventId: undefined }
          : item
      )
    }));
    saveProjects(updatedProjects);
    onItemScheduled?.(); // Refresh parent components
  };

  const displayProjects = compact ? projects.slice(0, 2) : projects;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Widget Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FolderIcon className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Project Lists</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
              {projects.reduce((total, p) => total + p.items.filter(item => !item.isCompleted && !item.scheduled).length, 0)}
            </span>
          </div>
          
          {!showAddProject && (
            <button
              onClick={() => setShowAddProject(true)}
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Widget Content */}
      <div className="p-6">
        {/* Add Project Form */}
        {showAddProject && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Enter project name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && addProject()}
            />
            <div className="flex justify-end space-x-2 mt-2">
              <button
                onClick={() => {
                  setShowAddProject(false);
                  setNewProjectName('');
                }}
                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={addProject}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Project
              </button>
            </div>
          </div>
        )}

        {/* Projects List */}
        {displayProjects.length === 0 ? (
          <div className="text-center py-8">
            <FolderIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">No projects yet</h3>
            <p className="text-sm text-gray-500">Create a project to organize your tasks</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayProjects.map((project) => (
              <div key={project.id} className="border border-gray-200 rounded-lg">
                {/* Project Header */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-t-lg">
                  <button
                    onClick={() => toggleProject(project.id)}
                    className="flex items-center space-x-2 flex-1 text-left"
                  >
                    {project.isExpanded ? (
                      <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                    )}
                    <h4 className="font-medium text-gray-900">{project.name}</h4>
                    <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                      {project.items.filter(item => !item.isCompleted && !item.scheduled).length}
                    </span>
                  </button>
                  <button
                    onClick={() => deleteProject(project.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Project Items */}
                {project.isExpanded && (
                  <div className="p-3">
                    {/* Add Item Form */}
                    <div className="mb-3">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newItemTexts[project.id] || ''}
                          onChange={(e) => setNewItemTexts({ ...newItemTexts, [project.id]: e.target.value })}
                          placeholder="Add task to this project..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          onKeyDown={(e) => e.key === 'Enter' && addItem(project.id)}
                        />
                        <button
                          onClick={() => addItem(project.id)}
                          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2">
                      {project.items.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center space-x-2 p-2 rounded border ${
                            item.isCompleted 
                              ? 'bg-green-50 border-green-200 opacity-60' 
                              : item.scheduled
                              ? 'bg-yellow-50 border-yellow-200 opacity-60'
                              : 'bg-white border-gray-200 hover:bg-gray-50 cursor-move'
                          }`}
                          draggable={!item.isCompleted && !item.scheduled}
                          onDragStart={(e) => {
                            if (!item.isCompleted && !item.scheduled) {
                              e.dataTransfer.setData('application/json', JSON.stringify({
                                type: 'project_item',
                                data: {
                                  id: item.id,
                                  title: item.text,
                                  estimatedDuration: item.estimatedDuration,
                                  priority: item.priority,
                                  projectName: project.name,
                                  projectId: project.id
                                }
                              }));
                              e.currentTarget.style.opacity = '0.5';
                            }
                          }}
                          onDragEnd={(e) => {
                            e.currentTarget.style.opacity = '1';
                          }}
                          title={
                            item.isCompleted ? "" :
                            item.scheduled ? "Scheduled - click to unschedule" :
                            "Drag to timeline to schedule"
                          }
                          onClick={async () => {
                            if (item.scheduled && !item.isCompleted) {
                              // Handle unscheduling
                              await markItemAsUnscheduled(item.id);
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={item.isCompleted}
                            onChange={() => toggleItemCompletion(project.id, item.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          {!item.isCompleted && !item.scheduled && (
                            <Bars3Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                          <span className={`flex-1 text-sm ${
                            item.isCompleted ? 'line-through text-gray-500' : 
                            item.scheduled ? 'line-through text-yellow-700' :
                            'text-gray-900'
                          }`}>
                            {item.text}
                          </span>
                          {item.scheduled && !item.isCompleted && (
                            <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">Scheduled</span>
                          )}
                          <span className="text-xs text-gray-500">{item.estimatedDuration}m</span>
                          <button
                            onClick={() => deleteItem(project.id, item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      
                      {project.items.length === 0 && (
                        <div className="text-center py-4 text-sm text-gray-500">
                          No tasks yet. Add tasks to this project above.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {compact && projects.length > 2 && (
              <div className="text-center pt-2">
                <span className="text-sm text-gray-500">
                  +{projects.length - 2} more projects
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectListWidget;