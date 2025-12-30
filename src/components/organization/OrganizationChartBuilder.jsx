import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Controls,
  Background,
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
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Save, Trash2, Edit3, Loader2, User } from 'lucide-react';
import EnhancedOrgNode from './EnhancedOrgNode';

// Custom Organization Node with Handles (Fallback - kept for compatibility)
const OrgNode = ({ data }) => {
  return (
    <div 
      className="bg-gradient-to-br from-horizon-card to-horizon-dark border-2 border-horizon-primary rounded-xl p-3 w-40 shadow-xl hover:shadow-2xl hover:scale-105 transition-all cursor-pointer relative"
      onClick={data.onEdit}
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
      
      <div className="text-center space-y-1.5">
        <div className="w-10 h-10 bg-gradient-to-br from-horizon-primary to-horizon-secondary rounded-full mx-auto flex items-center justify-center text-white font-bold text-sm shadow-md">
          {data.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div>
          <p className="font-bold text-horizon-text text-xs leading-tight">
            {data.name}
          </p>
          <p className="text-[10px] text-horizon-primary font-medium mt-0.5">
            {data.role}
          </p>
        </div>
        {data.department && (
          <div className="bg-horizon-secondary/20 text-horizon-secondary border border-horizon-secondary/30 rounded-full px-1.5 py-0.5 text-[9px] font-medium inline-block">
            {data.department}
          </div>
        )}
        {data.salary && (
          <p className="text-[10px] text-horizon-accent font-semibold mt-1 bg-horizon-dark/50 rounded-md py-0.5">
            ₪{data.salary.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
};

const nodeTypes = {
  orgNode: OrgNode,
  enhancedOrgNode: EnhancedOrgNode
};

export default function OrganizationChartBuilder({ customer }) {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    department: '',
    salary: '',
    email: '',
    phone: ''
  });

  // טעינת העץ הארגוני
  const { data: orgChart, isLoading } = useQuery({
    queryKey: ['orgChart', customer?.email],
    queryFn: async () => {
      const charts = await base44.entities.OrganizationChart.filter({
        customer_email: customer.email,
        is_active: true
      });
      
      if (charts.length > 0) {
        return charts[0];
      }
      
      // יצירת עץ ברירת מחדל
      const newChart = await base44.entities.OrganizationChart.create({
        customer_email: customer.email,
        chart_name: 'עץ ארגוני ראשי',
        nodes: [{
          id: 'root',
          name: customer.business_name || 'מנכ"ל',
          role: 'מנהל',
          parent_id: null,
          position: { x: 250, y: 50 }
        }],
        is_active: true
      });
      
      return newChart;
    },
    enabled: !!customer?.email
  });

  // המרה ל-ReactFlow format
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!orgChart?.nodes) return { nodes: [], edges: [] };

    const nodes = orgChart.nodes.map(node => ({
      id: node.id,
      type: 'enhancedOrgNode',
      position: node.position || { x: 0, y: 0 },
      data: {
        name: node.name,
        role: node.role,
        department: node.department,
        salary: node.salary,
        email: node.email,
        phone: node.phone,
        onEdit: () => handleEditNode(node)
      }
    }));

    const edges = orgChart.nodes
      .filter(node => node.parent_id)
      .map(node => ({
        id: `e-${node.parent_id}-${node.id}`,
        source: node.parent_id,
        target: node.id,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#32acc1'
        },
        style: { 
          stroke: 'url(#edgeGradient)', 
          strokeWidth: 1.5,
          filter: 'drop-shadow(0 0 4px rgba(50, 172, 193, 0.5))'
        }
      }));

    return { nodes, edges };
  }, [orgChart]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

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
        style: { stroke: '#32acc1', strokeWidth: 1.5 }
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
      
      // עדכון parent_id בנתונים
      try {
        const updatedNodes = orgChart.nodes.map(n => 
          n.id === params.target 
            ? { ...n, parent_id: params.source }
            : n
        );
        
        await base44.entities.OrganizationChart.update(orgChart.id, {
          nodes: updatedNodes
        });
        
        queryClient.invalidateQueries(['orgChart', customer.email]);
      } catch (error) {
        console.error('Error saving connection:', error);
      }
    },
    [setEdges, orgChart, queryClient, customer]
  );

  const handleEditNode = (node) => {
    setEditingNode(node);
    setFormData({
      name: node.name,
      role: node.role,
      department: node.department || '',
      salary: node.salary || '',
      email: node.email || '',
      phone: node.phone || ''
    });
    setShowAddModal(true);
  };

  const handleAddNode = () => {
    setEditingNode(null);
    setFormData({
      name: '',
      role: '',
      department: '',
      salary: '',
      email: '',
      phone: ''
    });
    setShowAddModal(true);
  };

  const handleSaveNode = async () => {
    if (!formData.name || !formData.role) {
      alert('יש למלא שם ותפקיד');
      return;
    }

    setIsSaving(true);
    try {
      const updatedNodes = [...orgChart.nodes];
      
      if (editingNode) {
        // עדכון node קיים
        const index = updatedNodes.findIndex(n => n.id === editingNode.id);
        updatedNodes[index] = {
          ...updatedNodes[index],
          ...formData,
          salary: formData.salary ? parseFloat(formData.salary) : null
        };
      } else {
        // הוספת node חדש
        const newNode = {
          id: `node-${Date.now()}`,
          ...formData,
          salary: formData.salary ? parseFloat(formData.salary) : null,
          parent_id: null, // ניתן לחבר מאוחר יותר
          position: { 
            x: 100 + (orgChart.nodes.length * 200), 
            y: 100 
          }
        };
        updatedNodes.push(newNode);
      }

      await base44.entities.OrganizationChart.update(orgChart.id, {
        nodes: updatedNodes
      });

      queryClient.invalidateQueries(['orgChart', customer.email]);
      setShowAddModal(false);
    } catch (error) {
      console.error('Error saving node:', error);
      alert('שגיאה בשמירה');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNode = async (nodeId) => {
    if (!confirm('האם למחוק את התפקיד?')) return;

    try {
      const updatedNodes = orgChart.nodes.filter(n => n.id !== nodeId && n.parent_id !== nodeId);
      
      await base44.entities.OrganizationChart.update(orgChart.id, {
        nodes: updatedNodes
      });

      queryClient.invalidateQueries(['orgChart', customer.email]);
    } catch (error) {
      console.error('Error deleting node:', error);
      alert('שגיאה במחיקה');
    }
  };

  const handleNodeDragStop = useCallback(
    async (event, node) => {
      try {
        const updatedNodes = orgChart.nodes.map(n => 
          n.id === node.id 
            ? { ...n, position: node.position }
            : n
        );
        
        await base44.entities.OrganizationChart.update(orgChart.id, {
          nodes: updatedNodes
        });
      } catch (error) {
        console.error('Error saving position:', error);
      }
    },
    [orgChart, queryClient, customer]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-horizon-text flex items-center gap-2">
              <Building2 className="w-5 h-5 text-horizon-primary" />
              עץ ארגוני - {customer.business_name}
            </CardTitle>
            <Button onClick={handleAddNode} className="btn-horizon-primary">
              <Plus className="w-4 h-4 ml-2" />
              הוסף תפקיד
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] rounded-xl border-2 border-horizon-primary/30 shadow-2xl overflow-hidden">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDragStop={handleNodeDragStop}
              nodeTypes={nodeTypes}
              fitView
              style={{ direction: 'ltr' }}
              connectionMode="loose"
              connectionLineStyle={{ 
                stroke: '#32acc1', 
                strokeWidth: 2,
                strokeDasharray: '5,5',
                filter: 'drop-shadow(0 0 4px rgba(50, 172, 193, 0.5))'
              }}
              connectionLineType="smoothstep"
            >
              {/* SVG Gradient Definition */}
              <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                  <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#32acc1" />
                    <stop offset="100%" stopColor="#fc9f67" />
                  </linearGradient>
                </defs>
              </svg>
              
              <Background 
                color="#32acc1" 
                gap={24} 
                size={1.5}
                style={{ opacity: 0.15 }}
              />
              <Controls 
                className="bg-horizon-card/95 backdrop-blur-sm border border-horizon rounded-lg shadow-xl"
                showInteractive={false}
              />
            </ReactFlow>
          </div>
          <div className="mt-4 bg-gradient-to-l from-horizon-primary/10 via-horizon-secondary/10 to-horizon-primary/10 border border-horizon-primary/30 rounded-lg p-3 text-sm text-horizon-text text-center backdrop-blur-sm">
            💡 <strong className="text-horizon-primary">טיפ:</strong> גרור תפקידים להזזה • חבר בין תפקידים ליצירת היררכיה • העבר עכבר על צומת לפרטים נוספים
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Node Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-horizon-dark border-horizon" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-horizon-text">
              {editingNode ? 'עריכת תפקיד' : 'הוספת תפקיד חדש'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-horizon-accent mb-2 block">שם *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text"
                placeholder="שם העובד"
              />
            </div>
            <div>
              <Label className="text-sm text-horizon-accent mb-2 block">תפקיד *</Label>
              <Input
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text"
                placeholder="כותרת התפקיד"
              />
            </div>
            <div>
              <Label className="text-sm text-horizon-accent mb-2 block">מחלקה</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text"
                placeholder="שם המחלקה"
              />
            </div>
            <div>
              <Label className="text-sm text-horizon-accent mb-2 block">שכר חודשי</Label>
              <Input
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                className="bg-horizon-card border-horizon text-horizon-text"
                placeholder="0"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-horizon-accent mb-2 block">אימייל</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-horizon-card border-horizon text-horizon-text"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label className="text-sm text-horizon-accent mb-2 block">טלפון</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-horizon-card border-horizon text-horizon-text"
                  placeholder="050-1234567"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-between gap-2 mt-4">
            {editingNode && (
              <Button
                variant="outline"
                onClick={() => {
                  handleDeleteNode(editingNode.id);
                  setShowAddModal(false);
                }}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4 ml-2" />
                מחק
              </Button>
            )}
            <div className="flex gap-2 mr-auto">
              <Button
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="border-horizon text-horizon-text"
              >
                ביטול
              </Button>
              <Button
                onClick={handleSaveNode}
                disabled={isSaving}
                className="btn-horizon-primary"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    שמור
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}