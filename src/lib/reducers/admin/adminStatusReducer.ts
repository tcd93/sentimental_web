import { AdminStatus, AdminStatusAction } from "@/lib/types/admin/types";

export function adminStatusReducer(
  state: AdminStatus,
  action: AdminStatusAction
): AdminStatus {
  switch (action.type) {
    case "LOADING":
      return { loading: true, saving: false, error: "", success: false };
    case "LOADED":
      return { ...state, loading: false };
    case "SAVING":
      return { ...state, saving: true, error: "", success: false };
    case "SAVED":
      return { ...state, saving: false, success: true };
    case "ERROR":
      return {
        ...state,
        loading: false,
        saving: false,
        error: action.error,
        success: false,
      };
    case "RESET":
      return { loading: false, saving: false, error: "", success: false };
    default:
      return state;
  }
}