import { Platform, Share } from "react-native";
import * as Clipboard from "expo-clipboard";

interface ShareLinkOptions {
  url: string;
  title?: string;
}

interface ShareLinkResult {
  /** True when the link was copied to the clipboard (web). Caller shows a toast. */
  copiedToClipboard: boolean;
}

/**
 * Share a URL using the OS share sheet on iOS/Android, or copy it to the
 * clipboard on web.
 *
 * Native `Share.share` resolves (it does not reject) when the user dismisses
 * the sheet, so callers only need to handle genuine errors.
 */
export async function shareLink({
  url,
  title,
}: ShareLinkOptions): Promise<ShareLinkResult> {
  if (Platform.OS === "web") {
    await Clipboard.setStringAsync(url);
    return { copiedToClipboard: true };
  }

  // iOS reads `url`; Android reads `message`. Passing both is correct.
  await Share.share({ message: url, url, title });
  return { copiedToClipboard: false };
}
