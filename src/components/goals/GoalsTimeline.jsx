import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType
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

// Custom Node Component
const GoalNode = ({ data }) => {
  const statusColors = {
    open: 'border-gray-400 bg-gray-500/10',
    in_progress: 'border-blue-400 bg-blue-500/10',
    done: 'border-green-400 bg-green-500/10',
    delayed: 'border-red-400 bg-red-500/10',
    cancelled: 'border-gray-300 bg-gray-400/10'
  };

  const shapeClasses = {
    circle: 'rounded-full w-32 h-32',
    rectangle: 'rounded-lg w-40 h-24',
    rounded: 'rounded-2xl w-36 h-28'
  };

  return (
    <div 
      className={`${shapeClasses[data.shape || 'circle']} ${statusColors[data.status]} border-2 p-3 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-all`}
      onClick={data.onClick}
    >
      <div className="text-center">
        <p className="text-xs font-bold text-horizon-text truncate max-w-full px-2">
          {data.label}
        </p>
        {data.endDate && (
          <p className="text-[10px] text-horizon-accent mt-1">
            {format(new Date(data.endDate), 'dd/MM/yy', { locale: he })}
          </p>
        )}
        <Badge className={`mt-1 text-[9px] ${statusColors[data.status]}`}>
          {data.status === 'done' ? '✓' : data.status === 'delayed' ? '!' : '○'}
        </Badge>
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

  // טעינת יעדים
  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['customerGoals', customer?.email],
    queryFn: () => base44.entities.CustomerGoal.filter({
      customer_email: customer.email,
      is_active: true
    }, 'start_date'),
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
        style: { stroke: '#32acc1', strokeWidth: 2 }
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
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
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
          <div className="h-[600px] bg-horizon-dark rounded-lg border border-horizon">
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
            >
              <Background color="#32acc1" gap={16} />
              <Controls className="bg-horizon-card border-horizon" />
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
                className="bg-horizon-card border border-horizon"
              />
            </ReactFlow>
          </div>
        </CardContent>
      </Card>

      {/* מקרא */}
      <Card className="card-horizon">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-gray-400 bg-gray-500/10"></div>
              <span className="text-sm text-horizon-accent">פתוח</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-blue-400 bg-blue-500/10"></div>
              <span className="text-sm text-horizon-accent">בביצוע</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-green-400 bg-green-500/10"></div>
              <span className="text-sm text-horizon-accent">הושלם</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-red-400 bg-red-500/10"></div>
              <span className="text-sm text-horizon-accent">באיחור</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}