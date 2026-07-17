import { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReportData } from '../../types/report';
import * as reportService from '../../services/reportService';
import { useReportStore } from '../../stores/reportStore';

interface GenerateReportModalProps {
  visible: boolean;
  onClose: () => void;
  collectionId: string;
  reportData: ReportData;
}

export default function GenerateReportModal({ visible, onClose, collectionId, reportData }: GenerateReportModalProps) {
  const [name, setName] = useState(`Collection Run ${new Date().toLocaleDateString()}`);
  const [isSaving, setIsSaving] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsSaving(true);
    const report = await reportService.createReport(collectionId, name, 'collection', reportData);
    if (report) {
      setShareLink(`http://localhost:5173/reports/${report.share_token}`);
      useReportStore.getState().loadUserReports();
    }
    setIsSaving(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#1E293B', borderRadius: 12, padding: 20, width: '100%', maxWidth: 400, alignSelf: 'center' }}>
          {!shareLink ? (
            <>
              <TouchableOpacity onPress={onClose} style={{ alignSelf: 'flex-end' }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#F8FAFC', marginBottom: 16 }}>Generate Report</Text>
              <Text style={{ fontSize: 14, color: '#94A3B8', marginBottom: 8 }}>Report Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="My Collection Run"
                placeholderTextColor="#475569"
                style={{ backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 12, color: '#F8FAFC', marginBottom: 20 }}
              />
              <TouchableOpacity
                onPress={handleGenerate}
                disabled={isSaving || !name.trim()}
                style={{ backgroundColor: '#3B82F6', borderRadius: 8, padding: 12, alignItems: 'center', opacity: isSaving || !name.trim() ? 0.5 : 1 }}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>Generate Report</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" style={{ alignSelf: 'center', marginBottom: 12 }} />
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#F8FAFC', textAlign: 'center', marginBottom: 4 }}>Report Generated</Text>
              <Text style={{ fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 16 }}>Shareable link created</Text>
              <TouchableOpacity style={{ backgroundColor: '#0F172A', padding: 12, borderRadius: 8 }}>
                <Text style={{ color: '#3B82F6', textAlign: 'center', fontSize: 13 }} selectable>{shareLink}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ color: '#94A3B8', fontSize: 14 }}>Close</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
