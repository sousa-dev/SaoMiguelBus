import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  confirmTrafficReport,
  createTrafficReport,
  deleteTrafficReport,
  fetchTrafficCategories,
  fetchTrafficReport,
  fetchTrafficReports,
} from '@/lib/api';
import { track } from '@/lib/analytics';
import type { ConfirmVote, TrafficReportWriteInput } from '@/lib/types';

export interface NearbyReportsParams {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  category?: string;
  includeScheduled?: boolean;
  enabled?: boolean;
  /** Poll interval (ms) — set while driving mode is active. */
  refetchInterval?: number;
}

export function useTrafficCategories(enabled = true) {
  return useQuery({
    queryKey: ['traffic', 'v1', 'categories'],
    queryFn: fetchTrafficCategories,
    enabled,
    staleTime: 1000 * 60 * 30,
  });
}

export function useTrafficReports(params: NearbyReportsParams = {}) {
  const { enabled, refetchInterval, ...filters } = params;
  return useQuery({
    queryKey: ['traffic', 'v1', 'reports', filters],
    queryFn: async () => {
      const reports = await fetchTrafficReports({ ...filters, limit: 100 });
      if (filters.lat != null && filters.lng != null) {
        track('traffic', 'nearby', {
          results_count: reports.length,
          radius_km: filters.radiusKm ?? null,
        });
      }
      return reports;
    },
    enabled: enabled !== false,
    staleTime: 1000 * 30,
    refetchInterval: refetchInterval ?? false,
    refetchOnMount: 'always',
  });
}

export function useTrafficReport(reportId: number, enabled = true) {
  return useQuery({
    queryKey: ['traffic', 'v1', 'report', reportId],
    queryFn: () => fetchTrafficReport(reportId),
    enabled: enabled && reportId > 0,
    staleTime: 1000 * 30,
  });
}

export function useCreateTrafficReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TrafficReportWriteInput) => createTrafficReport(input),
    onSuccess: (report) => {
      track('traffic', 'report', {
        category: report.category.slug,
        scheduled: report.status === 'scheduled',
      });
      void queryClient.invalidateQueries({ queryKey: ['traffic', 'v1', 'reports'] });
    },
  });
}

export function useConfirmTrafficReport(reportId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vote: ConfirmVote) => confirmTrafficReport(reportId, vote),
    onSuccess: (_data, vote) => {
      track('traffic', 'confirm', { report_id: reportId, vote });
      void queryClient.invalidateQueries({ queryKey: ['traffic', 'v1', 'report', reportId] });
      void queryClient.invalidateQueries({ queryKey: ['traffic', 'v1', 'reports'] });
    },
  });
}

export function useDeleteTrafficReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: number) => deleteTrafficReport(reportId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['traffic', 'v1', 'reports'] });
    },
  });
}
