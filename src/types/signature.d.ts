declare module 'react-native-signature-canvas' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  export interface SignatureViewProps {
    onOK?: (signature: string) => void;
    onEmpty?: () => void;
    onBegin?: () => void;
    onEnd?: () => void;
    descriptionText?: string;
    clearText?: string;
    confirmText?: string;
    webStyle?: string;
    autoClear?: boolean;
    penColor?: string;
    backgroundColor?: string;
    imageType?: string;
    style?: ViewStyle;
  }

  export default class SignatureCanvas extends Component<SignatureViewProps> {
    clearSignature(): void;
    readSignature(): void;
    changePenColor(color: string): void;
    changePenSize(minWidth: number, maxWidth: number): void;
  }
}
