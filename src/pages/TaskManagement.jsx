import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Upload, 
  Search,
  Loader2,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from "sonner";

export default function TaskManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [newTask, setNewTask] = useState({
    name: '',
    notes: '',
    status: 'open',
    customer_email: '',
    assignee_email: '',
    start_date: '',
    end_date: ''
  });

  const { user } = useAuth();

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const allCustomers = await base44.entities.OnboardingRequest.list();
      return allCustomers.filter(c => c.is_active);
    }
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.CustomerGoal.filter({ is_active: true }, '-created_date')
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskData) => base44.entities.CustomerGoal.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      setShowCreateModal(false);
      setNewTask({
        name: '',
        notes: '',
        status: 'open',
        customer_email: '',
        assignee_email: '',
        start_date: '',
        end_date: ''
      });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.CustomerGoal.update(id, {
        ...data,
        is_active: data.is_active !== false
      });
      // סנכרון לפיירברי
      try {
        const { syncTaskToFireberry } = await import('@/functions/syncTaskToFireberry');
        await syncTaskToFireberry({ taskId: id });
      } catch (error) {
        console.error('Failed to sync to Fireberry:', error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
    }
  });

  const handleImport = async () => {
    try {
      setIsImporting(true);
      const tasksArray = JSON.parse(importData);
      
      const response = await base44.functions.invoke('importFireberryTasks', {
        tasks: Array.isArray(tasksArray) ? tasksArray : [tasksArray]
      });

      toast.success(`יבוא הושלם!\n✅ ${response.success} משימות יובאו בהצלחה\n❌ ${response.failed} נכשלו`);
      
      queryClient.invalidateQueries(['tasks']);
      setShowImportModal(false);
      setImportData('');
    } catch (error) {
      toast.error(`שגיאה ביבוא: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchTerm || 
      task.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.customer_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const variants = {
      open: { color: 'bg-blue-500', label: 'פתוח', icon: Clock },
      in_progress: { color: 'bg-yellow-500', label: 'בביצוע', icon: Loader2 },
      done: { color: 'bg-green-500', label: 'הושלם', icon: CheckCircle2 },
      delayed: { color: 'bg-red-500', label: 'באיחור', icon: AlertCircle },
      cancelled: { color: 'bg-gray-500', label: 'בוטל', icon: AlertCircle }
    };
    
    const config = variants[status] || variants.open;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 ml-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-horizon-dark p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <Card className="card-horizon mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl text-horizon-text">ניהול משימות</CardTitle>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowImportModal(true)}
                  variant="outline"
                  className="border-horizon-primary text-horizon-primary"
                >
                  <Upload className="w-4 h-4 ml-2" />
                  ייבא מפיירברי
                </Button>
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className="btn-horizon-primary"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  משימה חדשה
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-horizon-accent" />
                <Input
                  placeholder="חפש משימה או לקוח..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 bg-horizon-card border-horizon text-horizon-text"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-horizon-card border-horizon text-horizon-text">
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="open">פתוח</SelectItem>
                  <SelectItem value="in_progress">בביצוע</SelectItem>
                  <SelectItem value="done">הושלם</SelectItem>
                  <SelectItem value="delayed">באיחור</SelectItem>
                  <SelectItem value="cancelled">בוטל</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-horizon-primary" />
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-horizon-accent">
                לא נמצאו משימות
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <Card 
                    key={task.id} 
                    className="card-horizon cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => {
                      setEditingTask(task);
                      setShowDetailsModal(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-horizon-text mb-2">
                            {task.name}
                          </h3>
                          {task.notes && (
                            <p className="text-sm text-horizon-accent mb-2">
                              {task.notes}
                            </p>
                          )}
                          <div className="flex gap-2 flex-wrap items-center">
                            {getStatusBadge(task.status)}
                            {task.customer_email && (
                              <Badge variant="outline" className="text-horizon-text">
                                {task.customer_email}
                              </Badge>
                            )}
                            {task.assignee_email && (
                              <Badge variant="outline" className="text-blue-400 border-blue-400">
                                👤 {allUsers.find(u => u.email === task.assignee_email)?.full_name || task.assignee_email}
                              </Badge>
                            )}
                            {task.end_date && (
                              <Badge variant="outline" className="text-horizon-accent">
                                <Calendar className="w-3 h-3 ml-1" />
                                {format(new Date(task.end_date), 'dd/MM/yyyy')}
                              </Badge>
                            )}
                            {task.fireberry_task_id && (
                              <Badge className="bg-purple-500/20 text-purple-400">
                                🔗 מסונכרן לפיירברי
                              </Badge>
                            )}
                            {task.parent_id && (
                              <Badge className="bg-pink-500/20 text-pink-400">
                                📌 תת-משימה
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {task.status !== 'done' && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTaskMutation.mutate({
                                  id: task.id,
                                  data: { status: 'done' }
                                });
                              }}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="bg-horizon-card text-horizon-text border-horizon max-w-xl">
            <DialogHeader>
              <DialogTitle>משימה חדשה</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>שם המשימה *</Label>
                <Input
                  value={newTask.name}
                  onChange={(e) => setNewTask({...newTask, name: e.target.value})}
                  className="bg-horizon-dark border-horizon text-horizon-text"
                  placeholder="הזן שם משימה..."
                />
              </div>
              
              <div>
                <Label>הערות</Label>
                <Textarea
                  value={newTask.notes}
                  onChange={(e) => setNewTask({...newTask, notes: e.target.value})}
                  className="bg-horizon-dark border-horizon text-horizon-text h-20"
                  placeholder="פרטים נוספים..."
                />
              </div>

              <div>
                <Label>לקוח *</Label>
                <Select 
                  value={newTask.customer_email} 
                  onValueChange={(val) => setNewTask({...newTask, customer_email: val})}
                >
                  <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                    <SelectValue placeholder="בחר לקוח" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.email}>
                        {c.business_name || c.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>אחראי</Label>
                <Select 
                  value={newTask.assignee_email} 
                  onValueChange={(val) => setNewTask({...newTask, assignee_email: val})}
                >
                  <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                    <SelectValue placeholder="בחר אחראי" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers.map(u => (
                      <SelectItem key={u.id} value={u.email}>
                        {u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>תאריך התחלה</Label>
                  <Input
                    type="date"
                    value={newTask.start_date}
                    onChange={(e) => setNewTask({...newTask, start_date: e.target.value})}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                  />
                </div>

                <div>
                  <Label>תאריך יעד</Label>
                  <Input
                    type="date"
                    value={newTask.end_date}
                    onChange={(e) => setNewTask({...newTask, end_date: e.target.value})}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                  />
                </div>
              </div>

              <div>
                <Label>סטטוס</Label>
                <Select 
                  value={newTask.status} 
                  onValueChange={(val) => setNewTask({...newTask, status: val})}
                >
                  <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">פתוח</SelectItem>
                    <SelectItem value="in_progress">בביצוע</SelectItem>
                    <SelectItem value="done">הושלם</SelectItem>
                    <SelectItem value="delayed">באיחור</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateModal(false)}
                className="border-horizon text-horizon-text"
              >
                ביטול
              </Button>
              <Button 
                onClick={() => {
                  if (!newTask.name || !newTask.customer_email) {
                    toast.warning('יש למלא שם משימה ולבחור לקוח');
                    return;
                  }
                  createTaskMutation.mutate({
                    ...newTask,
                    task_type: 'one_time',
                    is_active: true
                  });
                }}
                disabled={createTaskMutation.isLoading}
                className="btn-horizon-primary"
              >
                {createTaskMutation.isLoading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                צור משימה
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
          <DialogContent className="bg-horizon-card text-horizon-text border-horizon max-w-3xl">
            <DialogHeader>
              <DialogTitle>ייבוא משימות מפיירברי</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-horizon-accent">
                הדבק כאן את ה-JSON של המשימות מפיירברי (מערך או אובייקט בודד)
              </p>
              <Textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder='[{"taskid": "...", "subject": "...", ...}]'
                className="bg-horizon-dark border-horizon text-horizon-text h-64 font-mono text-xs"
              />
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowImportModal(false)}
                className="border-horizon text-horizon-text"
              >
                ביטול
              </Button>
              <Button 
                onClick={handleImport}
                disabled={!importData || isImporting}
                className="btn-horizon-primary"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    מייבא...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 ml-2" />
                    ייבא משימות
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDetailsModal} onOpenChange={() => {
          setShowDetailsModal(false);
          setEditingTask(null);
        }}>
          <DialogContent className="bg-horizon-card text-horizon-text border-horizon max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl">עריכת משימה</DialogTitle>
            </DialogHeader>
            {editingTask && (
              <div className="space-y-4">
                <div>
                  <Label>שם המשימה *</Label>
                  <Input
                    value={editingTask.name}
                    onChange={(e) => setEditingTask({...editingTask, name: e.target.value})}
                    className="bg-horizon-dark border-horizon text-horizon-text"
                  />
                </div>

                <div>
                  <Label>הערות</Label>
                  <Textarea
                    value={editingTask.notes || ''}
                    onChange={(e) => setEditingTask({...editingTask, notes: e.target.value})}
                    className="bg-horizon-dark border-horizon text-horizon-text h-20"
                  />
                </div>

                <div>
                  <Label>לקוח *</Label>
                  <Select 
                    value={editingTask.customer_email} 
                    onValueChange={(val) => setEditingTask({...editingTask, customer_email: val})}
                  >
                    <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.email}>
                          {c.business_name || c.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>אחראי</Label>
                  <Select 
                    value={editingTask.assignee_email || ''} 
                    onValueChange={(val) => setEditingTask({...editingTask, assignee_email: val})}
                  >
                    <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                      <SelectValue placeholder="בחר אחראי" />
                    </SelectTrigger>
                    <SelectContent>
                      {allUsers.map(u => (
                        <SelectItem key={u.id} value={u.email}>
                          {u.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>תאריך התחלה</Label>
                    <Input
                      type="date"
                      value={editingTask.start_date?.split('T')[0] || ''}
                      onChange={(e) => setEditingTask({...editingTask, start_date: e.target.value})}
                      className="bg-horizon-dark border-horizon text-horizon-text"
                    />
                  </div>

                  <div>
                    <Label>תאריך יעד</Label>
                    <Input
                      type="date"
                      value={editingTask.end_date?.split('T')[0] || ''}
                      onChange={(e) => setEditingTask({...editingTask, end_date: e.target.value})}
                      className="bg-horizon-dark border-horizon text-horizon-text"
                    />
                  </div>
                </div>

                <div>
                  <Label>סטטוס</Label>
                  <Select 
                    value={editingTask.status} 
                    onValueChange={(val) => setEditingTask({...editingTask, status: val})}
                  >
                    <SelectTrigger className="bg-horizon-dark border-horizon text-horizon-text">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">פתוח</SelectItem>
                      <SelectItem value="in_progress">בביצוע</SelectItem>
                      <SelectItem value="done">הושלם</SelectItem>
                      <SelectItem value="delayed">באיחור</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editingTask.fireberry_task_id && (
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                    <Label className="text-sm text-purple-400">מסונכרן לפיירברי</Label>
                    <p className="mt-1 text-sm text-horizon-text">ID: {editingTask.fireberry_task_id}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button 
                variant="outline"
                onClick={() => {
                  setShowDetailsModal(false);
                  setEditingTask(null);
                }}
                className="border-horizon text-horizon-text"
              >
                ביטול
              </Button>
              <Button
                onClick={() => {
                  if (!editingTask.name || !editingTask.customer_email) {
                    toast.warning('יש למלא שם משימה ולבחור לקוח');
                    return;
                  }
                  updateTaskMutation.mutate({
                    id: editingTask.id,
                    data: {
                      name: editingTask.name,
                      notes: editingTask.notes,
                      customer_email: editingTask.customer_email,
                      assignee_email: editingTask.assignee_email,
                      start_date: editingTask.start_date,
                      end_date: editingTask.end_date,
                      status: editingTask.status
                    }
                  });
                  setShowDetailsModal(false);
                  setEditingTask(null);
                }}
                disabled={updateTaskMutation.isLoading}
                className="btn-horizon-primary"
              >
                {updateTaskMutation.isLoading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                שמור שינויים
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}