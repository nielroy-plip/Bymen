import { Alert, AlertButton, AlertOptions } from 'react-native';

type ShowAlertFn = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions,
) => void;

let installed = false;
let showHandler: ShowAlertFn | null = null;
const originalAlert = Alert.alert.bind(Alert);

export function installAppAlertAdapter(handler: ShowAlertFn) {
  showHandler = handler;

  if (installed) return;

  Alert.alert = ((title?: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) => {
    if (showHandler) {
      showHandler(String(title || ''), message, buttons, options);
      return;
    }

    originalAlert(title, message, buttons, options);
  }) as typeof Alert.alert;

  installed = true;
}

export function showNativeFallbackAlert(
  title?: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions,
) {
  originalAlert(title, message, buttons, options);
}
