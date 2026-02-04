import { useToast } from "@/components/ui/use-toast";

export function useGlobalToast() {
  const { toast } = useToast();

  const showSuccess = (message, duration = 3000) => {
    toast({
      title: "הצלחה!",
      description: message,
      variant: "default",
      duration: duration
    });
  };

  const showError = (message, duration = 5000) => {
    toast({
      title: "שגיאה",
      description: message,
      variant: "destructive",
      duration: duration
    });
  };

  const showInfo = (message, duration = 3000) => {
    toast({
      title: "מידע",
      description: message,
      variant: "default",
      duration: duration
    });
  };

  const showWarning = (message, duration = 4000) => {
    toast({
      title: "אזהרה",
      description: message,
      variant: "default",
      duration: duration
    });
  };

  return { showSuccess, showError, showInfo, showWarning, toast };
}
