// Share — capture a view as image and open the native share sheet.
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { logger } from './logger';

export async function shareViewAsImage(viewRef: any, dialogTitle = 'Bagikan'): Promise<boolean> {
  try {
    if (!viewRef?.current) return false;
    const uri = await captureRef(viewRef, { format: 'png', quality: 1, result: 'tmpfile' });
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      logger.warn('Sharing not available on this device', undefined, 'share');
      return false;
    }
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle });
    return true;
  } catch (e: any) {
    logger.warn(`Share failed: ${e?.message}`, undefined, 'share');
    return false;
  }
}
