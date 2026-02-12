import { toast } from "sonner";

export function useGlobalToast() {
  const showSuccess = (message, duration = 3000) => {
    toast.success(message, {
      duration: duration,
    });
  };

  const showError = (message, duration = 5000) => {
    toast.error(message, {
      duration: duration,
    });
  };

  const showInfo = (message, duration = 3000) => {
    toast.info(message, {
      duration: duration,
    });
  };

  const showWarning = (message, duration = 4000) => {
    toast.warning(message, {
      duration: duration,
    });
  };

  return { showSuccess, showError, showInfo, showWarning, toast };
}
