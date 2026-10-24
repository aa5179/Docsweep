import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type ArcadeColors = {
  background: string;
  foreground: string;
  card: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
};

type ArcadeMatch = {
  id: string;
  uri: string;
  filename: string;
  creationTime: number;
  width: number;
  height: number;
  wordCount: number;
  extractedText: string;
};

type ArcadeMissionShellProps = {
  colors: ArcadeColors;
  matches: ArcadeMatch[];
  selected: Record<string, boolean>;
  selectedIds: string[];
  allSelected: boolean;
  startDate: Date;
  endDate: Date;
  dateTarget: 'start' | 'end' | null;
  isScanning: boolean;
  hasScanned: boolean;
  permissionLimited: boolean;
  progress: { checked: number; total: number };
  scanPhase: 'retrieving' | 'filtering' | 'ocr';
  scanWasCancelled: boolean;
  onChooseDate: (event: DateTimePickerEvent, date?: Date) => void;
  onSetDateTarget: (target: 'start' | 'end') => void;
  onSetDateRange: (start: Date, end: Date) => void;
  onScan: () => void;
  onCancel: () => void;
  onToggleSelected: (id: string) => void;
  onToggleAll: () => void;
  onDelete: () => void;
  onOpenSettings: () => void;
};

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const formatShortDate = (date: Date) =>
  date
    .toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
    .toUpperCase();

function PixelButton({
  children,
  color,
  textColor,
  icon,
  onPress,
  disabled = false,
  testID,
}: {
  children: string;
  color: string;
  textColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.pixelButton,
        { backgroundColor: color, opacity: disabled ? 0.58 : 1 },
        pressed && !disabled ? styles.pixelButtonPressed : null,
      ]}
    >
      <Ionicons name={icon} size={19} color={textColor} />
      <Text style={[styles.pixelButtonText, { color: textColor }]}>{children}</Text>
    </Pressable>
  );
}

function Mascot({ colors, scanning = false }: { colors: ArcadeColors; scanning?: boolean }) {
  return (
    <View style={[styles.mascot, { backgroundColor: colors.accent, borderColor: colors.foreground }]}>
      <Ionicons
        name={scanning ? 'search' : 'person'}
        size={31}
        color={colors.foreground}
      />
      <Ionicons
        name={scanning ? 'scan' : 'search'}
        size={17}
        color={colors.primary}
        style={styles.mascotGlass}
      />
      <View style={[styles.mascotTag, { backgroundColor: colors.primary }]}>
        <Text style={[styles.mascotTagText, { color: colors.primaryForeground }]}>RADAR</Text>
      </View>
    </View>
  );
}

function DateControls({
  colors,
  startDate,
  endDate,
  dateTarget,
  onChooseDate,
  onSetDateTarget,
  onSetDateRange,
}: Pick<
  ArcadeMissionShellProps,
  | 'colors'
  | 'startDate'
  | 'endDate'
  | 'dateTarget'
  | 'onChooseDate'
  | 'onSetDateTarget'
  | 'onSetDateRange'
>) {
  const [displayedMonth, setDisplayedMonth] = useState(
    () => new Date(startDate.getFullYear(), startDate.getMonth(), 1),
  );
  const [calendarTarget, setCalendarTarget] = useState<'start' | 'end'>('start');

  useEffect(() => {
    setDisplayedMonth(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
  }, [startDate]);

  const monthStart = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1);
  const daysInMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 0).getDate();
  const leadingDays = monthStart.getDay();
  const calendarDays = Array.from({ length: leadingDays + daysInMonth }, (_, index) =>
    index < leadingDays ? null : index - leadingDays + 1,
  );
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const setCalendarDate = (day: number) => {
    const chosen = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), day);
    if (calendarTarget === 'start') {
      onSetDateRange(chosen, chosen > endDate ? chosen : endDate);
    } else {
      onSetDateRange(chosen < startDate ? startDate : startDate, chosen);
    }
  };

  const setShortcut = (kind: 'today' | 'week' | 'month') => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (kind === 'today') onSetDateRange(today, now);
    if (kind === 'week') onSetDateRange(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000), now);
    if (kind === 'month') onSetDateRange(new Date(today.getFullYear(), today.getMonth(), 1), now);
    setDisplayedMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  return (
    <View style={[styles.dateCard, { backgroundColor: colors.secondary, borderColor: colors.foreground }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderCopy}>
          <View style={styles.kickerRow}>
            <Ionicons name="options-outline" size={16} color={colors.primary} />
            <Text style={[styles.kicker, { color: colors.foreground }]}>TIMELINE COORDINATES</Text>
          </View>
          <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>Both dates included in the hunt</Text>
        </View>
        <Text style={[styles.recordLabel, { color: colors.primary }]}>REC-2026</Text>
      </View>
      <View style={styles.dateRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Select start date, ${formatDate(startDate)}`}
          onPress={() => { setCalendarTarget('start'); onSetDateTarget('start'); }}
          style={[styles.dateButton, { backgroundColor: colors.card, borderColor: colors.foreground }]}
          testID="start-date-button"
        >
          <Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>FROM DATE</Text>
          <View style={styles.dateButtonBottom}>
            <Text style={[styles.dateValue, { color: colors.foreground }]}>{formatShortDate(startDate)}</Text>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Select end date, ${formatDate(endDate)}`}
          onPress={() => { setCalendarTarget('end'); onSetDateTarget('end'); }}
          style={[styles.dateButton, { backgroundColor: colors.card, borderColor: colors.foreground }]}
          testID="end-date-button"
        >
          <Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>TO DATE</Text>
          <View style={styles.dateButtonBottom}>
            <Text style={[styles.dateValue, { color: colors.primary }]}>{formatShortDate(endDate)}</Text>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          </View>
        </Pressable>
      </View>
      {dateTarget ? (
        <DateTimePicker
          value={dateTarget === 'start' ? startDate : endDate}
          mode="date"
          display={Platform.OS === 'android' ? 'default' : 'compact'}
          maximumDate={new Date()}
          onChange={onChooseDate}
        />
      ) : null}
      <View style={[styles.rangeSummary, { backgroundColor: colors.card, borderColor: colors.foreground }]}>
        <Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>TARGET TIMEFRAME</Text>
        <Text style={[styles.rangeText, { color: colors.foreground }]}>
          {formatDate(startDate).toUpperCase()} - {formatDate(endDate).toUpperCase()}
        </Text>
      </View>
      <View style={[styles.calendarBox, { backgroundColor: colors.card, borderColor: colors.foreground }]}>
        <View style={styles.calendarHeader}>
          <Text style={[styles.calendarMonth, { color: colors.foreground }]}>
            {displayedMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toUpperCase()}
          </Text>
          <View style={styles.calendarArrows}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setDisplayedMonth(new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1))}>
              <Ionicons name="arrow-back" size={17} color={colors.foreground} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setDisplayedMonth(new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1))}>
              <Ionicons name="arrow-forward" size={17} color={colors.foreground} />
            </Pressable>
          </View>
        </View>
        <View style={styles.weekRow}>
          {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((day) => <Text key={day} style={[styles.weekLabel, { color: colors.mutedForeground }]}>{day}</Text>)}
        </View>
        <View style={styles.calendarGrid}>
          {calendarDays.map((day, index) => {
            if (day === null) return <View key={`blank-${index}`} style={styles.calendarCell} />;
            const current = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), day);
            const inRange = current >= new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()) && current <= new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
            const isStart = current.toDateString() === startDate.toDateString();
            const isEnd = current.toDateString() === endDate.toDateString();
            return (
              <Pressable key={`day-${day}`} accessibilityRole="button" accessibilityLabel={`Choose ${formatDate(current)}`} onPress={() => setCalendarDate(day)} style={[styles.calendarCell, inRange ? { backgroundColor: colors.accent } : null, (isStart || isEnd) ? { backgroundColor: colors.primary } : null]}>
                <Text style={[styles.calendarDay, { color: isStart || isEnd ? colors.primaryForeground : colors.foreground }]}>{String(day).padStart(2, '0')}</Text>
                {(isStart || isEnd) ? <View style={[styles.calendarDot, { backgroundColor: colors.primaryForeground }]} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
      <Text style={[styles.shortcutHeading, { color: colors.mutedForeground }]}>HUNT SHORTCUTS</Text>
      <View style={styles.shortcutRow}>
        <Pressable accessibilityRole="button" onPress={() => setShortcut('today')} style={[styles.shortcut, { backgroundColor: colors.card, borderColor: colors.foreground }]}><Ionicons name="today-outline" size={16} color={colors.primary} /><Text style={[styles.shortcutText, { color: colors.foreground }]}>TODAY</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => setShortcut('week')} style={[styles.shortcut, { backgroundColor: colors.primary, borderColor: colors.foreground }]}><Ionicons name="checkmark-circle-outline" size={16} color={colors.primaryForeground} /><Text style={[styles.shortcutText, { color: colors.primaryForeground }]}>LAST 7 DAYS</Text></Pressable>
      </View>
      <View style={styles.shortcutRow}>
        <Pressable accessibilityRole="button" onPress={() => setShortcut('month')} style={[styles.shortcut, { backgroundColor: colors.card, borderColor: colors.foreground }]}><Ionicons name="calendar-outline" size={16} color={colors.primary} /><Text style={[styles.shortcutText, { color: colors.foreground }]}>THIS MONTH</Text></Pressable>
        <View style={[styles.telemetry, { backgroundColor: colors.accent, borderColor: colors.foreground }]}><Ionicons name="locate-outline" size={16} color={colors.primary} /><Text style={[styles.shortcutText, { color: colors.foreground }]}>RADAR READY</Text></View>
      </View>
    </View>
  );
}

function EvidenceCard({
  item,
  colors,
  selected,
  onToggle,
}: {
  item: ArcadeMatch;
  colors: ArcadeColors;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${item.filename}, ${item.wordCount} detected words`}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.evidenceCard,
        { backgroundColor: selected ? colors.accent : colors.card, borderColor: colors.foreground },
        pressed ? styles.pixelButtonPressed : null,
      ]}
      testID={`photo-match-${item.id}`}
    >
      <View style={[styles.evidenceImageFrame, { borderColor: colors.foreground, backgroundColor: colors.muted }]}>
        <Image source={{ uri: item.uri }} style={styles.evidenceImage} resizeMode="cover" accessibilityLabel="Photo preview" />
        <View style={[styles.evidenceTag, { backgroundColor: colors.primary }]}>
          <Text style={[styles.evidenceTagText, { color: colors.primaryForeground }]}>OCR CLUE</Text>
        </View>
        <View style={[styles.checkbox, { backgroundColor: selected ? colors.primary : colors.card, borderColor: colors.foreground }]}>
          {selected ? <Ionicons name="checkmark" size={17} color={colors.primaryForeground} /> : null}
        </View>
      </View>
      <Text numberOfLines={1} style={[styles.filename, { color: colors.foreground }]}>{item.filename.toUpperCase()}</Text>
      <Text style={[styles.evidenceMeta, { color: colors.mutedForeground }]}>
        {formatDate(new Date(item.creationTime))} - {item.wordCount} WORDS
      </Text>
      <Text numberOfLines={2} style={[styles.evidenceText, { color: colors.foreground }]}>
        {item.extractedText || 'TEXT-LIKE CONTENT DETECTED'}
      </Text>
    </Pressable>
  );
}

export function ArcadeMissionShell(props: ArcadeMissionShellProps) {
  const {
    colors,
    matches,
    selected,
    selectedIds,
    allSelected,
    startDate,
    endDate,
    dateTarget,
    isScanning,
    hasScanned,
    permissionLimited,
    progress,
    scanPhase,
    scanWasCancelled,
    onChooseDate,
    onSetDateTarget,
    onSetDateRange,
    onScan,
    onCancel,
    onToggleSelected,
    onToggleAll,
    onDelete,
    onOpenSettings,
  } = props;
  const insets = useSafeAreaInsets();
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const progressPercent = progress.total > 0 ? Math.round((progress.checked / progress.total) * 100) : 0;
  const progressLabel =
    scanPhase === 'retrieving'
      ? 'FINDING PHOTOS IN THIS RANGE...'
      : scanPhase === 'filtering'
        ? `FILTERING PHOTO ${Math.min(progress.checked + 1, progress.total)} OF ${progress.total}`
        : `OCR + FACE CHECK ${Math.min(progress.checked + 1, progress.total)} OF ${progress.total}`;

  const renderItem = useCallback(
    ({ item }: { item: ArcadeMatch }) => (
      <EvidenceCard
        item={item}
        colors={colors}
        selected={Boolean(selected[item.id])}
        onToggle={() => onToggleSelected(item.id)}
      />
    ),
    [colors, onToggleSelected, selected],
  );

  const header = (
    <View>
      <View style={styles.topbar}>
        <View style={[styles.logo, { backgroundColor: colors.primary, borderColor: colors.foreground }]}>
          <Ionicons name="scan-outline" size={24} color={colors.primaryForeground} />
        </View>
        <View style={styles.brandCopy}>
          <Text style={[styles.brandName, { color: colors.foreground }]}>DOCUSWEEP</Text>
          <Text style={[styles.brandMode, { color: colors.primary }]}>{isScanning ? 'QUEST // SCANNING' : hasScanned ? 'EVIDENCE' : 'HUNT'}</Text>
        </View>
        <Pressable onPress={onOpenSettings} accessibilityRole="button" accessibilityLabel="Open photo access settings" style={[styles.iconButton, { backgroundColor: colors.secondary, borderColor: colors.foreground }]}>
          <Ionicons name="settings-outline" size={22} color={colors.foreground} />
        </Pressable>
        <View style={[styles.avatarButton, { backgroundColor: colors.primary, borderColor: colors.foreground }]}>
          <Ionicons name="person-outline" size={20} color={colors.primaryForeground} />
        </View>
      </View>
      <View style={[styles.levelStrip, { backgroundColor: colors.secondary }]}>
        <View style={[styles.levelDot, { backgroundColor: colors.primary }]} />
        <Text style={[styles.hudText, { color: colors.foreground }]}>LVL 01 - APPRENTICE DETECTIVE</Text>
      </View>

      {isScanning ? (
        <View>
          <View style={[styles.missionBanner, { backgroundColor: colors.secondary, borderColor: colors.foreground }]}>
            <Text style={[styles.bannerTitle, { color: colors.primary }]}>SCAN QUEST // STAGE 02</Text>
            <View style={[styles.liveChip, { backgroundColor: colors.primary }]}>
              <ActivityIndicator color={colors.primaryForeground} size="small" />
              <Text style={[styles.liveText, { color: colors.primaryForeground }]}>SCANNING...</Text>
            </View>
          </View>
          <View style={[styles.scanPanel, { backgroundColor: colors.card, borderColor: colors.foreground }]}>
            <View style={[styles.windowBar, { backgroundColor: colors.foreground }]}>
              <Text style={[styles.windowText, { color: colors.background }]}>MISSION: DETECTIVE_CORE.EXE</Text>
              <Text style={[styles.windowText, { color: colors.accent }]}>LOCAL</Text>
            </View>
            <View style={styles.scanStage}>
              <Mascot colors={colors} scanning />
              <View style={styles.scanStageCopy}>
                <Text style={[styles.scanTitle, { color: colors.foreground }]}>HUNTING FOR NOTES...</Text>
                <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>The mini detective is checking each frame.</Text>
              </View>
              <View style={[styles.percentBadge, { backgroundColor: colors.primary, borderColor: colors.foreground }]}>
                <Text style={[styles.percentText, { color: colors.primaryForeground }]}>{progressPercent}%</Text>
              </View>
            </View>
            <View style={[styles.segmentTrack, { backgroundColor: colors.secondary, borderColor: colors.foreground }]}>
              {Array.from({ length: 12 }, (_, index) => (
                <View key={index} style={[styles.segment, { backgroundColor: index < Math.ceil(progressPercent / 100 * 12) ? colors.primary : colors.card }]} />
              ))}
            </View>
            <View style={styles.scanCounterRow}>
              <Text style={[styles.hudText, { color: colors.primary }]}>{progress.checked} / {progress.total} PHOTOS</Text>
              <Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>RUNNING ON-DEVICE</Text>
            </View>
          </View>
          <View style={[styles.logBox, { backgroundColor: colors.secondary, borderColor: colors.foreground }]}>
            <Text style={[styles.kicker, { color: colors.primary }]}>DETECTIVE LOG</Text>
            <Text style={[styles.bodyText, { color: colors.foreground }]}>Interrogating notebooks, receipts and blurry whiteboards...</Text>
            <Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>OCR + FACE FILTER ACTIVE</Text>
          </View>
          <PixelButton color={colors.card} textColor={colors.foreground} icon="stop-circle-outline" onPress={onCancel} testID="cancel-scan-button">CANCEL SCAN MISSION</PixelButton>
          <View style={styles.progressCaption}>
            <Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>{progressLabel}</Text>
          </View>
        </View>
      ) : hasScanned ? (
        <View>
          <View style={[styles.resultsHero, { backgroundColor: colors.secondary, borderColor: colors.foreground }]}>
            <Text style={[styles.kicker, { color: colors.primary }]}>SCAN COMPLETE // TARGET LOCKED</Text>
            <Text style={[styles.resultsCount, { color: colors.foreground }]}>{matches.length} CLUES SPOTTED!</Text>
            <Text style={[styles.bodyText, { color: colors.foreground }]}>
              OCR isolated document-like photos. Faces were filtered before review.
            </Text>
          </View>
          <View style={styles.resultsControls}>
            <PixelButton color={colors.primary} textColor={colors.primaryForeground} icon="checkmark-done-outline" onPress={onToggleAll} testID="select-all-button">
              {allSelected ? 'CLEAR ALL' : `SELECT ALL (${matches.length})`}
            </PixelButton>
            <Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>{selectedIds.length} MARKED</Text>
          </View>
        </View>
      ) : (
        <View>
          <View style={[styles.missionBanner, { backgroundColor: colors.secondary, borderColor: colors.foreground }]}>
            <View style={styles.bannerCopy}>
              <Text style={[styles.kicker, { color: colors.primary }]}>MISSION SELECT</Text>
              <Text style={[styles.bannerHeading, { color: colors.foreground }]}>CHOOSE HUNT</Text>
            </View>
            <View style={[styles.sectorChip, { backgroundColor: colors.card, borderColor: colors.foreground }]}>
              <Ionicons name="locate-outline" size={17} color={colors.primary} />
              <Text style={[styles.tinyLabel, { color: colors.foreground }]}>SECTOR: 01</Text>
            </View>
          </View>
          <View style={[styles.mascotDialogue, { backgroundColor: colors.card, borderColor: colors.foreground }]}>
            <Mascot colors={colors} />
            <View style={styles.dialogueCopy}>
              <Text style={[styles.kicker, { color: colors.primary }]}>ROOKIE DETECTIVE CHIP</Text>
              <Text style={[styles.bodyText, { color: colors.foreground }]}>{'"Narrow the timeline so I do not have to sift through 10,000 selfies, boss!"'}</Text>
            </View>
          </View>
          <DateControls
            colors={colors}
            startDate={startDate}
            endDate={endDate}
            dateTarget={dateTarget}
            onChooseDate={onChooseDate}
            onSetDateTarget={onSetDateTarget}
            onSetDateRange={onSetDateRange}
          />
          <PixelButton color={colors.primary} textColor={colors.primaryForeground} icon="scan-outline" onPress={onScan} disabled={isScanning} testID="scan-gallery-button">START SCANNING</PixelButton>
          <View style={styles.privacyLine}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
            <Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>LOCAL MACHINE LEARNING</Text>
            <Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>NO CLOUD UPLOAD</Text>
          </View>
          {permissionLimited ? (
            <View style={[styles.limitedNotice, { backgroundColor: colors.accent, borderColor: colors.foreground }]}>
              <Ionicons name="information-circle-outline" size={17} color={colors.foreground} />
              <Text style={[styles.bodyText, { color: colors.foreground }]}>Limited gallery access is active.</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <FlatList
        data={hasScanned ? matches : []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.evidenceRow}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) + (selectedIds.length ? 88 : 24) }}
        ListHeaderComponent={header}
        ListEmptyComponent={hasScanned ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.foreground }]}>
            <Mascot colors={colors} />
            <Text style={[styles.bannerHeading, { color: colors.foreground }]}>{scanWasCancelled ? 'SCAN PAUSED' : 'NO CLUES FOUND'}</Text>
            <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
              {scanWasCancelled ? 'Checked photos are shown above. Resume whenever you are ready.' : 'No document-like matches were detected in this scan range.'}
            </Text>
          </View>
        ) : null}
      />
      {selectedIds.length > 0 ? (
        <View style={[styles.bottomBar, { backgroundColor: colors.card, borderColor: colors.foreground, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View>
            <Text style={[styles.resultsCountSmall, { color: colors.foreground }]}>{selectedIds.length}</Text>
            <Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>CLUES MARKED</Text>
          </View>
          <PixelButton color={colors.primary} textColor={colors.primaryForeground} icon="trash-outline" onPress={() => setCleanupOpen(true)} testID="delete-selected-button">PURGE EVIDENCE</PixelButton>
        </View>
      ) : null}
      <Modal
        visible={cleanupOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCleanupOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.cleanupModal, { backgroundColor: colors.secondary, borderColor: colors.foreground }]}>
            <View style={[styles.checkerStrip, { backgroundColor: colors.primary }]} />
            <Text style={[styles.kicker, { color: colors.primary }]}>HIGH STAKES ACTION</Text>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>PERMANENT DELETION?</Text>
            <View style={[styles.modalCopy, { backgroundColor: colors.card, borderColor: colors.foreground }]}>
              <Text style={[styles.bodyText, { color: colors.foreground }]}>You are about to send <Text style={{ color: colors.primary, fontWeight: '800' }}>{selectedIds.length} photo{selectedIds.length === 1 ? '' : 's'}</Text> to Android's deletion flow.</Text>
              <Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>This action cannot be undone by DocuSweep.</Text>
            </View>
            <PixelButton color={colors.primary} textColor={colors.primaryForeground} icon="trash-outline" onPress={() => { setCleanupOpen(false); onDelete(); }}>{`CONFIRM DELETE (${selectedIds.length})`}</PixelButton>
            <PixelButton color={colors.card} textColor={colors.foreground} icon="shield-checkmark-outline" onPress={() => setCleanupOpen(false)}>CANCEL AND KEEP SAFE</PixelButton>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  logo: { width: 44, height: 44, borderWidth: 2, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  brandCopy: { flex: 1 },
  brandName: { fontFamily: 'monospace', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  brandMode: { fontFamily: 'monospace', fontSize: 9, fontWeight: '800', letterSpacing: 1.3, marginTop: 2 },
  iconButton: { width: 44, height: 44, borderWidth: 2, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  avatarButton: { width: 44, height: 44, borderWidth: 2, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  levelStrip: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 5, marginBottom: 10 },
  levelDot: { width: 8, height: 8, borderRadius: 4 },
  hudText: { fontFamily: 'monospace', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  missionBanner: { minHeight: 78, borderWidth: 2, borderRadius: 4, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, shadowColor: '#32252A', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
  bannerCopy: { flex: 1 },
  bannerTitle: { fontFamily: 'monospace', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  bannerHeading: { fontFamily: 'monospace', fontSize: 23, fontWeight: '800', letterSpacing: 0.5, marginTop: 2 },
  sectorChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 7, borderWidth: 2, borderRadius: 2 },
  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 2, borderColor: '#32252A' },
  liveText: { fontFamily: 'monospace', fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  scanPanel: { borderWidth: 2, borderRadius: 5, overflow: 'hidden', marginBottom: 12, shadowColor: '#32252A', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
  windowBar: { paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between' },
  windowText: { fontFamily: 'monospace', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  scanStage: { padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  scanStageCopy: { flex: 1 },
  scanTitle: { fontFamily: 'monospace', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  percentBadge: { paddingHorizontal: 8, paddingVertical: 9, borderWidth: 2 },
  percentText: { fontFamily: 'monospace', fontSize: 15, fontWeight: '800' },
  mascot: { width: 58, height: 58, borderWidth: 2, borderRadius: 4, alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 },
  mascotGlass: { position: 'absolute', right: 3, bottom: 3 },
  mascotTag: { position: 'absolute', bottom: -7, right: -5, paddingHorizontal: 4, paddingVertical: 2, borderWidth: 1, borderColor: '#32252A' },
  mascotTagText: { fontFamily: 'monospace', fontSize: 7, fontWeight: '800' },
  segmentTrack: { height: 20, padding: 3, borderWidth: 2, flexDirection: 'row', gap: 3, marginHorizontal: 13 },
  segment: { flex: 1 },
  scanCounterRow: { paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between' },
  logBox: { borderWidth: 2, borderRadius: 4, padding: 12, gap: 7, marginBottom: 12 },
  progressCaption: { paddingVertical: 8 },
  dateCard: { borderWidth: 2, borderRadius: 4, padding: 12, marginBottom: 12, shadowColor: '#32252A', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardHeaderCopy: { flex: 1 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  kicker: { fontFamily: 'monospace', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  recordLabel: { fontFamily: 'monospace', fontSize: 9, fontWeight: '800' },
  cardSubtitle: { fontSize: 11, marginTop: 4 },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateButton: { flex: 1, minHeight: 62, borderWidth: 2, borderRadius: 3, padding: 9, justifyContent: 'space-between' },
  tinyLabel: { fontFamily: 'monospace', fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  dateButtonBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  dateValue: { fontFamily: 'monospace', fontSize: 11, fontWeight: '800' },
  rangeSummary: { marginTop: 9, borderWidth: 2, borderRadius: 3, padding: 9 },
  rangeText: { fontFamily: 'monospace', fontSize: 12, fontWeight: '800', marginTop: 4 },
  calendarBox: { marginTop: 10, borderWidth: 2, borderRadius: 3, padding: 9 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  calendarMonth: { fontFamily: 'monospace', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  calendarArrows: { flexDirection: 'row', gap: 12 },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekLabel: { flex: 1, textAlign: 'center', fontFamily: 'monospace', fontSize: 8, fontWeight: '800' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  calendarCell: { width: '13.8%', minHeight: 30, alignItems: 'center', justifyContent: 'center' },
  calendarDay: { fontFamily: 'monospace', fontSize: 9, fontWeight: '800' },
  calendarDot: { width: 3, height: 3, borderRadius: 2, marginTop: 2 },
  shortcutHeading: { fontFamily: 'monospace', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 12, marginBottom: 6 },
  shortcutRow: { flexDirection: 'row', gap: 7, marginBottom: 7 },
  shortcut: { flex: 1, minHeight: 42, borderWidth: 2, borderRadius: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  shortcutText: { fontFamily: 'monospace', fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  telemetry: { flex: 1, minHeight: 42, borderWidth: 2, borderRadius: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  pixelButton: { minHeight: 50, borderWidth: 2, borderColor: '#32252A', borderRadius: 4, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#32252A', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3, marginBottom: 10 },
  pixelButtonPressed: { transform: [{ translateX: 2 }, { translateY: 2 }], shadowOffset: { width: 1, height: 1 } },
  pixelButtonText: { fontFamily: 'monospace', fontSize: 11, fontWeight: '800', letterSpacing: 0.7 },
  privacyLine: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 12 },
  limitedNotice: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, borderWidth: 2, borderRadius: 3, marginBottom: 12 },
  mascotDialogue: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderRadius: 4, padding: 10, marginBottom: 12, shadowColor: '#32252A', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
  dialogueCopy: { flex: 1, gap: 5 },
  bodyText: { fontSize: 13, lineHeight: 19 },
  resultsHero: { borderWidth: 2, borderRadius: 4, padding: 13, marginBottom: 10, shadowColor: '#32252A', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
  resultsCount: { fontFamily: 'monospace', fontSize: 23, fontWeight: '800', marginVertical: 6 },
  resultsControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  evidenceRow: { gap: 8, alignItems: 'stretch' },
  evidenceCard: { flex: 1, minWidth: 0, borderWidth: 2, borderRadius: 4, padding: 6, marginBottom: 10, shadowColor: '#32252A', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
  evidenceImageFrame: { height: 142, borderWidth: 2, borderRadius: 2, overflow: 'hidden', position: 'relative' },
  evidenceImage: { width: '100%', height: '100%' },
  evidenceTag: { position: 'absolute', top: 6, left: 6, paddingHorizontal: 5, paddingVertical: 3, borderWidth: 1, borderColor: '#32252A' },
  evidenceTagText: { fontFamily: 'monospace', fontSize: 8, fontWeight: '800' },
  checkbox: { position: 'absolute', top: 6, right: 6, width: 25, height: 25, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  filename: { fontFamily: 'monospace', fontSize: 9, fontWeight: '800', marginTop: 7 },
  evidenceMeta: { fontFamily: 'monospace', fontSize: 8, marginTop: 4 },
  evidenceText: { fontSize: 10, lineHeight: 14, marginTop: 5 },
  emptyCard: { borderWidth: 2, borderRadius: 4, padding: 22, alignItems: 'center', gap: 10, marginTop: 6 },
  bottomBar: { borderTopWidth: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 16, paddingTop: 10 },
  resultsCountSmall: { fontFamily: 'monospace', fontSize: 24, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(50, 37, 42, 0.72)', justifyContent: 'center', padding: 20 },
  cleanupModal: { borderWidth: 2, borderRadius: 5, padding: 14, shadowColor: '#32252A', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
  checkerStrip: { height: 8, marginBottom: 12 },
  modalTitle: { fontFamily: 'monospace', fontSize: 20, fontWeight: '800', marginBottom: 10 },
  modalCopy: { borderWidth: 2, borderRadius: 3, padding: 11, gap: 8, marginBottom: 12 },
});
