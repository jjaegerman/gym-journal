import { Platform, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import { track } from "@/lib/analytics/track";

interface ShareLinkOptions {
  url: string;
  title?: string;
}

function shareTypeFromUrl(url: string): string {
  if (url.includes("/share/workout/")) return "workout";
  if (url.includes("/share/stats")) return "stats";
  return "other";
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
  const share_type = shareTypeFromUrl(url);
  if (Platform.OS === "web") {
    await Clipboard.setStringAsync(url);
    track("workout_shared", { share_type, method: "clipboard" });
    return { copiedToClipboard: true };
  }

  // Pass the URL as `message` on both platforms: iOS auto-detects the link
  // and offers all URL-aware share targets, while text-only apps still accept
  // it. Passing `url` alongside `message` on iOS duplicates the item.
  await Share.share({ message: url, title });
  track("workout_shared", { share_type, method: "os_share_sheet" });
  return { copiedToClipboard: false };
}
