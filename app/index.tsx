import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { ArcadeMissionShell } from '@/components/ArcadeMissionShell';

const DAY_MS = 24 * 60 * 60 * 1000;

type Match = MediaLibrary.Asset & {
  extractedText: string;
  wordCount: number;
};

type ScanResult = {
  matches: Match[];
  checked: number;
  total: number;
  cancelled: boolean;
};

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const getDayStart = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const getDayEnd = (date: Date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

const getValidTimestamp = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  const timestamp = value < 10_000_000_000 ? value * 1000 : value;
  return Number.isFinite(new Date(timestamp).getTime()) ? timestamp : null;
};

const parseExifDate = (value: unknown) => {
  if (typeof value !== 'string') return null;

  const match = /^(\d{4}):(\d{2}):(\d{2})[ :]?(\d{2})?:?(\d{2})?:?(\d{2})?$/.exec(
    value.trim(),
  );
  if (!match) return null;

  const [, year, month, day, hours = '0', minutes = '0', seconds = '0'] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds),
  );
  return date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day)
    ? date.getTime()
    : null;
};

type ResolvedAssetDate = {
  timestamp: number | null;
  source: 'exif' | 'creationTime' | 'modificationTime' | 'none';
};

const getExifCaptureDate = (exif: object | undefined) => {
  if (!exif) return null;
  const values = exif as Record<string, unknown>;
  return (
    parseExifDate(values.DateTimeOriginal) ??
    parseExifDate(values.DateTimeDigitized) ??
    parseExifDate(values.DateTime)
  );
};

const resolveAssetDate = async (
  asset: MediaLibrary.Asset,
  from: number,
  to: number,
): Promise<ResolvedAssetDate> => {
  const creationTime = getValidTimestamp(asset.creationTime);
  const modificationTime = getValidTimestamp(asset.modificationTime);
  const creationMatches =
    creationTime !== null && creationTime >= from && creationTime <= to;

  if (creationMatches) {
    return { timestamp: creationTime, source: 'creationTime' };
  }

  try {
    const info = await MediaLibrary.getAssetInfoAsync(asset);
    const exifTime = getExifCaptureDate(info.exif);
    if (exifTime !== null) {
      return { timestamp: exifTime, source: 'exif' };
    }
  } catch {
    // EXIF may be unavailable without media-location permission.
  }

  if (creationTime !== null) {
    return { timestamp: creationTime, source: 'creationTime' };
  }
  if (modificationTime !== null) {
    return { timestamp: modificationTime, source: 'modificationTime' };
  }
  return { timestamp: null, source: 'none' };
};

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [matches, setMatches] = useState<Match[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [startDate, setStartDate] = useState(
    () => new Date(Date.now() - 30 * DAY_MS),
  );
  const [endDate, setEndDate] = useState(() => new Date());
  const [dateTarget, setDateTarget] = useState<'start' | 'end' | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [permissionLimited, setPermissionLimited] = useState(false);
  const [progress, setProgress] = useState({ checked: 0, total: 0 });
  const [scanPhase, setScanPhase] = useState<'retrieving' | 'filtering' | 'ocr'>('retrieving');
  const [scanWasCancelled, setScanWasCancelled] = useState(false);
  const cancelScanRef = useRef(false);

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected],
  );
  const allSelected =
    matches.length > 0 && matches.every((item) => selected[item.id]);

  const openSettings = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Linking.openSettings().catch(() => {
        Alert.alert(
          'Settings unavailable',
          'Open your device settings and allow DocuSweep to access photos.',
        );
      });
    }
  }, []);

  const chooseDate = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      const target = dateTarget;
      setDateTarget(null);
      if (event.type === 'dismissed' || !date || !target) return;

      if (target === 'start') {
        setStartDate(date);
        if (date > endDate) setEndDate(date);
      } else {
        setEndDate(date);
        if (date < startDate) setStartDate(date);
      }
    },
    [dateTarget, endDate, startDate],
  );

  const scanPhotos = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Use an Android device',
        'Gallery scanning and on-device text recognition are available in the Android app.',
      );
      return;
    }

    cancelScanRef.current = false;
    setIsScanning(true);
    setHasScanned(false);
    setScanWasCancelled(false);
    setMatches([]);
    setSelected({});
    setProgress({ checked: 0, total: 0 });
    setScanPhase('retrieving');

    try {
      const permission = await MediaLibrary.requestPermissionsAsync(false, [
        'photo',
      ]);
      const allowed =
        permission.granted || permission.accessPrivileges === 'limited';
      if (!allowed) {
        if (!permission.canAskAgain) {
          Alert.alert(
            'Photo access is turned off',
            'Allow photo access in Android settings to scan your gallery.',
            [
              { text: 'Not now', style: 'cancel' },
              { text: 'Open settings', onPress: openSettings },
            ],
          );
        } else {
          Alert.alert(
            'Photo access needed',
            'Allow DocuSweep to access photos so it can look for documents and notes.',
          );
        }
        return;
      }

      setPermissionLimited(permission.accessPrivileges === 'limited');

      let assets: MediaLibrary.Asset[] = [];
      let totalPhotosRetrieved = 0;
      let cursor: string | undefined;
      let hasNextPage = true;
      const from = getDayStart(startDate).getTime();
      const to = getDayEnd(endDate).getTime();

      while (hasNextPage && !cancelScanRef.current) {
        const page = await MediaLibrary.getAssetsAsync({
          mediaType: 'photo',
          first: 100,
          after: cursor,
          sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        });
        assets = [...assets, ...page.assets];
        totalPhotosRetrieved = assets.length;
        cursor = page.endCursor;
        hasNextPage = page.hasNextPage;
        setProgress({ checked: 0, total: assets.length });
      }

      if (cancelScanRef.current) {
        setHasScanned(true);
        setScanWasCancelled(true);
        return;
      }

      const dateCounts = {
        creationTime: 0,
        modificationTime: 0,
        exif: 0,
        unavailable: 0,
        matched: 0,
      };
      const selectedDateAssets: MediaLibrary.Asset[] = [];
      const sampleDates: string[] = [];
      setScanPhase('filtering');

      for (let index = 0; index < assets.length; index += 1) {
        if (cancelScanRef.current) break;

        const asset = assets[index];
        const resolvedDate = await resolveAssetDate(asset, from, to);
        if (resolvedDate.source === 'creationTime') dateCounts.creationTime += 1;
        if (resolvedDate.source === 'modificationTime') {
          dateCounts.modificationTime += 1;
        }
        if (resolvedDate.source === 'exif') dateCounts.exif += 1;
        if (resolvedDate.source === 'none') dateCounts.unavailable += 1;

        if (sampleDates.length < 5) {
          sampleDates.push(
            `${asset.filename}: ${
              resolvedDate.timestamp === null
                ? 'unavailable'
                : `${resolvedDate.source} ${new Date(
                    resolvedDate.timestamp,
                  ).toLocaleDateString()}`
            }`,
          );
        }

        if (
          resolvedDate.timestamp !== null &&
          resolvedDate.timestamp >= from &&
          resolvedDate.timestamp <= to
        ) {
          dateCounts.matched += 1;
          selectedDateAssets.push(asset);
        }
        setProgress({ checked: index + 1, total: assets.length });
      }

      if (cancelScanRef.current) {
        setScanPhase('ocr');
        setHasScanned(true);
        setScanWasCancelled(true);
        return;
      }

      Alert.alert(
        'Date filter diagnostic',
        [
          `Selected: ${new Date(from).toLocaleDateString()} to ${new Date(to).toLocaleDateString()}.`,
          `${assets.length} photos returned; ${dateCounts.matched} matched.`,
          `Dates used: ${dateCounts.exif} EXIF, ${dateCounts.creationTime} creation, ${dateCounts.modificationTime} modification, ${dateCounts.unavailable} unavailable.`,
          sampleDates.length ? `Sample: ${sampleDates.join(' | ')}` : 'No photos returned.',
        ].join('\n'),
      );
      assets = selectedDateAssets;
      // This package uses native Google ML Kit. Its module is loaded only when
      // scanning starts so the screen can still render in a generic preview.
      let recognizeText: (uri: string) => Promise<{ text?: string; blocks?: Array<{ lines?: unknown[] }> }>;
      try {
        const textRecognition = await import(
          '@react-native-ml-kit/text-recognition'
        );
        recognizeText = (uri) => textRecognition.default.recognize(uri);
      } catch {
        Alert.alert(
          'Android build required',
          'On-device text recognition needs the DocuSweep Android build. It is not available in the standard Expo Go preview.',
        );
        return;
      }

      let detectFaces:
        | ((
            uri: string,
            options?: {
              performanceMode?: 'fast' | 'accurate';
              minFaceSize?: number;
            },
          ) => Promise<unknown[]>)
        | null = null;
      try {
        const faceDetection = await import(
          '@react-native-ml-kit/face-detection'
        );
        detectFaces = (uri, options) =>
          faceDetection.default.detect(uri, options);
      } catch {
        Alert.alert(
          'People filtering unavailable',
          'Face detection is not available in this build. Text-based scanning will continue without excluding photos containing people.',
        );
      }

      const result: ScanResult = {
        matches: [],
        checked: 0,
        total: assets.length,
        cancelled: false,
      };
      setProgress({ checked: 0, total: assets.length });

      for (let index = 0; index < assets.length; index += 1) {
        if (cancelScanRef.current) {
          result.cancelled = true;
          break;
        }

        const asset = assets[index];
        setProgress({ checked: index, total: assets.length });
        try {
          const recognition = await recognizeText(asset.uri);
          const text = (recognition.text ?? '').trim();
          const lineCount =
            recognition.blocks?.reduce(
              (totalLines, block) => totalLines + (block.lines?.length ?? 0),
              0,
            ) ?? 0;
          const wordCount = text.split(/\s+/).filter(Boolean).length;

          // OCR is a first-pass signal, not a perfect document classifier.
          // Every result remains reviewable before any deletion is requested.
          if (
            wordCount >= 8 ||
            lineCount >= 3 ||
            (wordCount >= 4 && asset.width > asset.height * 0.8)
          ) {
            let hasFace = false;
            if (detectFaces) {
              try {
                const faces = await detectFaces(asset.uri, {
                  performanceMode: 'fast',
                  minFaceSize: 0.08,
                });
                hasFace = faces.length > 0;
              } catch {
                // Keep the OCR match when face detection cannot process one image.
              }
            }

            if (!hasFace) {
              result.matches.push({ ...asset, extractedText: text, wordCount });
            }
          }
        } catch {
          // Unsupported image formats and individual OCR failures are skipped.
        }
        result.checked = index + 1;
        setProgress({ checked: result.checked, total: assets.length });
      }

      setMatches(result.matches);
      setHasScanned(true);
      setScanWasCancelled(result.cancelled);
      if (result.cancelled) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        );
      } else if (result.matches.length === 0) {
        Alert.alert(
          'Scan complete',
          'No likely document or note photos were found in this date range.',
        );
      } else {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }
    } catch (error) {
      Alert.alert(
        'Could not scan photos',
        error instanceof Error
          ? error.message
          : 'Check photo access and try again.',
      );
    } finally {
      setIsScanning(false);
      setScanPhase('retrieving');
      setProgress({ checked: 0, total: 0 });
    }
  }, [endDate, openSettings, startDate]);

  const cancelScan = useCallback(() => {
    cancelScanRef.current = true;
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelected((current) => ({ ...current, [id]: !current[id] }));
    void Haptics.selectionAsync();
  }, []);

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelected({});
    } else {
      setSelected(Object.fromEntries(matches.map((item) => [item.id, true])));
    }
    void Haptics.selectionAsync();
  }, [allSelected, matches]);

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const idsToDelete = [...selectedIds];
    void (async () => {
      try {
        let permission = await MediaLibrary.getPermissionsAsync(false, ['photo']);
        let canAccessMedia =
          permission.granted || permission.accessPrivileges === 'limited';
        if (!canAccessMedia && permission.canAskAgain) {
          permission = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
          canAccessMedia =
            permission.granted || permission.accessPrivileges === 'limited';
        }
        if (!canAccessMedia) {
          Alert.alert(
            'Photo access needed',
            'Allow DocuSweep to access the selected photos before deleting them.',
            permission.canAskAgain
              ? [{ text: 'Not now', style: 'cancel' }]
              : [{ text: 'Open settings', onPress: openSettings }, { text: 'Cancel', style: 'cancel' }],
          );
          return;
        }

        const confirmed = await MediaLibrary.deleteAssetsAsync(idsToDelete);
        if (!confirmed) {
          Alert.alert(
            'Nothing deleted',
            'Android did not confirm the deletion request.',
          );
          return;
        }
        setMatches((current) =>
          current.filter((item) => !idsToDelete.includes(item.id)),
        );
        setSelected({});
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        Alert.alert(
          'Deletion request processed',
          'Android processed the selected photo deletion request.',
        );
      } catch (error) {
        Alert.alert(
          'Deletion needs approval',
          error instanceof Error
            ? error.message
            : 'Android may require you to approve deletion in its system photo flow. Review the system prompt to continue.',
        );
      }
    })();
  }, [openSettings, selectedIds]);

  const renderMatch = useCallback(
    ({ item }: { item: Match }) => {
      const isSelected = Boolean(selected[item.id]);
      return (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isSelected }}
          accessibilityLabel={`Photo from ${formatDate(new Date(item.creationTime))}, ${item.wordCount} detected words`}
          onPress={() => toggleSelected(item.id)}
          style={({ pressed }) => [
            styles.matchCard,
            {
              backgroundColor: isSelected ? colors.accent : colors.card,
              borderColor: colors.foreground,
              transform: [{ translateX: pressed ? 2 : 0 }, { translateY: pressed ? 2 : 0 }],
            },
          ]}
          testID={`photo-match-${item.id}`}
        >
          <View style={styles.thumbnailFrame}>
            <Image
              source={{ uri: item.uri }}
              style={[styles.thumbnail, { backgroundColor: colors.muted }]}
              resizeMode="cover"
              accessibilityLabel="Photo preview"
            />
            <View style={[styles.evidenceStamp, { backgroundColor: colors.primary }]}>
              <Text style={[styles.stampText, { color: colors.primaryForeground }]}>OCR CLUE</Text>
            </View>
            <View
              style={[
                styles.checkCircle,
                {
                  backgroundColor: isSelected ? colors.primary : colors.card,
                  borderColor: colors.foreground,
                },
              ]}
            >
              {isSelected ? (
                <Ionicons name="checkmark" size={17} color={colors.primaryForeground} />
              ) : null}
            </View>
          </View>
          <View style={styles.matchFooter}>
            <View style={styles.matchContent}>
              <Text numberOfLines={1} style={[styles.matchFilename, { color: colors.foreground }]}>
                {item.filename.toUpperCase()}
              </Text>
              <Text style={[styles.matchMeta, { color: colors.mutedForeground }]}>
                {formatDate(new Date(item.creationTime))} · {item.wordCount} WORDS
              </Text>
              <Text numberOfLines={2} style={[styles.matchSnippet, { color: colors.foreground }]}>
                {item.extractedText || 'TEXT-LIKE CONTENT DETECTED'}
              </Text>
            </View>
          </View>
        </Pressable>
      );
    },
    [colors, selected, toggleSelected],
  );

  const emptyResults = (
    <View
      style={[
        styles.emptyCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: colors.secondary },
        ]}
      >
        <Ionicons name="documents-outline" size={24} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        {scanWasCancelled ? 'Scan paused' : 'Nothing found this time'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        {scanWasCancelled
          ? 'Your checked photos are shown above. You can scan the date range again whenever you are ready.'
          : 'Try a wider date range or check that DocuSweep can see the photos you want to scan.'}
      </Text>
    </View>
  );

  return (
    <ArcadeMissionShell
      colors={colors}
      matches={matches}
      selected={selected}
      selectedIds={selectedIds}
      allSelected={allSelected}
      startDate={startDate}
      endDate={endDate}
      isScanning={isScanning}
      hasScanned={hasScanned}
      permissionLimited={permissionLimited}
      progress={progress}
      scanPhase={scanPhase}
      scanWasCancelled={scanWasCancelled}
      onSetDateRange={(nextStart, nextEnd) => {
        setStartDate(nextStart);
        setEndDate(nextEnd);
      }}
      onScan={() => {
        void scanPhotos();
      }}
      onCancel={cancelScan}
      onToggleSelected={toggleSelected}
      onToggleAll={toggleAll}
      onDelete={deleteSelected}
      onOpenSettings={openSettings}
    />
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background}
      />
      <FlatList
        data={hasScanned ? matches : []}
        keyExtractor={(item) => item.id}
        renderItem={renderMatch}
        numColumns={2}
        columnWrapperStyle={styles.resultsRow}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: Platform.OS === 'web' ? 67 : 6,
            paddingBottom:
              Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 16) +
              (selectedIds.length > 0 ? 88 : 28),
          },
        ]}
        ListHeaderComponent={
          <View>
            <View style={styles.topbar}>
              <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
                <Ionicons
                  name="scan-outline"
                  size={22}
                  color={colors.primaryForeground}
                />
              </View>
              <View style={styles.brandText}>
                <Text style={[styles.brandName, { color: colors.foreground }]}>
                  DocuSweep
                </Text>
                <Text
                  style={[styles.brandCaption, { color: colors.mutedForeground }]}
                >
                  Your gallery, a little tidier
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open photo access settings"
                onPress={openSettings}
                style={({ pressed }) => [
                  styles.settingsButton,
                  { opacity: pressed ? 0.72 : 1 },
                ]}
              >
                <Ionicons name="settings-outline" size={21} color={colors.foreground} />
              </Pressable>
              <View style={[styles.privateBadge, { backgroundColor: colors.secondary }]}>
                <Ionicons name="lock-closed-outline" size={12} color={colors.primary} />
                <Text style={[styles.privateText, { color: colors.primary }]}>
                  On device
                </Text>
              </View>
            </View>

            <View
              style={[styles.hero, { backgroundColor: colors.foreground }]}
            >
              <View style={styles.heroCopy}>
                <Text style={[styles.eyebrow, { color: colors.secondary }]}>
                  A QUIETER CAMERA ROLL
                </Text>
                <Text
                  style={[
                    styles.heroTitle,
                    { color: colors.primaryForeground },
                  ]}
                >
                  Find the pages{'\n'}you meant to keep.
                </Text>
                <Text style={[styles.heroBody, { color: colors.secondary }]}>
                  Spot notebook pages, receipts, and document photos in a date
                  range you choose. You review every match.
                </Text>
              </View>
              <View style={styles.heroArt} pointerEvents="none">
                <View style={[styles.mascotBadge, { backgroundColor: colors.accent }]}>
                  <Ionicons name="person" size={29} color={colors.foreground} />
                  <Ionicons name="search" size={18} color={colors.primary} style={styles.mascotGlass} />
                </View>
                <View
                  style={[styles.paperBack, { backgroundColor: colors.accent }]}
                />
                <View
                  style={[styles.paperFront, { backgroundColor: colors.card }]}
                >
                  <View
                    style={[styles.paperFold, { backgroundColor: colors.border }]}
                  />
                  <View
                    style={[
                      styles.paperLineWide,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                  <View
                    style={[
                      styles.paperLine,
                      { backgroundColor: colors.mutedForeground },
                    ]}
                  />
                  <View
                    style={[
                      styles.paperLineShort,
                      { backgroundColor: colors.mutedForeground },
                    ]}
                  />
                </View>
                <View
                  style={[
                    styles.scanCorner,
                    {
                      backgroundColor: colors.destructive,
                      borderColor: colors.foreground,
                    },
                  ]}
                >
                  <Ionicons
                    name="scan"
                    size={28}
                    color={colors.destructiveForeground}
                  />
                </View>
              </View>
            </View>

            <View
              style={[
                styles.dateCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.sectionHeading}>
                <View style={styles.sectionHeadingText}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                    Choose your dates
                  </Text>
                  <Text
                    style={[styles.cardSubtitle, { color: colors.mutedForeground }]}
                  >
                    Both dates are included in the scan
                  </Text>
                </View>
                <View style={[styles.calendarBadge, { backgroundColor: colors.accent }]}>
                  <Ionicons
                    name="calendar-clear-outline"
                    size={18}
                    color={colors.accentForeground}
                  />
                </View>
              </View>
              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                    FROM
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Start date, ${formatDate(startDate)}`}
                    onPress={() => setDateTarget('start')}
                    style={({ pressed }) => [
                      styles.dateButton,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        opacity: pressed ? 0.76 : 1,
                      },
                    ]}
                    testID="start-date-button"
                  >
                    <Text style={[styles.dateValue, { color: colors.foreground }]}>
                      {formatDate(startDate)}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={16}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                </View>
                <View style={styles.dateArrow}>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={colors.mutedForeground}
                  />
                </View>
                <View style={styles.dateField}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                    TO
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`End date, ${formatDate(endDate)}`}
                    onPress={() => setDateTarget('end')}
                    style={({ pressed }) => [
                      styles.dateButton,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        opacity: pressed ? 0.76 : 1,
                      },
                    ]}
                    testID="end-date-button"
                  >
                    <Text style={[styles.dateValue, { color: colors.foreground }]}>
                      {formatDate(endDate)}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={16}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                </View>
              </View>

              {dateTarget ? (
                <DateTimePicker
                  value={dateTarget === 'start' ? startDate : endDate}
                  mode="date"
                  display={Platform.OS === 'android' ? 'default' : 'compact'}
                  maximumDate={new Date()}
                  onChange={chooseDate}
                />
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={() => void scanPhotos()}
                disabled={isScanning}
                style={({ pressed }) => [
                  styles.scanButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: isScanning ? 0.74 : pressed ? 0.85 : 1,
                  },
                ]}
                testID="scan-gallery-button"
              >
                {isScanning ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <>
                    <Ionicons
                      name="scan-outline"
                      size={19}
                      color={colors.primaryForeground}
                    />
                    <Text
                      style={[
                        styles.scanButtonText,
                        { color: colors.primaryForeground },
                      ]}
                    >
                      Scan my gallery
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={17}
                      color={colors.primaryForeground}
                    />
                  </>
                )}
              </Pressable>

              {isScanning ? (
                <View style={styles.progressArea}>
                  <View style={styles.progressHeading}>
                    <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
                      {scanPhase === 'retrieving'
                        ? 'Finding photos in this date range…'
                        : scanPhase === 'filtering'
                          ? `Filtering photo ${Math.min(progress.checked + 1, progress.total)} of ${progress.total}`
                          : `Checking photo ${Math.min(progress.checked + 1, progress.total)} of ${progress.total}`}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={cancelScan}
                      hitSlop={10}
                      testID="cancel-scan-button"
                    >
                      <Text style={[styles.cancelText, { color: colors.primary }]}>
                        Stop
                      </Text>
                    </Pressable>
                  </View>
                  {progress.total > 0 ? (
                    <View
                      accessibilityRole="progressbar"
                      accessibilityValue={{
                        min: 0,
                        max: progress.total,
                        now: Math.min(progress.checked, progress.total),
                      }}
                      style={[styles.progressTrack, { backgroundColor: colors.muted }]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: colors.primary,
                            width: `${Math.max(
                              2,
                              Math.round((progress.checked / progress.total) * 100),
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}

              {permissionLimited ? (
                <View style={[styles.notice, { backgroundColor: colors.accent }]}>
                  <Ionicons
                    name="information-circle-outline"
                    size={17}
                    color={colors.accentForeground}
                  />
                  <Text
                    style={[styles.noticeText, { color: colors.accentForeground }]}
                  >
                    Limited access: only photos you allowed can be scanned.
                  </Text>
                </View>
              ) : null}
            </View>

            {hasScanned ? (
              <View style={styles.resultsHeading}>
                <View style={styles.resultsTitleWrap}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                    Review matches
                  </Text>
                  <Text
                    style={[styles.cardSubtitle, { color: colors.mutedForeground }]}
                  >
                    {scanWasCancelled
                      ? `${matches.length} match${matches.length === 1 ? '' : 'es'} found before stopping`
                      : `${matches.length} likely text-heavy photo${matches.length === 1 ? '' : 's'}`}
                  </Text>
                </View>
                {matches.length > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={toggleAll}
                    testID="select-all-button"
                  >
                    <Text style={[styles.selectAll, { color: colors.primary }]}>
                      {allSelected ? 'Deselect all' : 'Select all'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <View
                style={[
                  styles.privacyCard,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <View
                  style={[
                    styles.privacyIcon,
                    { backgroundColor: colors.card },
                  ]}
                >
                  <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
                </View>
                <View style={styles.privacyCopy}>
                  <Text style={[styles.privacyTitle, { color: colors.foreground }]}>
                    Your photos stay yours
                  </Text>
                  <Text style={[styles.privacyText, { color: colors.mutedForeground }]}>
                    Text recognition happens on this device. DocuSweep does not
                    upload your gallery.
                  </Text>
                </View>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={hasScanned ? emptyResults : null}
      />

      {selectedIds.length > 0 ? (
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={styles.bottomCount}>
            <View style={[styles.selectionDot, { backgroundColor: colors.primary }]}>
              <Text
                style={[
                  styles.selectionNumber,
                  { color: colors.primaryForeground },
                ]}
              >
                {selectedIds.length > 99 ? '99+' : selectedIds.length}
              </Text>
            </View>
            <Text style={[styles.selectedLabel, { color: colors.foreground }]}>
              selected
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={deleteSelected}
            style={({ pressed }) => [
              styles.deleteButton,
              {
                backgroundColor: colors.destructive,
                opacity: pressed ? 0.84 : 1,
              },
            ]}
            testID="delete-selected-button"
          >
            <Ionicons name="trash-outline" size={17} color={colors.destructiveForeground} />
            <Text style={[styles.deleteButtonText, { color: colors.destructiveForeground }]}>
              Delete selected
            </Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 8, flexGrow: 1 },
  resultsRow: { gap: 8, alignItems: 'stretch' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#32252A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { flex: 1 },
  brandName: { fontFamily: 'monospace', fontSize: 17, fontWeight: '800', letterSpacing: 1 },
  brandCaption: { fontFamily: 'monospace', fontSize: 9, marginTop: 2, letterSpacing: 1.5 },
  settingsButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5D9D9',
    borderWidth: 2,
    borderColor: '#32252A',
    shadowColor: '#32252A',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#32252A',
  },
  privateText: { fontFamily: 'monospace', fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  hero: {
    minHeight: 190,
    padding: 17,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#32252A',
    marginBottom: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#32252A',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  heroCopy: { flex: 1, zIndex: 1, paddingRight: 4 },
  eyebrow: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  heroTitle: {
    fontFamily: 'monospace',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  heroBody: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 9,
    maxWidth: 225,
  },
  heroArt: {
    width: 88,
    height: 122,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -7,
    transform: [{ rotate: '5deg' }],
  },
  mascotBadge: {
    position: 'absolute',
    top: 5,
    left: 4,
    width: 56,
    height: 56,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#32252A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: '#32252A',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  mascotGlass: { position: 'absolute', right: 3, bottom: 3 },
  paperBack: {
    position: 'absolute',
    width: 68,
    height: 88,
    borderRadius: 3,
    transform: [{ rotate: '-15deg' }, { translateX: 8 }],
  },
  paperFront: {
    width: 66,
    height: 90,
    borderRadius: 3,
    paddingTop: 27,
    paddingHorizontal: 12,
    gap: 8,
    transform: [{ rotate: '8deg' }],
  },
  paperFold: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderBottomLeftRadius: 3,
  },
  paperLineWide: { width: 39, height: 4, borderRadius: 4 },
  paperLine: { width: 35, height: 3, borderRadius: 4 },
  paperLineShort: { width: 25, height: 3, borderRadius: 4 },
  scanCorner: {
    position: 'absolute',
    right: -1,
    bottom: 2,
    width: 43,
    height: 43,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  dateCard: {
    borderRadius: 5,
    borderWidth: 2,
    padding: 14,
    marginBottom: 13,
    shadowColor: '#32252A',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionHeadingText: { flex: 1 },
  cardTitle: { fontFamily: 'monospace', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  cardSubtitle: { fontSize: 11, marginTop: 4 },
  calendarBadge: {
    width: 38,
    height: 38,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#32252A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 7 },
  dateField: { flex: 1 },
  fieldLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '800',
    marginBottom: 6,
    marginLeft: 2,
  },
  dateButton: {
    minHeight: 50,
    borderWidth: 2,
    borderRadius: 3,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  dateValue: { fontFamily: 'monospace', fontSize: 11, fontWeight: '700', flexShrink: 1 },
  dateArrow: { width: 18, height: 45, alignItems: 'center', justifyContent: 'center' },
  scanButton: {
    minHeight: 54,
    marginTop: 15,
    paddingHorizontal: 16,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#32252A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#32252A',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  scanButtonText: { fontFamily: 'monospace', fontSize: 13, fontWeight: '800', flex: 1, textAlign: 'center', letterSpacing: 0.5 },
  progressArea: { marginTop: 14 },
  progressHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  progressText: { fontSize: 10, flex: 1 },
  cancelText: { fontSize: 11, fontWeight: '800', paddingVertical: 2 },
  progressTrack: { height: 18, borderRadius: 2, overflow: 'hidden', marginTop: 9, borderWidth: 2, borderColor: '#32252A', padding: 2 },
  progressFill: { height: 10, borderRadius: 1 },
  notice: {
    marginTop: 13,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#32252A',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  noticeText: { flex: 1, fontSize: 10, lineHeight: 15 },
  privacyCard: {
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#32252A',
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    marginBottom: 16,
  },
  privacyIcon: {
    width: 31,
    height: 31,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyCopy: { flex: 1, paddingTop: 1 },
  privacyTitle: { fontSize: 12, fontWeight: '800', marginBottom: 3 },
  privacyText: { fontSize: 10, lineHeight: 15 },
  resultsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: '#32252A',
    backgroundColor: '#F5D9D9',
  },
  resultsTitleWrap: { flex: 1 },
  selectAll: { fontFamily: 'monospace', fontSize: 9, fontWeight: '800', paddingVertical: 8, paddingLeft: 10 },
  matchCard: {
    flex: 1,
    minWidth: 0,
    borderWidth: 2,
    borderRadius: 6,
    padding: 6,
    marginBottom: 10,
    marginHorizontal: 4,
    shadowColor: '#32252A',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  thumbnailFrame: {
    height: 132,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#32252A',
    position: 'relative',
  },
  evidenceStamp: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 2,
  },
  stampText: {
    fontFamily: 'monospace',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  matchFooter: { paddingTop: 7, paddingHorizontal: 2 },
  matchFilename: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '800',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  matchContent: { minWidth: 0 },
  matchMeta: {
    fontFamily: 'monospace',
    fontSize: 8,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  matchSnippet: { fontSize: 10, lineHeight: 14, marginTop: 5 },
  checkCircle: {
    width: 23,
    height: 23,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  emptyCard: {
    borderWidth: 2,
    borderRadius: 5,
    padding: 22,
    alignItems: 'center',
    marginTop: 2,
    shadowColor: '#32252A',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  emptyText: { fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 6 },
  bottomBar: {
    borderTopWidth: 2,
    paddingHorizontal: 20,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bottomCount: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectionDot: {
    minWidth: 25,
    height: 25,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionNumber: { fontSize: 10, fontWeight: '900' },
  selectedLabel: { fontSize: 12, fontWeight: '700' },
  deleteButton: {
    minHeight: 46,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#32252A',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    shadowColor: '#32252A',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  deleteButtonText: { fontFamily: 'monospace', fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
});
