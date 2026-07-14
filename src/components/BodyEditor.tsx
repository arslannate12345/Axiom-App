import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Keyboard } from 'react-native';
import { useState, useRef } from 'react';
import type { BodyType } from '../types/database';

interface Props {
  bodyType: BodyType;
  body: string;
  onBodyTypeChange: (type: BodyType) => void;
  onBodyChange: (body: string) => void;
}

const BODY_TYPES: { type: BodyType; label: string }[] = [
  { type: 'none', label: 'None' },
  { type: 'json', label: 'JSON' },
  { type: 'raw', label: 'Raw' },
];

export function BodyEditor({ bodyType, body, onBodyTypeChange, onBodyChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const inputRef = useRef<TextInput>(null);

  const insertText = (char: string) => {
    const newBody = body.substring(0, selection.start) + char + body.substring(selection.end);
    onBodyChange(newBody);
    // Move cursor after inserted char
    setTimeout(() => {
      inputRef.current?.setNativeProps({ selection: { start: selection.start + char.length, end: selection.start + char.length } });
    }, 10);
  };

  const validateJson = (text: string) => {
    if (bodyType === 'json' && text.trim()) {
      try {
        let tempBody = text.replace(/"\{\{([^}]+)\}\}"/g, '"__AX_STR_$1__"');
        tempBody = tempBody.replace(/\{\{([^}]+)\}\}/g, '"__AX_NUM_$1__"');
        JSON.parse(tempBody);
        setError(null);
      } catch {
        setError('Invalid JSON syntax');
      }
    } else {
      setError(null);
    }
    onBodyChange(text);
  };

  const formatJson = () => {
    if (bodyType === 'json' && body.trim()) {
      try {
        let tempBody = body.replace(/"\{\{([^}]+)\}\}"/g, '"__AX_STR_$1__"');
        tempBody = tempBody.replace(/\{\{([^}]+)\}\}/g, '"__AX_NUM_$1__"');
        
        const parsed = JSON.parse(tempBody);
        let formatted = JSON.stringify(parsed, null, 2);
        
        // Restore
        formatted = formatted.replace(/"__AX_STR_([^"]+)__"/g, '"{{$1}}"');
        formatted = formatted.replace(/"__AX_NUM_([^"]+)__"/g, '{{$1}}');
        
        onBodyChange(formatted);
        setError(null);
      } catch {
        setError('Cannot format invalid JSON');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.typeRow}>
        {BODY_TYPES.map((bt) => (
          <TouchableOpacity
            key={bt.type}
            style={[styles.typeBtn, bodyType === bt.type && styles.typeBtnActive]}
            onPress={() => onBodyTypeChange(bt.type)}
          >
            <Text
              style={[
                styles.typeBtnText,
                bodyType === bt.type && styles.typeBtnTextActive,
              ]}
            >
              {bt.label}
            </Text>
          </TouchableOpacity>
        ))}
        {bodyType === 'json' && (
          <TouchableOpacity style={styles.formatBtn} onPress={formatJson}>
            <Text style={styles.formatBtnText}>Format</Text>
          </TouchableOpacity>
        )}
      </View>

      {bodyType !== 'none' && (
        <View style={styles.editorContainer}>
          {bodyType === 'json' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accessoryBar} keyboardShouldPersistTaps="always">
              {['{', '}', '[', ']', '"', ':', ',', '{{', '}}'].map((char) => (
                <TouchableOpacity key={char} style={styles.accessoryBtn} onPress={() => insertText(char)}>
                  <Text style={styles.accessoryBtnText}>{char}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <TextInput
            ref={inputRef}
            style={[styles.editor, bodyType === 'json' && styles.editorWithAccessory]}
            placeholder={
              bodyType === 'json'
                ? '{\n  "key": "value"\n}'
                : 'Enter raw body...'
            }
            placeholderTextColor="#475569"
            value={body}
            onChangeText={validateJson}
            onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
            multiline
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />
          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeBtnActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  formatBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366F1',
    marginLeft: 'auto',
  },
  formatBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366F1',
  },
  editorContainer: {
    flex: 1,
    minHeight: 160,
  },
  editor: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: '#F1F5F9',
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 160,
    maxHeight: 300,
  },
  error: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  accessoryBar: {
    flexDirection: 'row',
    marginBottom: 8,
    maxHeight: 36,
  },
  accessoryBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  accessoryBtnText: {
    color: '#F1F5F9',
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  editorWithAccessory: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  }
});
