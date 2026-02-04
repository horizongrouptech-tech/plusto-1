import { toast } from "sonner";

export function useGlobalToast() {
  const showSuccess = (message) => {
    toast.success(message, {
      position: "bottom-center",
      duration: 3000,
    });
  };

  const showError = (message) => {
    toast.error(message, {
      position: "bottom-center",
      duration: 3000,
    });
  };

  const showWarning = (message) => {
    toast.warning(message, {
      position: "bottom-center",
      duration: 3000,
    });
  };

  const showInfo = (message) => {
    toast.info(message, {
      position: "bottom-center",
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