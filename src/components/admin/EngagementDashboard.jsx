import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Star,
  Loader2,
  RefreshCw,
  Target,
  FileText,
  Package,
  BarChart3,
  Database,
  Shield,
  UserPlus,
  FileQuestion
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FeedbackAnalytics from '../shared/FeedbackAnalytics';
import LoadingScreen from '../shared/LoadingScreen';
import { calculateEngagementForAllUsers } from '@/components/logic/userEngagementTracker';
import UnknownFileQueueManager from './UnknownFileQueueManager';

import { toast } from "sonner";
export default function EngagementDashboard() {
  const [timeFilter, setTimeFilter] = useState('all');
  const [engagementFilter, setEngagementFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState(null);
  const [showUnknownFilesModal, setShowUnknownFilesModal] = useState(false);

  const { data: allEngagements = [], isLoading: isLoadingEngagements, refetch: refetchEngagements } = useQuery({
    queryKey: ['userEngagements'],
    queryFn: () => base44.entities.UserEngagement.filter({}, '-engagement_date'),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const latestEngagements = useMemo(() => {
    const engagementsByCustomer = {};
    
    allEngagements.forEach(eng => {
      const existingEng = engagementsByCustomer[eng.customer_email];
      if (!existingEng || new Date(eng.engagement_date) > new Date(existingEng.engagement_date)) {
        engagementsByCustomer[eng.customer_email] = eng;
      }
    });

    const result = Object.values(engagementsByCustomer);
    console.log(`Total engagement records: ${allEngagements.length}, Unique customers: ${result.length}`);
    return result;
  }, [allEngagements]);

  const { data: feedbacks = [], isLoading: isLoadingFeedback, refetch: refetchFeedback } = useQuery({
    queryKey: ['recommendationFeedbacks'],
    queryFn: () => base44.entities.RecommendationFeedback.filter({}, '-created_date'),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: supportTickets = [], isLoading: isLoadingTickets, refetch: refetchTickets } = useQuery({
    queryKey: ['agentSupportTickets'],
    queryFn: () => base44.entities.AgentSupportTicket.filter({}, '-created_date'),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.filter({}),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: allOnboardingRequests = [] } = useQuery({
    queryKey: ['approvedOnboardingRequests'],
    queryFn: () => base44.entities.OnboardingRequest.filter({ status: 'approved', is_active: true }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: allRecommendations = [] } = useQuery({
    queryKey: ['allRecommendations'],
    queryFn: () => base44.entities.Recommendation.filter({}),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: allFiles = [] } = useQuery({
    queryKey: ['allFileUploads'],
    queryFn: () => base44.entities.FileUpload.filter({}),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: allCatalogs = [] } = useQuery({
    queryKey: ['allProductCatalogs'],
    queryFn: () => base44.entities.ProductCatalog.filter({ is_active: true }),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: allForecasts = [] } = useQuery({
    queryKey: ['allBusinessForecasts'],
    queryFn: () => base44.entities.BusinessForecast.filter({}),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const handleCalculateEngagement = async () => {
    setIsCalculating(true);
    try {
      await calculateEngagementForAllUsers();
      await refetchEngagements();
    } catch (error) {
      console.error("Error calculating engagement:", error);
      toast.error("שגיאה בחישוב מעורבות: " + error.message);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    setBackupResult(null);
    try {
      const response = await base44.functions.invoke('manualBackupTrigger', {
        backup_type: 'data'
      });
      
      setBackupResult({
        success: true,
        message: 'גיבוי הושלם בהצלחה!',
        details: response.result?.details
      });
    } catch (error) {
      console.error("Error triggering backup:", error);
      setBackupResult({
        success: false,
        message: 'שגיאה בגיבוי: ' + error.message
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const filteredEngagements = useMemo(() => {
    let filtered = [...latestEngagements];

    filtered = filtered.filter(eng => {
      const matchingUser = allUsers.find(u => u.email === eng.customer_email);
      
      if (matchingUser) {
        return matchingUser.role === 'user' && matchingUser.user_type === 'regular';
      }
      
      const matchingOnboarding = allOnboardingRequests.find(o => o.email === eng.customer_email);
      return matchingOnboarding !== undefined;
    });

    console.log(`After filtering out managers/admins: ${filtered.length} customers`);

    filtered = filtered.map(eng => {
      const matchingUser = allUsers.find(u => u.email === eng.customer_email);
      const matchingOnboarding = allOnboardingRequests.find(o => o.email === eng.customer_email);

      return {
        ...eng,
        customer_full_name: matchingUser?.full_name || matchingOnboarding?.full_name || 'לא ידוע',
        customer_business_name: matchingUser?.business_name || matchingOnboarding?.business_name || '',
        customer_phone: matchingUser?.phone || matchingOnboarding?.phone || ''
      };
    });

    if (engagementFilter !== 'all') {
      filtered = filtered.filter(e => e.engagement_level === engagementFilter);
    }

    if (riskFilter !== 'all') {
      filtered = filtered.filter(e => e.risk_level === riskFilter);
    }

    if (timeFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(e => new Date(e.engagement_date) >= weekAgo);
    } else if (timeFilter === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(e => new Date(e.engagement_date) >= monthAgo);
    }

    return filtered;
  }, [latestEngagements, timeFilter, engagementFilter, riskFilter, allUsers, allOnboardingRequests]);

  const stats = useMemo(() => {
    const totalUsers = filteredEngagements.length;
    const activeUsers = filteredEngagements.filter(e => e.engagement_level === 'active').length;
    const passiveUsers = filteredEngagements.filter(e => e.engagement_level === 'passive').length;
    const dormantUsers = filteredEngagements.filter(e => e.engagement_level === 'dormant').length;
    const avgQuality = totalUsers > 0 
      ? filteredEngagements.reduce((sum, e) => sum + (e.quality_score || 0), 0) / totalUsers 
      : 0;
    const highRisk = filteredEngagements.filter(e => e.risk_level === 'high').length;

    return {
      totalUsers,
      activeUsers,
      passiveUsers,
      dormantUsers,
      avgQuality: Math.round(avgQuality),
      highRisk
    };
  }, [filteredEngagements]);

  const feedbackData = useMemo(() => {
    const totalFeedbacks = feedbacks.length;
    const implemented = feedbacks.filter(f => f.implementation_status === 'implemented').length;
    const avgRating = totalFeedbacks > 0
      ? feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / totalFeedbacks
      : 0;

    const ratingDistribution = {
      1: feedbacks.filter(f => f.rating === 1).length,
      2: feedbacks.filter(f => f.rating === 2).length,
      3: feedbacks.filter(f => f.rating === 3).length
    };

    const implementationRate = totalFeedbacks > 0
      ? Math.round((implemented / totalFeedbacks) * 100)
      : 0;

    return {
      total_feedbacks: totalFeedbacks,
      rating_distribution: ratingDistribution,
      avg_rating: avgRating.toFixed(1),
      implementation_rate: implementationRate
    };
  }, [feedbacks]);

  const handleRefreshAll = () => {
    refetchEngagements();
    refetchFeedback();
    refetchTickets();
  };

  if (isLoadingEngagements && isLoadingFeedback && isLoadingTickets) {
    return <LoadingScreen message="טוען נתוני מעורבות ופידבק..." />;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-horizon-text">מעורבות ופידבק לקוחות</h2>
        <div className="flex gap-2">
          <Button
            onClick={handleCalculateEngagement}
            disabled={isCalculating}
            className="btn-horizon-primary"
          >
            {isCalculating ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                מחשב...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 ml-2" />
                חשב מעורבות מחדש
              </>
            )}
          </Button>
          <Button
            onClick={handleRefreshAll}
            variant="outline"
            className="border-horizon text-horizon-text"
          >
            <RefreshCw className="w-4 h-4 ml-2" />
            רענן נתונים
          </Button>
        </div>
      </div>

      {/* כרטיס גיבוי נתונים - חדש */}
      <Card className="card-horizon border-2 border-green-500/30 bg-gradient-to-br from-green-500/5 to-blue-500/5">
        <CardHeader>
          <CardTitle className="text-horizon-text flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            גיבוי ואבטחת מידע
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-horizon-accent mb-2">
                גבה את כל נתוני המערכת בבטחה ל-Amazon S3
              </p>
              <p className="text-sm text-horizon-accent/70">
                הגיבוי כולל: לקוחות, המלצות, קבצים, קטלוגים, תוכניות עסקיות ועוד
              </p>
              {backupResult && (
                <div className={`mt-3 p-3 rounded-lg border ${
                  backupResult.success 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {backupResult.success ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                    <span className={backupResult.success ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                      {backupResult.message}
                    </span>
                  </div>
                  {backupResult.success && backupResult.details && (
                    <div className="text-xs text-horizon-accent space-y-1 mr-6">
                      <div>📁 {backupResult.details.entitiesBackedUp} ישויות גובו</div>
                      <div>📊 {backupResult.details.recordsBackedUp.toLocaleString()} רשומות</div>
                      <div>💾 {backupResult.details.fileSizeMB} MB</div>
                      <div>⏱️ {backupResult.details.durationSeconds} שניות</div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <Button
              onClick={handleBackup}
              disabled={isBackingUp}
              className="bg-green-600 hover:bg-green-700 text-white shadow-lg h-12 px-6"
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  מגבה נתונים...
                </>
              ) : (
                <>
                  <Database className="w-5 h-5 ml-2" />
                  גיבוי נתונים לענן
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="card-horizon">
          <CardContent className="p-4">
            <div className="text-center">
              <Users className="w-5 h-5 text-horizon-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-horizon-text">{stats.totalUsers}</div>
              <div className="text-xs text-horizon-accent">סה"כ לקוחות</div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-horizon border-green-500/20">
          <CardContent className="p-4">
            <div className="text-center">
              <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-400">{stats.activeUsers}</div>
              <div className="text-xs text-green-300">פעילים (3+ המלצות)</div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-horizon border-yellow-500/20">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="w-5 h-5 bg-yellow-400 rounded-full mx-auto mb-2"></div>
              <div className="text-2xl font-bold text-yellow-400">{stats.passiveUsers}</div>
              <div className="text-xs text-yellow-300">פסיביים (1-2 המלצות)</div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-horizon border-gray-500/20">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="w-5 h-5 bg-gray-400 rounded-full mx-auto mb-2"></div>
              <div className="text-2xl font-bold text-gray-400">{stats.dormantUsers}</div>
              <div className="text-xs text-gray-300">רדומים (0 המלצות)</div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-horizon border-blue-500/20">
          <CardContent className="p-4">
            <div className="text-center">
              <Star className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-400">{stats.avgQuality}</div>
              <div className="text-xs text-blue-300">ציון איכות ממוצע</div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-horizon border-red-500/20">
          <CardContent className="p-4">
            <div className="text-center">
              <AlertTriangle className="w-5 h-5 text-red-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-400">{stats.highRisk}</div>
              <div className="text-xs text-red-300">בסיכון גבוה</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-horizon-text flex items-center gap-2">
            <Target className="w-5 h-5 text-horizon-primary" />
            מדדים למעקב ניהולי
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center p-3 bg-horizon-card/30 rounded-lg">
              <BarChart3 className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <div className="text-horizon-accent mb-1">לקוחות עם תוכנית</div>
              <div className="text-xl font-bold text-horizon-text">
                {filteredEngagements.filter(e => e.has_forecast).length}
              </div>
            </div>
            <div className="text-center p-3 bg-horizon-card/30 rounded-lg">
              <Package className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <div className="text-horizon-accent mb-1">לקוחות עם קטלוג</div>
              <div className="text-xl font-bold text-horizon-text">
                {filteredEngagements.filter(e => e.has_catalog).length}
              </div>
            </div>
            <div className="text-center p-3 bg-horizon-card/30 rounded-lg">
              <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <div className="text-xl font-bold text-green-400">
              <div className="text-horizon-accent mb-1">סה"כ המלצות פורסמו</div>
                {allRecommendations?.filter(r => 
                  r.status === 'published_by_admin' || r.status === 'executed'
                ).length || 0}
              </div>
            </div>
            <div className="text-center p-3 bg-horizon-card/30 rounded-lg">
              <FileText className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <div className="text-horizon-accent mb-1">סה"כ קבצים נותחו</div>
              <div className="text-xl font-bold text-blue-400">
                {allFiles?.filter(f => f.status === 'analyzed').length || 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <FeedbackAnalytics feedbackData={feedbackData} />

      <div className="flex gap-4 items-center justify-end">
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="w-48 bg-horizon-card border-horizon text-horizon-text font-semibold">
            <SelectValue className="text-right text-horizon-text font-semibold" />
          </SelectTrigger>
          <SelectContent className="bg-horizon-card border-horizon" dir="rtl">
            <SelectItem value="all" className="text-right text-horizon-text hover:bg-horizon-primary/20 cursor-pointer font-semibold">
              כל הזמנים
            </SelectItem>
            <SelectItem value="week" className="text-right text-horizon-text hover:bg-horizon-primary/20 cursor-pointer font-semibold">
              שבוע אחרון
            </SelectItem>
            <SelectItem value="month" className="text-right text-horizon-text hover:bg-horizon-primary/20 cursor-pointer font-semibold">
              חודש אחרון
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={engagementFilter} onValueChange={setEngagementFilter}>
          <SelectTrigger className="w-56 bg-horizon-card border-horizon text-horizon-text font-semibold">
            <SelectValue className="text-right text-horizon-text font-semibold" />
          </SelectTrigger>
          <SelectContent className="bg-horizon-card border-horizon" dir="rtl">
            <SelectItem value="all" className="text-right text-horizon-text hover:bg-horizon-primary/20 cursor-pointer font-semibold">
              כל רמות המעורבות
            </SelectItem>
            <SelectItem value="active" className="text-right text-green-400 hover:bg-green-500/20 cursor-pointer font-semibold">
              פעיל (3+ המלצות)
            </SelectItem>
            <SelectItem value="passive" className="text-right text-yellow-400 hover:bg-yellow-500/20 cursor-pointer font-semibold">
              פסיבי (1-2 המלצות)
            </SelectItem>
            <SelectItem value="dormant" className="text-right text-gray-400 hover:bg-gray-500/20 cursor-pointer font-semibold">
              רדום (0 המלצות)
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-48 bg-horizon-card border-horizon text-horizon-text font-semibold">
            <SelectValue className="text-right text-horizon-text font-semibold" />
          </SelectTrigger>
          <SelectContent className="bg-horizon-card border-horizon" dir="rtl">
            <SelectItem value="all" className="text-right text-horizon-text hover:bg-horizon-primary/20 cursor-pointer font-semibold">
              כל רמות הסיכון
            </SelectItem>
            <SelectItem value="high" className="text-right text-red-400 hover:bg-red-500/20 cursor-pointer font-semibold">
              סיכון גבוה
            </SelectItem>
            <SelectItem value="medium" className="text-right text-yellow-400 hover:bg-yellow-500/20 cursor-pointer font-semibold">
              סיכון בינוני
            </SelectItem>
            <SelectItem value="low" className="text-right text-green-400 hover:bg-green-500/20 cursor-pointer font-semibold">
              סיכון נמוך
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-horizon-text">פירוט מעורבות לקוחות</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-horizon">
                  <th className="text-right py-2 px-3 text-xs text-horizon-accent">לקוח</th>
                  <th className="text-right py-2 px-3 text-xs text-horizon-accent">מעורבות</th>
                  <th className="text-right py-2 px-3 text-xs text-horizon-accent">ציון איכות</th>
                  <th className="text-right py-2 px-3 text-xs text-horizon-accent">סיכון</th>
                  <th className="text-center py-2 px-3 text-xs text-horizon-accent">המלצות</th>
                  <th className="text-center py-2 px-3 text-xs text-horizon-accent">קבצים</th>
                  <th className="text-center py-2 px-3 text-xs text-horizon-accent">קטלוג</th>
                  <th className="text-center py-2 px-3 text-xs text-horizon-accent">תוכנית</th>
                  <th className="text-right py-2 px-3 text-xs text-horizon-accent">פעילות אחרונה</th>
                </tr>
              </thead>
              <tbody>
                {filteredEngagements.map(engagement => (
                  <tr key={engagement.id} className="border-b border-horizon/50 hover:bg-horizon-card/30 text-sm">
                    <td className="py-2 px-3 text-horizon-text">
                      <div className="font-medium">{engagement.customer_business_name || engagement.customer_full_name}</div>
                      <div className="text-xs text-horizon-accent">{engagement.customer_email}</div>
                      {engagement.customer_phone && (
                        <div className="text-xs text-horizon-accent">{engagement.customer_phone}</div>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <Badge className={
                        engagement.engagement_level === 'active' ? 'bg-green-500/20 text-green-400 text-xs border-green-500/30' :
                        engagement.engagement_level === 'passive' ? 'bg-yellow-500/20 text-yellow-400 text-xs border-yellow-500/30' :
                        'bg-gray-500/20 text-gray-400 text-xs border-gray-500/30'
                      }>
                        {engagement.engagement_level === 'active' ? 'פעיל' :
                         engagement.engagement_level === 'passive' ? 'פסיבי' : 'רדום'}
                      </Badge>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="text-horizon-text font-semibold text-base">
                          {engagement.quality_score || 0}
                        </div>
                        <div className="flex-1 bg-horizon-card rounded-full h-2 max-w-[80px]">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              (engagement.quality_score || 0) >= 70 ? 'bg-green-500' :
                              (engagement.quality_score || 0) >= 40 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${engagement.quality_score || 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <Badge className={
                        engagement.risk_level === 'high' ? 'bg-red-500/20 text-red-400 text-xs border-red-500/30' :
                        engagement.risk_level === 'medium' ? 'bg-yellow-500/20 text-yellow-400 text-xs border-yellow-500/30' :
                        'bg-green-500/20 text-green-400 text-xs border-green-500/30'
                      }>
                        {engagement.risk_level === 'high' ? 'גבוה' :
                         engagement.risk_level === 'medium' ? 'בינוני' : 'נמוך'}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-horizon-text text-center font-semibold">
                      {engagement.total_recommendations || 0}
                    </td>
                    <td className="py-2 px-3 text-horizon-text text-center font-semibold">
                      {engagement.files_count || 0}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {engagement.has_catalog ? (
                        <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-500 rounded mx-auto"></div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {engagement.has_forecast ? (
                        <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-500 rounded mx-auto"></div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-horizon-accent text-xs">
                      {engagement.last_activity ? 
                        new Date(engagement.last_activity).toLocaleDateString('he-IL', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        }) : 
                        'אין פעילות'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredEngagements.length === 0 && (
              <div className="text-center py-8 text-horizon-accent">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>אין לקוחות התואמים לסינון הנוכחי</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Links Card */}
      <Card className="card-horizon">
        <CardHeader>
          <CardTitle className="text-horizon-text flex items-center gap-2">
            <Target className="w-5 h-5 text-horizon-primary" />
            קישורים מהירים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a 
              href={createPageUrl('LeadIntakeManagement')}
              onClick={(e) => {
                e.preventDefault();
                window.location.href = createPageUrl('LeadIntakeManagement');
              }}
              className="block"
            >
              <div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/30 hover:border-blue-400 transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-all">
                    <UserPlus className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-horizon-text">ניהול לידים נכנסים</h4>
                    <p className="text-sm text-horizon-accent">מעקב וניהול פניות חדשות</p>
                  </div>
                </div>
              </div>
            </a>
            
            <div 
              onClick={() => setShowUnknownFilesModal(true)}
              className="p-4 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-lg border border-orange-500/30 hover:border-orange-400 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-500/20 rounded-lg group-hover:bg-orange-500/30 transition-all">
                  <FileQuestion className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-horizon-text">קבצים לא מזוהים</h4>
                  <p className="text-sm text-horizon-accent">קבצים שנכשלו בניתוח</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unknown Files Modal */}
      {showUnknownFilesModal && (
        <Dialog open={showUnknownFilesModal} onOpenChange={setShowUnknownFilesModal}>
          <DialogContent className="bg-horizon-card border-horizon text-horizon-text max-w-4xl max-h-[85vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-orange-400" />
                קבצים לא מזוהים
              </DialogTitle>
            </DialogHeader>
            <UnknownFileQueueManager />
          </DialogContent>
        </Dialog>
      )}

      {supportTickets && supportTickets.length > 0 && (
        <Card className="card-horizon">
          <CardHeader>
            <CardTitle className="text-horizon-text">פניות תמיכה דרך הסוכן</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {supportTickets.map(ticket => (
                <div key={ticket.id} className="p-4 bg-horizon-card/50 rounded-lg border border-horizon">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-horizon-text">{ticket.subject}</h4>
                      <p className="text-sm text-horizon-accent">מ: {ticket.manager_email}</p>
                    </div>
                    <Badge className={
                      ticket.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                      ticket.status === 'in_review' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }>
                      {ticket.status === 'new' ? 'חדש' :
                       ticket.status === 'in_review' ? 'בבדיקה' :
                       ticket.status === 'prioritized' ? 'בעדיפות' :
                       ticket.status === 'resolved' ? 'נפתר' : 'נדחה'}
                    </Badge>
                  </div>
                  <p className="text-sm text-horizon-accent">{ticket.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}