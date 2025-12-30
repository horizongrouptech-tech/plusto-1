import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Target, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';

// קומפוננטות חדשות
import TimelineToolbar from './TimelineToolbar';
import EnhancedGoalNode from './EnhancedGoalNode';
import { applyLayout } from './LayoutEngine';

const nodeTypes = {
  enhancedGoal: EnhancedGoalNode
};

export default function GoalsTimelineNew({ customer }) {
  const queryClient = useQueryClient();
  const reactFlowInstance = useReactFlow();
  const flowRef = useRef(null);
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('all');
  const [layoutType, setLayoutType] = useState('horizontal');
  const [showGroups, setShowGroups] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // פונקציות עזר
  const getStatusLabel = (status) => {
    const labels = {
      open: 'פתוח',
      in_progress: 'בביצוע',
      done: 'הושלם',
      delayed: 'באיחור',
      cancelled: 'בוטל'
    };
    return labels[status] || status;
  };

  // טעינת יעדים
  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['customerGoals', customer?.email],
    queryFn: () => base44.entities.CustomerGoal.filter({
      customer_email: customer.email,
      is_active: true
    }, 'order_index'),
    enabled: !!customer?.email
  });

  // סינון יעדים
  const filteredGoals = useMemo(() => {
    return goals.filter(goal => {
      // סינון לפי חיפוש
      if (searchTerm && !goal.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // סינון לפי סטטוס
      if (statusFilter !== 'all' && goal.status !== statusFilter) {
        return false;
      }
      
      // סינון לפי סוג תצוגה
      const isGoal = !goal.parent_id || goal.task_type === 'goal';
      const isTask = goal.parent_id || goal.task_type === 'one_time' || goal.task_type === 'recurring';
      
      if (viewMode === 'goals' && !isGoal) {
        return false;
      }
      if (viewMode === 'tasks' && !isTask) {
        return false;
      }
      
      return true;
    });
  }, [goals, searchTerm, statusFilter, viewMode]);

  // המרת יעדים ל-nodes ו-edges
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!filteredGoals.length) return { nodes: [], edges: [] };

    // יצירת nodes
    const nodes = filteredGoals.map((goal) => {
      // ספירת משימות משנה
      const subtasks = goals.filter(g => g.parent_id === goal.id);
      const subtasks_done = subtasks.filter(g => g.status === 'done').length;

      return {
        id: goal.id,
        type: 'enhancedGoal',
        position: goal.visual_position || { x: 0, y: 0 },
        data: {
          label: goal.name,
          status: goal.status,
          statusLabel: getStatusLabel(goal.status),
          endDate: goal.end_date,
          assignee: goal.assignee_email || goal.assigned_users?.[0],
          subtasks_total: subtasks.length,
          subtasks_done: subtasks_done,
          onClick: () => handleNodeClick(goal),
          onEdit: () => handleNodeEdit(goal),
          onDuplicate: () => handleNodeDuplicate(goal),
          onDelete: () => handleNodeDelete(goal)
        }
      };
    });

    // יצירת edges לפי תלויות
    const edges = filteredGoals
      .filter(goal => goal.depends_on_goal_id)
      .filter(goal => filteredGoals.find(g => g.id === goal.depends_on_goal_id)) // רק אם שני הצמתים מוצגים
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
          strokeWidth: 2.5 
        },
        label: 'תלוי ב-',
        labelStyle: {
          fill: '#32acc1',
          fontSize: 10,
          fontWeight: 600
        },
        labelBgStyle: {
          fill: '#0A192F',
          fillOpacity: 0.9
        }
      }));

    return { nodes, edges };
  }, [filteredGoals, goals]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // עדכון nodes כאשר goals משתנים
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Handlers
  const handleNodeClick = (goal) => {
    console.log('Clicked goal:', goal);
    // כאן תוסיף פתיחת מודל עריכה
  };

  const handleNodeEdit = (goal) => {
    console.log('Edit goal:', goal);
  };

  const handleNodeDuplicate = async (goal) => {
    try {
      const { id, created_date, updated_date, ...goalData } = goal;
      await base44.entities.CustomerGoal.create({
        ...goalData,
        name: `${goal.name} (עותק)`,
        visual_position: {
          x: (goal.visual_position?.x || 0) + 50,
          y: (goal.visual_position?.y || 0) + 50
        }
      });
      queryClient.invalidateQueries(['customerGoals', customer.email]);
    } catch (error) {
      console.error('Error duplicating goal:', error);
    }
  };

  const handleNodeDelete = async (goal) => {
    if (!confirm(`האם למחוק את היעד "${goal.name}"?`)) return;
    
    try {
      await base44.entities.CustomerGoal.update(goal.id, { is_active: false });
      queryClient.invalidateQueries(['customerGoals', customer.email]);
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const onConnect = useCallback(
    async (params) => {
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
          strokeWidth: 2.5 
        },
        label: 'תלוי ב-'
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
      
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

  // סידור אוטומטי
  const handleAutoLayout = useCallback(() => {
    const layoutedNodes = applyLayout(layoutType, nodes, edges);
    setNodes(layoutedNodes);
    
    // שמירה לדאטאבייס
    layoutedNodes.forEach(async (node) => {
      try {
        await base44.entities.CustomerGoal.update(node.id, {
          visual_position: node.position
        });
      } catch (error) {
        console.error('Error saving position:', error);
      }
    });
    
    // התאמה למסך
    setTimeout(() => {
      reactFlowInstance?.fitView({ padding: 0.2 });
    }, 100);
  }, [layoutType, nodes, edges, setNodes, reactFlowInstance]);

  // שינוי סידור
  const handleLayoutChange = (newLayout) => {
    setLayoutType(newLayout);
    const layoutedNodes = applyLayout(newLayout, nodes, edges);
    setNodes(layoutedNodes);
    setTimeout(() => {
      reactFlowInstance?.fitView({ padding: 0.2 });
    }, 100);
  };

  // זום
  const handleZoomIn = () => reactFlowInstance?.zoomIn();
  const handleZoomOut = () => reactFlowInstance?.zoomOut();
  const handleFitView = () => reactFlowInstance?.fitView({ padding: 0.2 });

  // ייצוא
  const handleExport = async () => {
    if (!flowRef.current) return;
    
    setIsExporting(true);
    try {
      // הוספת class להסתרת UI elements
      flowRef.current.classList.add('exporting-mode');
      
      // המתנה קצרה לרינדור
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(flowRef.current, {
        backgroundColor: '#0A192F',
        scale: 2,
        logging: false,
        useCORS: true
      });
      
      // הסרת ה-class
      flowRef.current.classList.remove('exporting-mode');
      
      const link = document.createElement('a');
      link.download = `timeline-${customer?.business_name || 'goals'}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error exporting timeline:', error);
      alert('שגיאה בייצוא התרשים');
      if (flowRef.current) {
        flowRef.current.classList.remove('exporting-mode');
      }
    } finally {
      setIsExporting(false);
    }
  };

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
      <style>
        {`
          .exporting-mode .react-flow__minimap,
          .exporting-mode .react-flow__controls {
            display: none !important;
          }
        `}
      </style>
      <Card className="card-horizon overflow-hidden">
        <CardHeader className="bg-gradient-to-l from-horizon-primary/10 to-transparent">
          <CardTitle className="text-horizon-text flex items-center gap-2">
            <Target className="w-5 h-5 text-horizon-primary" />
            ציר זמן ויזואלי משופר
          </CardTitle>
        </CardHeader>
        
        {/* Toolbar */}
        <TimelineToolbar
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          layoutType={layoutType}
          onLayoutChange={handleLayoutChange}
          onAutoLayout={handleAutoLayout}
          onExport={handleExport}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={handleFitView}
          onToggleGroups={() => setShowGroups(!showGroups)}
          showGroups={showGroups}
          totalGoals={goals.length}
          visibleGoals={filteredGoals.length}
          isExporting={isExporting}
        />

        <CardContent className="p-0">
          <div ref={flowRef} className="h-[700px] bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F]">
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
                strokeWidth: 2.5,
                strokeDasharray: '5,5'
              }}
              connectionLineType="smoothstep"
              defaultEdgeOptions={{
                type: 'smoothstep',
                animated: false,
                style: { strokeWidth: 2.5 }
              }}
              minZoom={0.1}
              maxZoom={2}
            >
              <Background 
                color="#32acc1" 
                gap={20} 
                size={1.5}
                style={{ opacity: 0.12 }}
              />
              <Controls 
                className="bg-horizon-card/95 backdrop-blur-sm border border-horizon rounded-lg shadow-xl" 
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
                className="bg-horizon-card/95 backdrop-blur-sm border border-horizon rounded-lg shadow-lg"
                maskColor="rgba(10, 25, 47, 0.85)"
              />
            </ReactFlow>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}