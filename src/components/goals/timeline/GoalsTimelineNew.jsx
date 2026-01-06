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
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [viewMode, setViewMode] = useState('goals'); // ✅ ברירת מחדל - רק יעדים
  const [showTasksInNodes, setShowTasksInNodes] = useState(false);
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

  // ✅ סינון יעדים משופר
  const filteredGoals = useMemo(() => {
    return goals.filter(goal => {
      // ✅ תמיד סנן רק יעדים (לא משימות) - חייבים parent_id = null
      if (goal.parent_id) return false;
      
      // סינון לפי חיפוש
      if (searchTerm && !goal.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // סינון לפי סטטוס
      if (statusFilter !== 'all' && goal.status !== statusFilter) {
        return false;
      }
      
      // ✅ סינון לפי דחיפות
      if (priorityFilter !== 'all' && goal.priority !== priorityFilter) {
        return false;
      }
      
      return true;
    });
  }, [goals, searchTerm, statusFilter, priorityFilter]);

  // ✅ מיפוי משימות ליעדים
  const tasksByGoal = useMemo(() => {
    if (!showTasksInNodes) return {};
    
    const mapping = {};
    goals.forEach(goal => {
      if (goal.parent_id) {
        if (!mapping[goal.parent_id]) {
          mapping[goal.parent_id] = [];
        }
        mapping[goal.parent_id].push(goal);
      }
    });
    return mapping;
  }, [goals, showTasksInNodes]);

  // ✅ המרת יעדים ל-nodes ו-edges - רק יעדים!
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!filteredGoals.length) return { nodes: [], edges: [] };

    const nodes = filteredGoals.map((goal) => {
      // ספירת משימות משנה
      const subtasks = tasksByGoal[goal.id] || [];
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
          subtasks: showTasksInNodes ? subtasks : [],
          showTasks: showTasksInNodes,
          isGoal: true,
          onClick: () => handleNodeClick(goal),
          onEdit: () => handleNodeEdit(goal),
          onDuplicate: () => handleNodeDuplicate(goal),
          onDelete: () => handleNodeDelete(goal)
        }
      };
    });

    // יצירת edges לפי תלויות בין יעדים
    const edges = [];
    
    filteredGoals.forEach(goal => {
      const dependencies = goal.depends_on_goal_ids || (goal.depends_on_goal_id ? [goal.depends_on_goal_id] : []);
      
      dependencies.forEach(depId => {
        if (filteredGoals.find(g => g.id === depId)) {
          edges.push({
            id: `e-${depId}-${goal.id}`,
            source: depId,
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
          });
        }
      });
    });
    
    return { nodes, edges };
  }, [filteredGoals, tasksByGoal, showTasksInNodes]);

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
    // ✅ FIX: בדיקה נכונה אם זו משימה או יעד
    const isTask = !!goal.parent_id;
    const subtasks = goals.filter(g => g.parent_id === goal.id);
    
    console.log('🗑️ Deleting:', {
      id: goal.id,
      name: goal.name,
      isTask,
      hasSubtasks: subtasks.length
    });
    
    if (isTask) {
      // ✅ מחיקת משימה - ללא תת-משימות
      if (!confirm(`האם למחוק את המשימה "${goal.name}"?`)) return;
      
      try {
        await base44.entities.CustomerGoal.update(goal.id, { is_active: false });
        queryClient.invalidateQueries(['customerGoals', customer.email]);
      } catch (error) {
        console.error('Error deleting task:', error);
        alert('שגיאה במחיקת המשימה: ' + error.message);
      }
    } else if (subtasks.length > 0) {
      // ✅ מחיקת יעד עם משימות
      const confirmMessage = `ליעד "${goal.name}" יש ${subtasks.length} תת-משימות.\n\nמה תרצה לעשות?\n\nלחץ "אישור" למחוק את היעד וכל התת-משימות\nלחץ "ביטול" להסיר את השיוך של התת-משימות (הן יישארו כמשימות עצמאיות)`;
      
      const deleteSubtasks = confirm(confirmMessage);
      
      try {
        if (deleteSubtasks) {
          for (const subtask of subtasks) {
            await base44.entities.CustomerGoal.update(subtask.id, { is_active: false });
          }
        } else {
          for (const subtask of subtasks) {
            await base44.entities.CustomerGoal.update(subtask.id, { parent_id: null });
          }
        }
        await base44.entities.CustomerGoal.update(goal.id, { is_active: false });
        queryClient.invalidateQueries(['customerGoals', customer.email]);
      } catch (error) {
        console.error('Error deleting goal:', error);
        alert('שגיאה במחיקת היעד: ' + error.message);
      }
    } else {
      // ✅ מחיקת יעד ללא משימות
      if (!confirm(`האם למחוק את היעד "${goal.name}"?`)) return;
      
      try {
        await base44.entities.CustomerGoal.update(goal.id, { is_active: false });
        queryClient.invalidateQueries(['customerGoals', customer.email]);
      } catch (error) {
        console.error('Error deleting goal:', error);
        alert('שגיאה במחיקה: ' + error.message);
      }
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
        // קריאת היעד הנוכחי
        const targetGoal = goals.find(g => g.id === params.target);
        const currentDependencies = targetGoal?.depends_on_goal_ids || [];
        
        // הוספת התלות החדשה
        const updatedDependencies = [...currentDependencies, params.source].filter((v, i, a) => a.indexOf(v) === i);
        
        await base44.entities.CustomerGoal.update(params.target, {
          depends_on_goal_ids: updatedDependencies
        });
        queryClient.invalidateQueries(['customerGoals', customer.email]);
      } catch (error) {
        console.error('Error saving connection:', error);
        alert('שגיאה בשמירת התלות');
      }
    },
    [setEdges, customer, queryClient, goals]
  );

  // ✅ מחיקת edge בלחיצה ישירה
  const onEdgeClick = useCallback(
    async (event, edge) => {
      event.stopPropagation();
      
      if (!confirm('האם למחוק חיבור זה?')) return;
      
      try {
        const targetGoal = goals.find(g => g.id === edge.target);
        if (!targetGoal) return;
        
        const currentDependencies = targetGoal.depends_on_goal_ids || [];
        const updatedDependencies = currentDependencies.filter(id => id !== edge.source);
        
        await base44.entities.CustomerGoal.update(edge.target, {
          depends_on_goal_ids: updatedDependencies
        });
        
        // הסרה מיידית מה-state
        setEdges(edges => edges.filter(e => e.id !== edge.id));
        
        queryClient.invalidateQueries(['customerGoals', customer.email]);
      } catch (error) {
        console.error('Error deleting edge:', error);
        alert('שגיאה במחיקת החיבור');
      }
    },
    [goals, customer, queryClient, setEdges]
  );

  // ניתוק תלות - תמיכה במחיקה באמצעות Backspace/Delete
  const onEdgesDelete = useCallback(
    async (edgesToDelete) => {
      try {
        for (const edge of edgesToDelete) {
          const targetGoal = goals.find(g => g.id === edge.target);
          if (!targetGoal) continue;
          
          const currentDependencies = targetGoal.depends_on_goal_ids || [];
          const updatedDependencies = currentDependencies.filter(id => id !== edge.source);
          
          await base44.entities.CustomerGoal.update(edge.target, {
            depends_on_goal_ids: updatedDependencies
          });
        }
        
        queryClient.invalidateQueries(['customerGoals', customer.email]);
      } catch (error) {
        console.error('Error deleting dependency:', error);
        alert('שגיאה בניתוק התלות');
      }
    },
    [goals, customer, queryClient]
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

  // סידור אוטומטי - עם אישור
  const handleAutoLayout = useCallback(() => {
    if (!confirm('האם לסדר מחדש את כל היעדים? פעולה זו תשנה את המיקומים הנוכחיים.')) {
      return;
    }
    
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
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showTasksInNodes={showTasksInNodes}
          onToggleTasksInNodes={() => setShowTasksInNodes(!showTasksInNodes)}
          layoutType={layoutType}
          onLayoutChange={handleLayoutChange}
          onAutoLayout={handleAutoLayout}
          onExport={handleExport}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={handleFitView}
          onToggleGroups={() => setShowGroups(!showGroups)}
          showGroups={showGroups}
          totalGoals={goals.filter(g => !g.parent_id).length}
          visibleGoals={filteredGoals.length}
          isExporting={isExporting}
        />

        <CardContent className="p-0">
          <div ref={flowRef} className="h-[650px] w-full bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onEdgesDelete={onEdgesDelete}
              onEdgeClick={onEdgeClick}
              onNodeDragStop={handleNodeDragStop}
              deleteKeyCode={['Backspace', 'Delete']}
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
                style: { strokeWidth: 2.5, cursor: 'pointer' }
              }}
              minZoom={0.1}
              maxZoom={2}
              edgesUpdatable={false}
              edgesFocusable={true}
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