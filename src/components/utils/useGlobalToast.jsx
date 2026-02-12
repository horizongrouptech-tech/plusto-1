import { toast } from "sonner";

export function useGlobalToast() {
  const showSuccess = (message) => {
    toast.success(message, {
      duration: 3000,
    });
  };

  const showError = (message) => {
    toast.error(message, {
      duration: 3000,
    });
  };

  const showWarning = (message) => {
    toast.warning(message, {
      duration: 3000,
    });
  };

  const showInfo = (message) => {
    toast.info(message, {
      duration: 3000,
    });
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    toast
  };
}
