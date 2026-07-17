import { TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Report } from '../../types/report';

interface ReportCardProps {
  report: Report;
  onPress: (report: Report) => void;
}

export default function ReportCard({ report, onPress }: ReportCardProps) {
  const successRate = report.report_data?.summary?.successRate ?? 0;
  const successColor = successRate >= 100 ? '#10B981' : successRate > 0 ? '#F59E0B' : '#EF4444';

  return (
    <TouchableOpacity onPress={() => onPress(report)} activeOpacity={0.7}>
      <View style={{ backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="document-text" size={20} color="#3B82F6" />
            <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginLeft: 8 }} numberOfLines={1}>
              {report.name}
            </Text>
          </View>
          <Text style={{ color: '#64748B', fontSize: 12 }}>
            {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Success Rate</Text>
            <Text style={{ color: successColor, fontSize: 16, fontWeight: '700' }}>{successRate.toFixed(1)}%</Text>
          </View>
          <View>
            <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Requests</Text>
            <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '700' }}>{report.report_data?.summary?.totalRequests ?? 0}</Text>
          </View>
          <View>
            <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>Duration</Text>
            <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '700' }}>{(report.report_data?.summary?.totalDurationMs ?? 0) / 1000}s</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
