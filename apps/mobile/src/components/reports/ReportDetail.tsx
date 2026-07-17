import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Report } from '../../types/report';
import { useReportStore } from '../../stores/reportStore';

interface ReportDetailProps {
  report: Report;
  onClose: () => void;
}

export default function ReportDetail({ report, onClose }: ReportDetailProps) {
  const summary = report.report_data?.summary;
  const successRate = summary?.successRate ?? 0;
  const successColor = successRate >= 100 ? '#10B981' : '#F59E0B';

  const handleCopyLink = () => {
    const link = `http://localhost:5173/reports/${report.share_token}`;
    Clipboard.setStringAsync(link);
    Alert.alert('Copied', 'Share link copied to clipboard');
  };

  const handleDelete = () => {
    Alert.alert('Delete Report', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await useReportStore.getState().deleteReport(report.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155' }}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#F8FAFC', marginLeft: 12 }}>{report.name}</Text>
        <TouchableOpacity onPress={handleCopyLink} style={{ marginLeft: 8 }}>
          <Ionicons name="link" size={20} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} style={{ marginLeft: 8 }}>
          <Ionicons name="trash" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <View style={{ backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#334155' }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
            <View style={{ width: '50%', padding: 8 }}>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Total Requests</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#F8FAFC' }}>{summary?.totalRequests ?? 0}</Text>
            </View>
            <View style={{ width: '50%', padding: 8 }}>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Passed</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#10B981' }}>{summary?.passedRequests ?? 0}</Text>
            </View>
            <View style={{ width: '50%', padding: 8 }}>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Failed</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#EF4444' }}>{summary?.failedRequests ?? 0}</Text>
            </View>
            <View style={{ width: '50%', padding: 8 }}>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Success Rate</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: successColor }}>{successRate.toFixed(1)}%</Text>
            </View>
          </View>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#F8FAFC', marginBottom: 12, marginTop: 8 }}>Execution Details</Text>
        {report.report_data?.details?.map((detail, index) => {
          const step = detail.step;
          const isSuccess = !step?.error && (step?.status_code ?? 0) >= 200 && (step?.status_code ?? 0) < 300;
          return (
            <View key={index} style={{ backgroundColor: '#1E293B', borderRadius: 8, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ backgroundColor: '#334155', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 }}>
                  <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '700' }}>{detail.request?.method || 'GET'}</Text>
                </View>
                <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '500', flex: 1 }}>{detail.request?.name || 'Request'}</Text>
                <Ionicons name={isSuccess ? 'checkmark-circle' : 'close-circle'} size={20} color={isSuccess ? '#10B981' : '#EF4444'} />
              </View>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Text style={{ color: '#94A3B8', fontSize: 12 }}>Status: {step?.status_code ?? 'N/A'}</Text>
                <Text style={{ color: '#94A3B8', fontSize: 12 }}>Latency: {step?.latency_ms ?? 0}ms</Text>
              </View>
              {step?.error ? (
                <View style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', borderRadius: 6, padding: 8, marginTop: 8 }}>
                  <Text style={{ color: '#EF4444', fontSize: 12 }}>{step.error}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
