import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  User,
  Edit,
  Copy,
  Link as LinkIcon,
  Trash,
  CheckCircle,
  Circle as CircleIcon,
  Clock,
  AlertCircle,
  XCircle,
  MoreVertical
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const EnhancedGoalNode = ({ data, selected }) => {
  const [showActions, setShowActions] = useState(false);

  const statusConfig = {
    open: {
      icon: CircleIcon,
      color: 'text-gray-400',
      bg: 'bg-gray-500/20',
      border: 'border-gray-500/50',
      gradient: 'from-gray-500/10 to-gray-600/5'
    },
    in_progress: {
      icon: Clock,
      color: 'text-blue-400',
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/50',
      gradient: 'from-blue-500/10 to-blue-600/5'
    },
    done: {
      icon: CheckCircle,
      color: 'text-green-400',
      bg: 'bg-green-500/20',
      border: 'border-green-500/50',
      gradient: 'from-green-500/10 to-green-600/5'
    },
    delayed: {
      icon: AlertCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/20',
      border: 'border-red-500/50',
      gradient: 'from-red-500/10 to-red-600/5'
    },
    cancelled: {
      icon: XCircle,
      color: 'text-gray-300',
      bg: 'bg-gray-400/20',
      border: 'border-gray-400/50',
      gradient: 'from-gray-400/10 to-gray-500/5'
    }
  };

  const config = statusConfig[data.status] || statusConfig.open;
  const StatusIcon = config.icon;

  const handleClick = (e) => {
    // מניעת פעולה כפולה
    if (e.target.closest('.node-action-button')) {
      return;
    }
    data.onClick?.();
  };

  return (
    <div
      className={`
        relative w-72 min-h-[160px] rounded-2xl
        bg-horizon-card/95
        backdrop-blur-md
        border-2 ${config.border}
        shadow-xl hover:shadow-2xl
        transition-all duration-300 cursor-pointer
        ${selected ? 'ring-2 ring-horizon-primary ring-offset-2 ring-offset-horizon-dark' : ''}
        ${showActions ? 'scale-105' : 'hover:scale-102'}
      `}
      style={{
        background: 'rgba(17, 34, 64, 0.95)'
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={handleClick}
    >
      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-horizon-primary border-2 border-white shadow-lg hover:scale-150 transition-transform"
        style={{ top: -6 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-horizon-secondary border-2 border-white shadow-lg hover:scale-150 transition-transform"
        style={{ bottom: -6 }}
      />

      {/* Mini Toolbar */}
      {showActions && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-horizon-card border border-horizon rounded-lg shadow-xl p-1 flex items-center gap-1 z-50 animate-fadeInScale">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              data.onEdit?.();
            }}
            className="h-8 w-8 hover:bg-horizon-primary/20 node-action-button"
            title="ערוך"
          >
            <Edit className="w-4 h-4 text-horizon-accent" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              data.onDuplicate?.();
            }}
            className="h-8 w-8 hover:bg-horizon-primary/20 node-action-button"
            title="שכפל"
          >
            <Copy className="w-4 h-4 text-horizon-accent" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete?.();
            }}
            className="h-8 w-8 hover:bg-red-500/20 node-action-button"
            title="מחק"
          >
            <Trash className="w-4 h-4 text-red-400" />
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className={`${config.bg} ${config.color} w-10 h-10 rounded-xl flex items-center justify-center shadow-md flex-shrink-0`}>
            <StatusIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <Badge className={`text-[10px] ${config.bg} ${config.color} border ${config.border}`}>
              {data.statusLabel || data.status}
            </Badge>
          </div>
        </div>

        {/* Goal Name */}
        <div className="min-h-[45px]">
          <h3 
            className="text-sm font-bold text-horizon-text leading-tight break-words line-clamp-3"
            style={{
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.8), 0 1px 2px rgba(0, 0, 0, 0.6)'
            }}
          >
            {data.label}
          </h3>
        </div>

        {/* Progress Bar (if subtasks exist) */}
        {data.subtasks_total > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-horizon-accent">
              <span>{data.subtasks_done || 0} / {data.subtasks_total}</span>
              <span>{Math.round(((data.subtasks_done || 0) / data.subtasks_total) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-horizon-dark/50 rounded-full overflow-hidden">
              <div
                className={`h-full ${config.bg} ${config.color} transition-all duration-500`}
                style={{ 
                  width: `${((data.subtasks_done || 0) / data.subtasks_total) * 100}%` 
                }}
              />
            </div>
          </div>
        )}

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-horizon/30">
          {/* Date */}
          {data.endDate && (
            <div 
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-horizon-dark/70 border border-horizon/50"
              style={{
                backdropFilter: 'blur(12px)'
              }}
            >
              <Calendar className="w-3 h-3 flex-shrink-0 text-horizon-primary" />
              <span 
                className="text-xs font-semibold text-horizon-text"
                style={{
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)'
                }}
              >
                {format(new Date(data.endDate), 'dd/MM/yy', { locale: he })}
              </span>
            </div>
          )}

          {/* Assignee */}
          {data.assignee && (
            <div 
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-horizon-dark/70 border border-horizon/50"
              style={{
                backdropFilter: 'blur(12px)'
              }}
            >
              <User className="w-3 h-3 flex-shrink-0 text-horizon-secondary" />
              <span 
                className="truncate max-w-[100px] text-xs font-semibold text-horizon-text"
                style={{
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)'
                }}
              >
                {data.assignee}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedGoalNode;