import { create } from 'zustand';
import * as reportService from '../services/reportService';
import { Report } from '../types/report';

interface ReportState {
  reports: Report[];
  isLoading: boolean;
  loadUserReports: () => Promise<void>;
  deleteReport: (id: string) => Promise<boolean>;
}

export const useReportStore = create<ReportState>((set) => ({
  reports: [],
  isLoading: false,
  loadUserReports: async () => {
    set({ isLoading: true });
    const reports = await reportService.getUserReports();
    set({ reports, isLoading: false });
  },
  deleteReport: async (id: string) => {
    const success = await reportService.deleteReport(id);
    if (success) {
      set((state) => ({ reports: state.reports.filter((r) => r.id !== id) }));
    }
    return success;
  },
}));
