

// WarnModal.tsx
import Button from '@/components/UI/Buttons/Button';
import Input from '@/components/UI/Input/Input';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Modal from './Modal';

type Option = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  textSize?: number;
};

type WarnModalProps = {
  visible: boolean;
  onClose?: () => void;
  title?: string;
  message?: string;
  leftOption?: Option;
  rightOption?: Option;
  isDeletion?:  boolean;
};

const WarnModal: React.FC<WarnModalProps> = ({
  visible,
  onClose,
  title = '',
  message = '',
  leftOption,
  rightOption,
  isDeletion
}) => {
  const {t, i18n} = useTranslation();

  const [text, setText] = useState("");
  const [randomText, setRandomText] = useState("");

  const [disabled, setDisabled] = useState(true);
  useEffect(() => {
    if (visible) {
      setText("");
      
      if (isDeletion) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setRandomText(code);
      }
    }
  }, [visible, isDeletion]); 
  useEffect(() => {
    if (isDeletion === true) {
      if (text === randomText && randomText !== "") {
        setDisabled(false);
      } else {
        setDisabled(true);
      }
    } else {
      setDisabled(false);
    }
  }, [text, randomText]);
  return (
    <Modal visible={visible} onClose={() => {
      onClose && onClose()
      }} dismissable>
      <View style={styles.wrapper}>
        <Text style={styles.title}>{title}</Text>
        { message && <Text style={styles.message}>{message}</Text>}
        {isDeletion && (
          <View style={styles.deletionContainer}>
            <Text style={styles.requirementText}>
              {t('common.removal_requirements')}
            </Text>
            
            <View style={styles.captchaBox}>
              <Text style={styles.captchaDigits}>{randomText}</Text>
            </View>

            <Input 
              value={text} 
              onChangeText={setText}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="••••••"
              placeholderTextColor="#666"
              style={styles.captchaInput}
            />
          </View>
        )}
        <View style={styles.row}>
          <View style={styles.flexItem}>
            <Button
              title={leftOption?.label ?? t('common.cancel')}
              onPress={() => {
                onClose && onClose();
                leftOption && leftOption.onPress && leftOption.onPress();
              }}
              style={[styles.leftButton]}
              textStyle={{fontSize: leftOption?.textSize}}
            />
          </View>

          <View style={styles.flexItem}>
            <Button
              disabled={disabled}
              title={rightOption?.label ?? t('common.ok')}
              onPress={() => {
                onClose && onClose();
                rightOption && rightOption.onPress && rightOption.onPress();
              }}
              style={[styles.rightButton, rightOption?.destructive ? styles.destructiveButton : null, {opacity: disabled ? 0.5 : 1}]}
              textStyle={[rightOption?.destructive ? styles.destructiveText : undefined, {fontSize: rightOption?.textSize}]}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    padding: 6,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    color: '#cfcfcf',
    fontSize: 15,
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  flexItem: {
    flex: 1,
    marginHorizontal: 6,
  },
  leftButton: {
    backgroundColor: '#161616',
  },
  rightButton: {
    backgroundColor: '#222',
    paddingHorizontal: 0,
    padding: 0
  },
  destructiveButton: {
    backgroundColor: '#3b0b0b',
  },
  destructiveText: {
    color: '#ffb3b3',
  },

  deletionContainer: {
    width: '100%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 69, 58, 0.05)',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.2)',
  },
  requirementText: {
    fontSize: 12,
    color: '#FF453A',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 1,
  },
  captchaBox: {
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#444',
    borderStyle: 'dashed',
    marginBottom: 15,
  },
  captchaDigits: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: 8,
    textDecorationLine: 'line-through',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  captchaInput: {
    width: '100%',
    textAlign: 'center',
    fontSize: 18,
    backgroundColor: '#121212',
    borderColor: '#333',
    height: 45,
  },
});

export default WarnModal;


