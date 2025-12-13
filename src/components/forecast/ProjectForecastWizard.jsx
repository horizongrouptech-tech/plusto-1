import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

import Step1ProjectDetails from './project/Step1ProjectDetails';
import Step2SelectProducts from './project/Step2SelectProducts';
import Step3LaborCosts from './project/Step3LaborCosts';
import Step4DesiredMargin from './project/Step4DesiredMargin';
import Step5Summary from './project/Step5Summary';

export default function ProjectForecastWizard({ 
  customer, 
  forecast = null,
  onSave,
  onCancel
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);

  const [projectData, setProjectData] = useState({
    customer_email: customer.email,
    project_name: '',
    project_description: '',
    forecast_year: new Date().getFullYear(),
    products: [],
    labor_costs: {
      num_workers: 0,
      cost_per_worker_per_day: 0,
      project_duration_days: 0,
      total_labor_cost: 0
    },
    desired_margin_percentage: 30, // Default to a more standard margin
    calculated: {},
    status: 'draft'
  });

  useEffect(() => {
    if (forecast && forecast.id) {
      setIsLoading(true);
      base44.entities.ProjectForecast.get(forecast.id)
        .then(data => {
          setProjectData(data);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error loading project forecast:', error);
          setIsLoading(false);
        });
    }
  }, [forecast]);

  const updateProject = (updates) => {
    setProjectData(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      if (projectData.id) {
        await base44.entities.ProjectForecast.update(projectData.id, projectData);
      } else {
        await base44.entities.ProjectForecast.create(projectData);
      }
      
      setLastSaved(new Date());
      setSaveStatus('saved');
      alert('תחזית הפרויקט נשמרה בהצלחה!');
      
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving project forecast:', error);
      setSaveStatus('error');
      alert('שגיאה בשמירת התחזית: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const steps = [
    { number: 1, title: "פרטי הפרויקט" },
    { number: 2, title: "בחירת מוצרים" },
    { number: 3, title: "עלויות עובדים" },
    { number: 4, title: "רווח רצוי" },
    { number: 5, title: "סיכום" }
  ];

  const progressPercentage = (currentStep / steps.length) * 100;

  if (isLoading) {
    return (
      <Card className="card-horizon">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-horizon-primary" />
          <p className="text-horizon-accent">טוען תחזית פרויקט...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="card-horizon">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl text-horizon-text">
                {projectData.id ? 'עריכת תחזית פרויקט' : 'יצירת תחזית פרויקט חדשה'}
              </CardTitle>
              <p className="text-sm text-horizon-accent mt-1">
                {projectData.project_name || 'פרויקט חדש'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {saveStatus === 'saving' && (
                <Badge variant="outline" className="border-blue-400 text-blue-400">
                  <Loader2 className="w-3 h-3 animate-spin ml-1" />
                  שומר...
                </Badge>
              )}
              {saveStatus === 'saved' && (
                <Badge variant="outline" className="border-green-400 text-green-400">
                  <CheckCircle2 className="w-3 h-3 ml-1" />
                  נשמר
                </Badge>
              )}
              {saveStatus === 'error' && (
                <Badge variant="outline" className="border-red-400 text-red-400">
                  <AlertCircle className="w-3 h-3 ml-1" />
                  שגיאה
                </Badge>
              )}
              <Button onClick={onCancel} variant="outline" size="sm">
                חזור
              </Button>
            </div>
          </div>

          <div className="mt-6 mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {steps.map(step => (
                <button
                  key={step.number}
                  onClick={() => setCurrentStep(step.number)}
                  className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap text-sm font-medium ${
                    currentStep === step.number
                      ? 'bg-horizon-primary text-white shadow-md'
                      : 'bg-horizon-card text-horizon-accent hover:bg-horizon-card/80 border border-horizon'
                  }`}
                >
                  {step.number}. {step.title}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      <div className="min-h-[600px]">
        {currentStep === 1 && (
          <Step1ProjectDetails
            projectData={projectData}
            onUpdate={updateProject}
            onNext={() => setCurrentStep(2)}
            onBack={onCancel}
          />
        )}

        {currentStep === 2 && (
          <Step2SelectProducts
            projectData={projectData}
            onUpdate={updateProject}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
            customer={customer}
          />
        )}

        {currentStep === 3 && (
          <Step3LaborCosts
            projectData={projectData}
            onUpdate={updateProject}
            onNext={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 4 && (
          <Step4DesiredMargin
            projectData={projectData}
            onUpdate={updateProject}
            onNext={() => setCurrentStep(5)}
            onBack={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 5 && (
          <Step5Summary
            projectData={projectData}
            onSave={handleSave}
            onBack={() => setCurrentStep(4)}
            isSaving={isSaving}
            calculateFinalPrice={(cost, margin) => {
                // Correct Margin Calculation: Price = Cost / (1 - Margin%)
                // Example: Cost 100, Margin 20% -> Price = 100 / 0.8 = 125. Profit = 25.
                if (!cost) return 0;
                if (!margin) return cost;
                const marginDecimal = parseFloat(margin) / 100;
                if (marginDecimal >= 1) return 0; // Prevent division by zero or negative
                return cost / (1 - marginDecimal);
            }}
          />
        )}
      </div>
    </div>
  );
}