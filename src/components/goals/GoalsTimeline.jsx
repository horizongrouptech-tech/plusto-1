import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Target, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';

// Custom Node Component - עיצוב משופר וברור
const GoalNode = ({ data }) => {
  const statusConfig = {
    open: {
      border: 'border-gray-400',
      bg: 'bg-gradient-to-br from-gray-500/20 to-gray-600/10',
      icon: '○',
      iconBg: 'bg-gray-500',
      label: 'פתוח'
    },
    in_progress: {
      border: 'border-blue-400',
      bg: 'bg-gradient-to-br from-blue-500/20 to-blue-600/10',
      icon: '⟳',
      iconBg: 'bg-blue-500',
      label: 'בביצוע'
    },
    done: {
      border: 'border-green-400',
      bg: 'bg-gradient-to-br from-green-500/20 to-green-600/10',
      icon: '✓',
      iconBg: 'bg-green-500',
      label: 'הושלם'
    },
    delayed: {
      border: 'border-red-400',
      bg: 'bg-gradient-to-br from-red-500/20 to-red-600/10',
      icon: '!',
      iconBg: 'bg-red-500',
      label: 'באיחור'
    },
    cancelled: {
      border: 'border-gray-300',
      bg: 'bg-gradient-to-br from-gray-400/20 to-gray-500/10',
      icon: '✕',
      iconBg: 'bg-gray-400',
      label: 'בוטל'
    }
  };

  const config = statusConfig[data.status] || statusConfig.open;

  return (
    <div 
      className={`
        w-48 min-h-[120px] rounded-2xl p-4 
        ${config.bg} ${config.border} border-3 
        shadow-xl hover:shadow-2xl 
        transition-all duration-300 cursor-pointer 
        hover:scale-105 hover:border-horizon-primary
        backdrop-blur-sm
        relative
      `}
      onClick={data.onClick}
    >
      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-4 h-4 !bg-horizon-primary border-2 border-white shadow-lg hover:scale-125 transition-transform"
        style={{ top: -8 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-4 h-4 !bg-horizon-secondary border-2 border-white shadow-lg hover:scale-125 transition-transform"
        style={{ bottom: -8 }}
      />
      
      <div className="space-y-3">
        {/* Header with status icon */}
        <div className="flex items-start justify-between gap-2">
          <div className={`${config.iconBg} w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0`}>
            {config.icon}
          </div>
          <Badge className={`text-[10px] ${config.bg} ${config.border} border`}>
            {config.label}
          </Badge>
        </div>

        {/* Goal name */}
        <div className="min-h-[40px]">
          <p className="text-sm font-bold text-horizon-text leading-tight break-words">
            {data.label}
          </p>
        </div>

        {/* Date */}
        {data.endDate && (
          <div className="flex items-center gap-2 text-xs text-horizon-accent pt-2 border-t border-horizon/30">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span>{format(new Date(data.endDate), 'dd/MM/yy', { locale: he })}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const nodeTypes = {
  goalNode: GoalNode
};

export default function GoalsTimeline({ customer }) {
  const queryClient = useQueryClient();
  const [selectedGoal, setSelectedGoal] = useState(null);

  // טעינת יעדים - מיון לפי תאריך (מקרוב לרחוק)
  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['customerGoals', customer?.email],
    queryFn: async () => {
      const allGoals = await base44.entities.CustomerGoal.filter({
      customer_email: customer.email,
      is_active: true
      });
      // מיון לפי start_date או end_date (מקרוב לרחוק)
      return allGoals.sort((a, b) => {
        const dateA = new Date(a.start_date || a.end_date || 0);
        const dateB = new Date(b.start_date || b.end_date || 0);
        return dateA - dateB; // קרוב לרחוק
      });
    },
    enabled: !!customer?.email
  });

  // המרת יעדים ל-nodes ו-edges
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!goals.length) return { nodes: [], edges: [] };

    // יצירת nodes
    const nodes = goals.map((goal, index) => {
      // חישוב מיקום אוטומטי אם אין מיקום שמור
      const position = goal.visual_position || {
        x: 100 + (index * 200),
        y: 100 + (Math.floor(index / 5) * 150)
      };

      return {
        id: goal.id,
        type: 'goalNode',
        position,
        data: {
          label: goal.name,
          status: goal.status,
          endDate: goal.end_date,
          shape: goal.shape_type || 'circle',
          onClick: () => setSelectedGoal(goal)
        }
      };
    });

    // יצירת edges לפי תלויות
    const edges = goals
      .filter(goal => goal.depends_on_goal_id)
      .map(goal => ({
        id: `e-${goal.depends_on_goal_id}-${goal.id}`,
        source: goal.depends_on_goal_id,
        target: goal.id,
        type: 'smoothstep',
        animated: goal.status === 'in_progress',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#32acc1'
        },
        style: { 
          stroke: '#32acc1', 
          strokeWidth: 3 
        },
        label: 'תלוי ב-',
        labelStyle: {
          fill: '#32acc1',
          fontSize: 11,
          fontWeight: 600
        },
        labelBgStyle: {
          fill: '#0A192F',
          fillOpacity: 0.8
        }
      }));

    return { nodes, edges };
  }, [goals]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // עדכון nodes כאשר goals משתנים
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    async (params) => {
      // הוספת קו חדש
      const newEdge = {
        ...params,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#32acc1'
        },
        style: { 
          stroke: '#32acc1', 
          strokeWidth: 3 
        },
        label: 'תלוי ב-'
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
      
      // שמירה בדאטאבייס
      try {
        await base44.entities.CustomerGoal.update(params.target, {
          depends_on_goal_id: params.source
        });
        queryClient.invalidateQueries(['customerGoals', customer.email]);
      } catch (error) {
        console.error('Error saving connection:', error);
      }
    },
    [setEdges, customer, queryClient]
  );

  // שמירת מיקום node
  const handleNodeDragStop = useCallback(
    async (event, node) => {
      try {
        await base44.entities.CustomerGoal.update(node.id, {
          visual_position: node.position
        });
      } catch (error) {
        console.error('Error saving position:', error);
      }
    },
    []
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-12 text-center">
          <Target className="w-16 h-16 mx-auto mb-4 text-horizon-accent opacity-50" />
          <p className="text-horizon-accent mb-2">אין יעדים להצגה</p>
          <p className="text-sm text-horizon-accent">צור יעד ראשון כדי להתחיל לעבוד עם ציר הזמן</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-horizon-text flex items-center gap-2">
            <Calendar className="w-5 h-5 text-horizon-primary" />
            ציר זמן ויזואלי - יעדים
          </CardTitle>
          <p className="text-sm text-horizon-accent">
            גרור יעדים להזזה, חבר ביניהם ליצירת תלויות
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[700px] bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] rounded-xl border-2 border-horizon shadow-2xl">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDragStop={handleNodeDragStop}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-left"
              style={{ direction: 'ltr' }}
              connectionMode="loose"
              connectionLineStyle={{ 
                stroke: '#32acc1', 
                strokeWidth: 3,
                strokeDasharray: '5,5'
              }}
              connectionLineType="smoothstep"
              defaultEdgeOptions={{
                type: 'smoothstep',
                animated: true,
                style: { strokeWidth: 3 }
              }}
            >
              <Background 
                color="#32acc1" 
                gap={20} 
                size={2}
                style={{ opacity: 0.15 }}
              />
              <Controls 
                className="bg-horizon-card/90 backdrop-blur-sm border border-horizon rounded-lg shadow-xl" 
                showInteractive={false}
              />
              <MiniMap 
                nodeColor={(node) => {
                  const colors = {
                    done: '#48BB78',
                    in_progress: '#63B3ED',
                    open: '#cbd5e0',
                    delayed: '#FC8181',
                    cancelled: '#A0AEC0'
                  };
                  return colors[node.data.status] || '#cbd5e0';
                }}
                className="bg-horizon-card/90 backdrop-blur-sm border border-horizon rounded-lg shadow-lg"
                maskColor="rgba(10, 25, 47, 0.8)"
              />
            </ReactFlow>
          </div>
          
          <div className="mt-4 bg-horizon-primary/10 border border-horizon-primary/30 rounded-lg p-4 text-center">
            <p className="text-sm text-horizon-text font-medium">
              💡 <strong>איך להשתמש:</strong> גרור יעדים להזזה • גרור מנקודה אחת לאחרת ליצירת תלות • לחץ על יעד לעריכה
            </p>
          </div>
        </CardContent>
      </Card>

      {/* מקרא משופר */}
      <Card className="card-horizon bg-gradient-to-r from-horizon-card to-horizon-dark/50">
        <CardContent className="p-6">
          <p className="text-xs text-horizon-accent font-bold mb-4 text-center">מקרא סטטוסים</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex flex-col items-center gap-2 p-3 bg-horizon-dark/50 rounded-lg border border-horizon">
              <div className="w-10 h-10 rounded-lg bg-gray-500 flex items-center justify-center text-white font-bold shadow-md">○</div>
              <span className="text-sm text-horizon-text font-medium">פתוח</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 bg-horizon-dark/50 rounded-lg border border-horizon">
              <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold shadow-md">⟳</div>
              <span className="text-sm text-horizon-text font-medium">בביצוע</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 bg-horizon-dark/50 rounded-lg border border-horizon">
              <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center text-white font-bold shadow-md">✓</div>
              <span className="text-sm text-horizon-text font-medium">הושלם</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 bg-horizon-dark/50 rounded-lg border border-horizon">
              <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center text-white font-bold shadow-md">!</div>
              <span className="text-sm text-horizon-text font-medium">באיחור</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 bg-horizon-dark/50 rounded-lg border border-horizon">
              <div className="w-10 h-10 rounded-lg bg-gray-400 flex items-center justify-center text-white font-bold shadow-md">✕</div>
              <span className="text-sm text-horizon-text font-medium">בוטל</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}