'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Clock, AlertCircle, Filter, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';


interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  patient_id: string | null;
  visit_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_from_shortcut: boolean;
  shortcut_code: string | null;
  created_at: string;
}

interface TaskListProps {
  patientId?: string;
  visitId?: string;
  showFilters?: boolean;
  maxHeight?: string;
}

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200'
};

const CATEGORY_ICONS: Record<string, string> = {
  follow_up: '📅',
  lab_order: '🧪',
  imaging_order: '🔬',
  referral: '👨‍⚕️',
  medication: '💊',
  phone_call: '📞',
  review: '📋',
  documentation: '📝',
  other: '📌'
};

export default function TaskList({ patientId, visitId, showFilters = true, maxHeight = '600px' }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [patientId, visitId, statusFilter, priorityFilter, showOverdueOnly]);

  const fetchTasks = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');

      const params = new URLSearchParams();
      if (patientId) params.append('patient_id', patientId);
      if (statusFilter) params.append('status_filter', statusFilter);
      if (priorityFilter) params.append('priority_filter', priorityFilter);
      if (showOverdueOnly) params.append('overdue_only', 'true');

      const response = await axios.get<Task[]>(
        `/api/tasks?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setTasks(response.data);

    } catch (error: any) {
      console.error('Failed to fetch tasks:', error);

      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('token');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }

      toast.error('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');

      await axios.post(
        `${API_URL}/api/tasks/${taskId}/complete`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      toast.success('Task marked as complete');
      fetchTasks();

    } catch (error: any) {
      console.error('Failed to complete task:', error);
      toast.error('Failed to complete task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');

      await axios.delete(
        `${API_URL}/api/tasks/${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      toast.success('Task deleted');
      fetchTasks();

    } catch (error: any) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
    }
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return 'No due date';

    const date = new Date(dueDate);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''}`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else if (diffDays <= 7) {
      return `Due in ${diffDays} days`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            {patientId ? 'Patient Tasks' : 'My Tasks'}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {pendingTasks.length} pending
            </span>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <button
              onClick={() => setShowOverdueOnly(!showOverdueOnly)}
              className={`text-sm px-3 py-1 rounded transition-colors ${
                showOverdueOnly
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-300'
              }`}
            >
              Overdue Only
            </button>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="overflow-y-auto" style={{ maxHeight }}>
        {tasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm">No tasks found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  task.status === 'completed' ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Status Icon */}
                  <button
                    onClick={() => task.status !== 'completed' && handleCompleteTask(task.id)}
                    className="flex-shrink-0 mt-1"
                    disabled={task.status === 'completed'}
                  >
                    {task.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400 hover:text-blue-600 cursor-pointer" />
                    )}
                  </button>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{CATEGORY_ICONS[task.category] || '📌'}</span>
                          <h4 className={`font-medium text-sm ${
                            task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-800'
                          }`}>
                            {task.title}
                          </h4>
                        </div>

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded border ${
                            PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] || 'bg-gray-100 text-gray-800'
                          }`}>
                            {task.priority}
                          </span>

                          {task.due_date && (
                            <span className={`text-xs flex items-center gap-1 ${
                              isOverdue(task.due_date) && task.status !== 'completed'
                                ? 'text-red-600 font-semibold'
                                : 'text-gray-600'
                            }`}>
                              <Clock className="w-3 h-3" />
                              {formatDueDate(task.due_date)}
                            </span>
                          )}

                          {task.created_from_shortcut && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                              {task.shortcut_code}
                            </span>
                          )}
                        </div>

                        {/* Expandable Description */}
                        {task.description && (
                          <button
                            onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            {expandedTask === task.id ? (
                              <>
                                <ChevronUp className="w-3 h-3" />
                                Hide details
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3" />
                                Show details
                              </>
                            )}
                          </button>
                        )}

                        {expandedTask === task.id && task.description && (
                          <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
