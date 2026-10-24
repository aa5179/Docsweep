import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  FlatList,
  Image,
  InteractionManager,
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
  isScanning: boolean;
  hasScanned: boolean;
  permissionLimited: boolean;
  progress: { checked: number; total: number };
  scanPhase: 'retrieving' | 'filtering' | 'ocr';
  scanWasCancelled: boolean;
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

const questArtworkUri =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDN-sVaqCYT4zGaWCBdSUZn_CcyGh24gJDeMnps_41qP6CvNpJY-7967oo2Bv4LWAQd9YsKHgpIRxxkkHpODO_GV_5KbeMQakv1Qi9VEeWFED9Mo5CLZ7xx_Che7_QGGfFq9VOtbsp4e7Bxk2SqNHD0jqAXn2HvEDxnIIt6acbMC4yW9Y5B4iJYLRQm5zodxOB4BjazQKBzrgIKY5FaNUCzx9e4ZvpWr8I0gHCGz_zzlvlC6JI3XHA4fw';
const scanningArtworkUri =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDBI91XbCfivOt58BTKLbIwMRnUVEDG09AxBx3CPOtvnRTKtcMk6xUHnAjqSH_3wn3Cu4Izou3jH9RsXkEJlG3aFb6kd-NK1c-ZTtDX5IeUKQVlgiRXnF9l5QO8R9woBXi-uRQqVFp0NzOojMXUMcg-yvTLMHokLidyTniP4AJNGftyVSc9agtQPX6fHow_gNK431v1NcuyCqdNP16ysPfdHsZoa8uaJmuPKh_smGDcIuIdEGcegxTEKQ';

function BottomNavigation({
  colors,
  active,
  onSelect,
}: {
  colors: ArcadeColors;
  active: 'quest' | 'hunt' | 'evidence' | 'cleanup';
  onSelect: (page: 'quest' | 'hunt' | 'evidence' | 'cleanup') => void;
}) {
  const items: Array<{
    key: 'quest' | 'hunt' | 'evidence' | 'cleanup';
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }> = [
    { key: 'quest', label: 'QUEST', icon: 'search-outline' },
    { key: 'hunt', label: 'HUNT', icon: 'calendar-outline' },
    { key: 'evidence', label: 'EVIDENCE', icon: 'folder-outline' },
    { key: 'cleanup', label: 'CLEANUP', icon: 'trash-outline' },
  ];

  return (
    <View style={[styles.bottomNav, { backgroundColor: colors.card, borderTopColor: colors.secondary }]}>
      {items.map((item) => {
        const selected = item.key === active;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.label.toLowerCase()} page`}
            onPress={() => onSelect(item.key)}
            style={[
              styles.bottomNavItem,
              selected && { backgroundColor: colors.primary, borderColor: colors.foreground },
            ]}
          >
            {item.key === 'evidence' ? (
              <View style={[styles.newBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.newBadgeText, { color: colors.primaryForeground }]}>NEW</Text>
              </View>
            ) : null}
            <Ionicons name={item.icon} size={21} color={selected ? colors.primaryForeground : colors.foreground} />
            <Text style={[styles.bottomNavLabel, { color: selected ? colors.primaryForeground : colors.foreground }]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function QuestPage({
  colors,
  startDate,
  endDate,
  onSetDateRange,
  onScan,
}: Pick<ArcadeMissionShellProps, 'colors' | 'startDate' | 'endDate' | 'onSetDateRange' | 'onScan'>) {
  const today = new Date();
  const setRange = (kind: 'week' | 'month' | 'all') => {
    if (kind === 'all') {
      onSetDateRange(new Date(1970, 0, 1), today);
    } else if (kind === 'month') {
      onSetDateRange(new Date(today.getFullYear(), today.getMonth(), 1), today);
    } else {
      onSetDateRange(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000), today);
    }
  };

  return (
    <View>
      <View style={[styles.questStage, { backgroundColor: colors.secondary, borderColor: colors.foreground }]}>
        <View style={styles.questStageBar}>
          <View style={styles.stageDots}>
            <View style={[styles.stageDot, { backgroundColor: colors.primary }]} />
            <View style={[styles.stageDot, { backgroundColor: colors.accent }]} />
            <View style={[styles.stageDot, { backgroundColor: colors.mutedForeground }]} />
            <Text style={[styles.tinyLabel, { color: colors.foreground }]}>STAGE: NOTEBOOK RECON</Text>
          </View>
          <Text style={[styles.tinyLabel, { color: colors.primary }]}>LVL.01</Text>
        </View>
        <View style={[styles.questArtwork, { backgroundColor: colors.muted, borderColor: colors.foreground }]}>
          <Image source={{ uri: questArtworkUri }} style={styles.referenceArtwork} resizeMode="cover" accessibilityLabel="Retro detective artwork" />
        </View>
        <View style={styles.questTitle}>
          <Text style={[styles.alertLabel, { backgroundColor: colors.accent, color: colors.foreground }]}>ALERT: STORAGE CLOGGED</Text>
          <Text style={[styles.questHeading, { color: colors.foreground }]}>YOUR GALLERY IS A MESS.</Text>
          <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>Let's hunt down sneaky whiteboard snaps, expired tickets and crumpled receipts.</Text>
        </View>
        <View style={styles.questStats}>
          <View style={[styles.questStat, { backgroundColor: colors.muted }]}><Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>QUEST LVL</Text><Text style={[styles.statValue, { color: colors.primary }]}>01</Text></View>
          <View style={[styles.questStat, { backgroundColor: colors.muted }]}><Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>EVIDENCE POOL</Text><Text style={[styles.statValue, { color: colors.foreground }]}>READY</Text></View>
          <View style={[styles.questStat, { backgroundColor: colors.muted }]}><Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>DETECTIVE</Text><Text style={[styles.tinyLabel, { color: colors.primary }]}>ROOKIE</Text></View>
        </View>
      </View>
      <PixelButton color={colors.primary} textColor={colors.primaryForeground} icon="radio-outline" onPress={onScan} testID="quest-start-scan-button">START SCANNING  ►</PixelButton>
      <View style={[styles.questRange, { backgroundColor: colors.secondary, borderColor: colors.foreground }]}>
        <View style={styles.questRangeHeader}>
          <View style={styles.kickerRow}><Ionicons name="navigate-outline" size={18} color={colors.primary} /><Text style={[styles.kicker, { color: colors.foreground }]}>CHOOSE HUNT RANGE</Text></View>
          <Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>EDIT</Text>
        </View>
        <View style={[styles.questRangeValue, { backgroundColor: colors.card, borderColor: colors.foreground }]}>
          <View><Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>TARGET TIMEFRAME</Text><Text style={[styles.rangeText, { color: colors.foreground }]}>{formatShortDate(startDate)} - {formatShortDate(endDate)}</Text></View>
          <Ionicons name="calendar-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.scopeRow}>
          <Pressable onPress={() => setRange('week')} style={[styles.scopeChip, { backgroundColor: colors.primary }]}><Text style={[styles.tinyLabel, { color: colors.primaryForeground }]}>LAST 7 DAYS</Text></Pressable>
          <Pressable onPress={() => setRange('month')} style={[styles.scopeChip, { backgroundColor: colors.muted }]}><Text style={[styles.tinyLabel, { color: colors.foreground }]}>THIS MONTH</Text></Pressable>
          <Pressable onPress={() => setRange('all')} style={[styles.scopeChip, { backgroundColor: colors.muted }]}><Text style={[styles.tinyLabel, { color: colors.foreground }]}>ALL TIME</Text></Pressable>
        </View>
        <View style={styles.questActions}>
          <Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>LOCAL MACHINE LEARNING  •  NO CLOUD UPLOAD</Text>
        </View>
      </View>
      <View style={styles.sideQuestSection}>
        <View style={styles.sideQuestHeader}><Text style={[styles.kicker, { color: colors.foreground }]}>ACTIVE SIDE QUESTS</Text><Text style={[styles.tinyLabel, { color: colors.primary }]}>2 AVAILABLE</Text></View>
        <View style={[styles.sideQuest, { backgroundColor: colors.muted }]}><Ionicons name="school-outline" size={22} color={colors.primary} /><View style={styles.sideQuestCopy}><Text style={[styles.sideQuestTitle, { color: colors.foreground }]}>FIND LECTURE NOTES</Text><Text style={[styles.bodyText, { color: colors.mutedForeground }]}>Clear chalkboard shots and handouts</Text></View><Text style={[styles.xpBadge, { backgroundColor: colors.secondary, color: colors.primary }]}>+150 XP</Text></View>
        <View style={[styles.sideQuest, { backgroundColor: colors.muted }]}><Ionicons name="receipt-outline" size={22} color={colors.primary} /><View style={styles.sideQuestCopy}><Text style={[styles.sideQuestTitle, { color: colors.foreground }]}>EXPIRED PARKING BILLS</Text><Text style={[styles.bodyText, { color: colors.mutedForeground }]}>Purge old meters and transit tickets</Text></View><Text style={[styles.xpBadge, { backgroundColor: colors.secondary, color: colors.primary }]}>+200 XP</Text></View>
      </View>
    </View>
  );
}

function CleanupPage({
  colors,
  matches,
  selectedIds,
  selected,
  onToggleSelected,
  onToggleAll,
  onDelete,
}: Pick<ArcadeMissionShellProps, 'colors' | 'matches' | 'selectedIds' | 'selected' | 'onToggleSelected' | 'onToggleAll' | 'onDelete'>) {
  return (
    <View>
      <View style={[styles.cleanupHero, { backgroundColor: colors.secondary, borderColor: colors.foreground }]}>
        <Ionicons name="skull-outline" size={26} color={colors.primary} />
        <View style={styles.cleanupHeroCopy}><Text style={[styles.tinyLabel, { color: colors.primary }]}>ENCOUNTER STAGE 05</Text><Text style={[styles.bannerHeading, { color: colors.foreground }]}>FINAL BOSS: CLUTTER</Text></View>
        <Text style={[styles.levelBadge, { backgroundColor: colors.primary, color: colors.primaryForeground }]}>LEVEL 99</Text>
        <View style={styles.hpRow}><Text style={[styles.tinyLabel, { color: colors.primary }]}>CLUTTER HP</Text><Text style={[styles.tinyLabel, { color: colors.foreground }]}>{selectedIds.length} MARKED</Text></View>
        <View style={[styles.hpTrack, { backgroundColor: colors.card, borderColor: colors.foreground }]}>{Array.from({ length: 4 }, (_, index) => <View key={index} style={[styles.hpSegment, { backgroundColor: index < Math.min(selectedIds.length, 4) ? colors.primary : colors.muted }]} />)}</View>
        <View style={[styles.cleanupDialogue, { backgroundColor: colors.card, borderColor: colors.foreground }]}><Mascot colors={colors} scanning /><Text style={[styles.bodyText, { color: colors.foreground }]}>Ready for the final sweep. Double-check the OCR evidence before we shred it permanently.</Text></View>
      </View>
      <View style={styles.evidenceListHeader}><Text style={[styles.resultsCount, { color: colors.foreground }]}>EVIDENCE LIST</Text><Text style={[styles.tinyLabel, { color: colors.primary }]}>{selectedIds.length} MARKED</Text></View>
      <PixelButton color={colors.card} textColor={colors.foreground} icon="checkmark-done-outline" onPress={onToggleAll}>RESTORE ALL</PixelButton>
      {matches.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: Boolean(selected[item.id]) }}
          onPress={() => onToggleSelected(item.id)}
          style={[styles.cleanupEvidenceCard, { backgroundColor: colors.secondary, borderColor: colors.foreground }]}
        >
          <View style={[styles.cleanupThumb, { borderColor: colors.foreground, backgroundColor: colors.muted }]}>
            <Image source={{ uri: item.uri }} style={styles.evidenceImage} resizeMode="cover" accessibilityLabel="Photo preview" />
          </View>
          <View style={styles.cleanupEvidenceCopy}>
            <View style={styles.cleanupEvidenceTop}>
              <Text style={[styles.evidenceTagText, { backgroundColor: colors.primary, color: colors.primaryForeground }]}>OCR CLUE</Text>
              <Text style={[styles.tinyLabel, { color: colors.foreground }]}>{item.filename.toUpperCase()}</Text>
            </View>
            <Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>DETECTED OCR</Text>
            <Text numberOfLines={2} style={[styles.bodyText, { color: colors.foreground }]}>{item.extractedText || 'TEXT-LIKE CONTENT DETECTED'}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => onToggleSelected(item.id)}
              style={[styles.keepSafeButton, { backgroundColor: colors.card, borderColor: colors.foreground }]}
            >
              <Ionicons name="bookmark-outline" size={14} color={colors.primary} />
              <Text style={[styles.tinyLabel, { color: colors.foreground }]}>KEEP SAFE</Text>
            </Pressable>
          </View>
        </Pressable>
      ))}
      {selectedIds.length > 0 ? <PixelButton color={colors.primary} textColor={colors.primaryForeground} icon="warning-outline" onPress={onDelete}>{`SUMMON TRASH SWEEPER (DELETE ${selectedIds.length})`}</PixelButton> : null}
    </View>
  );
}

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
  onSetDateRange,
}: Pick<
  ArcadeMissionShellProps,
  | 'colors'
  | 'startDate'
  | 'endDate'
  | 'onSetDateRange'
>) {
  const [displayedMonth, setDisplayedMonth] = useState(
    () => new Date(startDate.getFullYear(), startDate.getMonth(), 1),
  );
  const [calendarTarget, setCalendarTarget] = useState<'start' | 'end'>('start');
  const [showYearChooser, setShowYearChooser] = useState(false);
  const [yearPageStart, setYearPageStart] = useState(
    () => Math.floor(startDate.getFullYear() / 12) * 12,
  );

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

  const chooseYear = (year: number) => {
    const month = displayedMonth.getMonth();
    const day = Math.min(
      displayedMonth.getDate(),
      new Date(year, month + 1, 0).getDate(),
    );
    setDisplayedMonth(new Date(year, month, day));
    setShowYearChooser(false);
  };

  const setShortcut = (kind: 'today' | 'week' | 'month') => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (kind === 'today') onSetDateRange(today, now);
    if (kind === 'week') onSetDateRange(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000), now);
    if (kind === 'month') onSetDateRange(new Date(today.getFullYear(), today.getMonth(), 1), now);
    setDisplayedMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const resetToAllTime = () => {
    onSetDateRange(new Date(1970, 0, 1), new Date());
    setDisplayedMonth(new Date());
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
          onPress={() => setCalendarTarget('start')}
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
          onPress={() => setCalendarTarget('end')}
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
      <View style={[styles.calendarBox, { backgroundColor: colors.card, borderColor: colors.foreground }]}>
        <View style={styles.calendarHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose calendar year"
            onPress={() => {
              setYearPageStart(Math.floor(displayedMonth.getFullYear() / 12) * 12);
              setShowYearChooser((current) => !current);
            }}
          >
            <Text style={[styles.calendarMonth, { color: colors.foreground }]}>
              {displayedMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toUpperCase()}
            </Text>
          </Pressable>
          <View style={styles.calendarArrows}>
            <View style={[styles.archiveChip, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.tinyLabel, { color: colors.foreground }]}>ARCHIVE</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setDisplayedMonth(new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1))}>
              <Ionicons name="arrow-back" size={17} color={colors.foreground} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setDisplayedMonth(new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1))}>
              <Ionicons name="arrow-forward" size={17} color={colors.foreground} />
            </Pressable>
          </View>
        </View>
        {showYearChooser ? (
          <View style={[styles.yearChooser, { borderColor: colors.foreground }]}>
            <View style={styles.yearChooserHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous years"
                onPress={() => setYearPageStart((current) => current - 12)}
              >
                <Ionicons name="arrow-back" size={17} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>SELECT YEAR</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next years"
                onPress={() => setYearPageStart((current) => current + 12)}
              >
                <Ionicons name="arrow-forward" size={17} color={colors.foreground} />
              </Pressable>
            </View>
            <View style={styles.yearGrid}>
              {Array.from({ length: 12 }, (_, index) => yearPageStart + index).map((year) => {
                const selectedYear = year === displayedMonth.getFullYear();
                return (
                  <Pressable
                    key={year}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose ${year}`}
                    onPress={() => chooseYear(year)}
                    style={[
                      styles.yearCell,
                      { backgroundColor: selectedYear ? colors.primary : colors.card },
                    ]}
                  >
                    <Text style={[styles.calendarDay, { color: selectedYear ? colors.primaryForeground : colors.foreground }]}>
                      {year}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
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
        <Pressable accessibilityRole="button" onPress={() => setShortcut('week')} style={[styles.shortcut, { backgroundColor: colors.accent, borderColor: colors.foreground }]}><Ionicons name="school-outline" size={16} color={colors.primary} /><Text style={[styles.shortcutText, { color: colors.foreground }]}>EXAM WEEK</Text></Pressable>
      </View>
      <PixelButton color={colors.primary} textColor={colors.primaryForeground} icon="arrow-forward" onPress={() => undefined}>APPLY HUNT RANGE</PixelButton>
      <Pressable accessibilityRole="button" onPress={resetToAllTime} style={styles.resetButton}>
        <Ionicons name="refresh-outline" size={16} color={colors.foreground} />
        <Text style={[styles.shortcutText, { color: colors.foreground }]}>RESET TO ALL TIME</Text>
      </Pressable>
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
    isScanning,
    hasScanned,
    permissionLimited,
    progress,
    scanPhase,
    scanWasCancelled,
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
  const [page, setPage] = useState<'quest' | 'hunt' | 'evidence' | 'cleanup'>(
    hasScanned ? 'evidence' : isScanning ? 'quest' : 'quest',
  );
  useEffect(() => {
    if (isScanning) setPage('quest');
    else if (hasScanned) setPage('evidence');
  }, [hasScanned, isScanning]);
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

      {page === 'quest' && !isScanning && !hasScanned ? (
        <QuestPage
          colors={colors}
          startDate={startDate}
          endDate={endDate}
          onSetDateRange={onSetDateRange}
          onScan={onScan}
        />
      ) : page === 'cleanup' ? (
        <CleanupPage
          colors={colors}
          matches={matches}
          selectedIds={selectedIds}
          selected={selected}
          onToggleSelected={onToggleSelected}
          onToggleAll={onToggleAll}
          onDelete={onDelete}
        />
      ) : isScanning ? (
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
              <Text style={[styles.windowText, { color: colors.background }]}>MISSION: DETECTIVE_CORE_V2.EXE</Text>
              <Text style={[styles.windowText, { color: colors.accent }]}>OCR_PASS_02</Text>
            </View>
            <View style={styles.scanStage}>
              <Image source={{ uri: scanningArtworkUri }} style={styles.scanArtwork} resizeMode="cover" accessibilityLabel="Retro scanning detective artwork" />
              <Mascot colors={colors} scanning />
              <View style={styles.scanStageCopy}>
                <Text style={[styles.scanTitle, { color: colors.foreground }]}>HUNTING FOR NOTES...</Text>
                <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>The mini detective is scanning frame-by-frame.</Text>
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
            <Text style={[styles.bodyText, { color: colors.foreground }]}>Interrogating blurry whiteboards, spiral notebooks and grocery bills...</Text>
            <Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>RUNNING 100% LOCALLY ON-DEVICE  •  NO DATA SENT</Text>
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
              OCR scan isolated {matches.length} notes, slides and receipts for review.
            </Text>
          </View>
          <View style={styles.resultsControls}>
            <PixelButton color={colors.primary} textColor={colors.primaryForeground} icon="checkmark-done-outline" onPress={onToggleAll} testID="select-all-button">
              {allSelected ? 'CLEAR ALL' : `SELECT ALL (${matches.length})`}
            </PixelButton>
            <PixelButton color={colors.card} textColor={colors.foreground} icon="funnel-outline" onPress={() => undefined}>CONFIDENCE ▼</PixelButton>
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
        contentContainerStyle={{ padding: 16, paddingBottom: 104 + Math.max(insets.bottom, 16) }}
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
      <BottomNavigation
        colors={colors}
        active={page}
        onSelect={(nextPage) => {
          if (nextPage === 'hunt') setPage('hunt');
          else if (nextPage === 'cleanup') setPage('cleanup');
          else if (nextPage === 'evidence' && hasScanned) setPage('evidence');
          else if (nextPage === 'quest') setPage('quest');
        }}
      />
      {selectedIds.length > 0 ? (
        <View style={[styles.bottomBar, { backgroundColor: colors.card, borderColor: colors.foreground, bottom: 72 + Math.max(insets.bottom, 0) }]}>
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
              <Text style={[styles.bodyText, { color: colors.foreground }]}>You are about to permanently delete <Text style={{ color: colors.primary, fontWeight: '800' }}>{selectedIds.length} photo{selectedIds.length === 1 ? '' : 's'}</Text> directly from your device gallery.</Text>
              <Text style={[styles.tinyLabel, { color: colors.mutedForeground }]}>This action cannot be undone by Deputy Snoop.</Text>
            </View>
            <PixelButton
              color={colors.primary}
              textColor={colors.primaryForeground}
              icon="trash-outline"
              onPress={() => {
                setCleanupOpen(false);
                InteractionManager.runAfterInteractions(onDelete);
              }}
            >{`CONFIRM DELETE (${selectedIds.length})`}</PixelButton>
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
  brandName: { fontFamily: 'SpaceMono_700Bold', fontSize: 18, letterSpacing: 1 },
  brandMode: { fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 1.3, marginTop: 2 },
  iconButton: { width: 44, height: 44, borderWidth: 2, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  avatarButton: { width: 44, height: 44, borderWidth: 2, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  levelStrip: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 5, marginBottom: 10 },
  levelDot: { width: 8, height: 8, borderRadius: 4 },
  hudText: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1 },
  missionBanner: { minHeight: 78, borderRadius: 4, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, boxShadow: '3px 3px 0px #32252A' },
  bannerCopy: { flex: 1 },
  bannerTitle: { fontFamily: 'SpaceMono_700Bold', fontSize: 11, letterSpacing: 1 },
  bannerHeading: { fontFamily: 'SpaceMono_700Bold', fontSize: 23, letterSpacing: 0.5, marginTop: 2 },
  sectorChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 7, borderRadius: 2, boxShadow: '2px 2px 0px #32252A' },
  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 2, borderColor: '#32252A' },
  liveText: { fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.7 },
  scanPanel: { borderWidth: 1.5, borderRadius: 5, overflow: 'hidden', marginBottom: 12, boxShadow: '3px 3px 0px #32252A' },
  windowBar: { paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between' },
  windowText: { fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.6 },
  scanStage: { padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  scanArtwork: { width: 72, height: 72, borderWidth: 1.5, borderColor: '#32252A', borderRadius: 4, opacity: 0.82 },
  scanStageCopy: { flex: 1 },
  scanTitle: { fontFamily: 'SpaceMono_700Bold', fontSize: 15, letterSpacing: 0.5 },
  percentBadge: { paddingHorizontal: 8, paddingVertical: 9, borderWidth: 2 },
  percentText: { fontFamily: 'SpaceMono_700Bold', fontSize: 15 },
  mascot: { width: 58, height: 58, borderWidth: 2, borderRadius: 4, alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 },
  mascotGlass: { position: 'absolute', right: 3, bottom: 3 },
  mascotTag: { position: 'absolute', bottom: -7, right: -5, paddingHorizontal: 4, paddingVertical: 2, borderWidth: 1, borderColor: '#32252A' },
  mascotTagText: { fontFamily: 'SpaceMono_700Bold', fontSize: 7 },
  segmentTrack: { height: 20, padding: 3, borderWidth: 2, flexDirection: 'row', gap: 3, marginHorizontal: 13 },
  segment: { flex: 1 },
  scanCounterRow: { paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between' },
  logBox: { borderWidth: 2, borderRadius: 4, padding: 12, gap: 7, marginBottom: 12 },
  progressCaption: { paddingVertical: 8 },
  dateCard: { borderRadius: 4, padding: 12, marginBottom: 12, boxShadow: '3px 3px 0px #32252A' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardHeaderCopy: { flex: 1 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  kicker: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1.1 },
  recordLabel: { fontFamily: 'SpaceMono_700Bold', fontSize: 9 },
  cardSubtitle: { fontFamily: 'NunitoSans_600SemiBold', fontSize: 11, marginTop: 4 },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateButton: { flex: 1, minHeight: 62, borderWidth: 1.5, borderRadius: 3, padding: 9, justifyContent: 'space-between', boxShadow: '2px 2px 0px #32252A' },
  tinyLabel: { fontFamily: 'SpaceMono_700Bold', fontSize: 8, letterSpacing: 0.8 },
  dateButtonBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  dateValue: { fontFamily: 'SpaceMono_700Bold', fontSize: 11 },
  rangeSummary: { marginTop: 9, borderWidth: 2, borderRadius: 3, padding: 9 },
  rangeText: { fontFamily: 'SpaceMono_700Bold', fontSize: 12, marginTop: 4 },
  calendarBox: { marginTop: 10, borderWidth: 1.5, borderRadius: 3, padding: 9, boxShadow: '2px 2px 0px #32252A' },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  calendarMonth: { fontFamily: 'SpaceMono_700Bold', fontSize: 11, letterSpacing: 0.6 },
  calendarArrows: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  archiveChip: { paddingHorizontal: 5, paddingVertical: 4, borderRadius: 2 },
  yearChooser: { borderTopWidth: 2, paddingTop: 8, marginBottom: 8 },
  yearChooserHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  yearCell: { width: '23.8%', minHeight: 30, alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekLabel: { flex: 1, textAlign: 'center', fontFamily: 'SpaceMono_700Bold', fontSize: 8 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  calendarCell: { width: '13.8%', minHeight: 30, alignItems: 'center', justifyContent: 'center' },
  calendarDay: { fontFamily: 'SpaceMono_700Bold', fontSize: 9 },
  calendarDot: { width: 3, height: 3, borderRadius: 2, marginTop: 2 },
  shortcutHeading: { fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 1, marginTop: 12, marginBottom: 6 },
  shortcutRow: { flexDirection: 'row', gap: 7, marginBottom: 7 },
  shortcut: { flex: 1, minHeight: 42, borderRadius: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, boxShadow: '2px 2px 0px #32252A' },
  shortcutText: { fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.3 },
  telemetry: { flex: 1, minHeight: 42, borderRadius: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, boxShadow: '2px 2px 0px #32252A' },
  pixelButton: { minHeight: 50, borderWidth: 1.5, borderColor: '#32252A', borderRadius: 4, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '2px 2px 0px #32252A', marginBottom: 10 },
  pixelButtonPressed: { transform: [{ translateX: 2 }, { translateY: 2 }], boxShadow: '1px 1px 0px #32252A' },
  pixelButtonText: { fontFamily: 'SpaceMono_700Bold', fontSize: 11, letterSpacing: 0.7 },
  privacyLine: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 12 },
  limitedNotice: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, borderWidth: 2, borderRadius: 3, marginBottom: 12 },
  mascotDialogue: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 4, padding: 10, marginBottom: 12, boxShadow: '3px 3px 0px #32252A' },
  dialogueCopy: { flex: 1, gap: 5 },
  bodyText: { fontFamily: 'NunitoSans_600SemiBold', fontSize: 13, lineHeight: 19 },
  resultsHero: { borderRadius: 4, padding: 13, marginBottom: 10, boxShadow: '3px 3px 0px #32252A' },
  resultsCount: { fontFamily: 'SpaceMono_700Bold', fontSize: 23, marginVertical: 6 },
  resultsControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  evidenceRow: { gap: 8, alignItems: 'stretch' },
  evidenceCard: { flex: 1, minWidth: 0, borderWidth: 1.5, borderRadius: 4, padding: 6, marginBottom: 10, boxShadow: '3px 3px 0px #32252A' },
  evidenceImageFrame: { height: 142, borderWidth: 2, borderRadius: 2, overflow: 'hidden', position: 'relative' },
  evidenceImage: { width: '100%', height: '100%' },
  evidenceTag: { position: 'absolute', top: 6, left: 6, paddingHorizontal: 5, paddingVertical: 3, borderWidth: 1, borderColor: '#32252A' },
  evidenceTagText: { fontFamily: 'SpaceMono_700Bold', fontSize: 8 },
  checkbox: { position: 'absolute', top: 6, right: 6, width: 25, height: 25, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  filename: { fontFamily: 'SpaceMono_700Bold', fontSize: 9, marginTop: 7 },
  evidenceMeta: { fontFamily: 'SpaceMono_400Regular', fontSize: 8, marginTop: 4 },
  evidenceText: { fontFamily: 'NunitoSans_600SemiBold', fontSize: 10, lineHeight: 14, marginTop: 5 },
  emptyCard: { borderWidth: 2, borderRadius: 4, padding: 22, alignItems: 'center', gap: 10, marginTop: 6 },
  bottomBar: { position: 'absolute', left: 0, right: 0, borderTopWidth: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  bottomNav: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 72, borderTopWidth: 1, flexDirection: 'row', paddingHorizontal: 12, paddingTop: 7, paddingBottom: 4, zIndex: 5 },
  bottomNavItem: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent', borderRadius: 2, marginHorizontal: 2, position: 'relative' },
  bottomNavLabel: { fontFamily: 'SpaceMono_700Bold', fontSize: 8, letterSpacing: 1, marginTop: 4 },
  newBadge: { position: 'absolute', top: -5, right: 5, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 6, borderWidth: 1, borderColor: '#24181D' },
  newBadgeText: { fontFamily: 'SpaceMono_700Bold', fontSize: 7, letterSpacing: 0.5 },
  questStage: { borderRadius: 8, borderWidth: 1.5, padding: 12, marginBottom: 12, boxShadow: '3px 3px 0px #32252A' },
  questStageBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stageDots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  stageDot: { width: 10, height: 10, borderRadius: 2 },
  questArtwork: { height: 190, borderRadius: 6, borderWidth: 1.5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  referenceArtwork: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  questTitle: { alignItems: 'center', marginTop: 12, gap: 5 },
  alertLabel: { fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 1, paddingHorizontal: 10, paddingVertical: 5 },
  questHeading: { fontFamily: 'SpaceMono_700Bold', fontSize: 22, textAlign: 'center' },
  questStats: { flexDirection: 'row', gap: 5, marginTop: 12 },
  questStat: { flex: 1, minHeight: 55, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 6 },
  statValue: { fontFamily: 'SpaceMono_700Bold', fontSize: 16 },
  questRange: { borderRadius: 8, borderWidth: 1.5, padding: 12, marginBottom: 14, gap: 9, boxShadow: '2px 2px 0px #32252A' },
  questRangeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  questRangeValue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 11, borderRadius: 6, borderWidth: 1.5, boxShadow: '2px 2px 0px #32252A' },
  scopeRow: { flexDirection: 'row', gap: 5 },
  scopeChip: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 5 },
  questActions: { alignItems: 'center', paddingTop: 2 },
  resetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4, marginBottom: 8 },
  sideQuestSection: { gap: 7, marginBottom: 12 },
  sideQuestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  sideQuest: { minHeight: 68, borderRadius: 7, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9, boxShadow: '2px 2px 0px #32252A' },
  sideQuestCopy: { flex: 1 },
  sideQuestTitle: { fontFamily: 'SpaceMono_700Bold', fontSize: 13 },
  xpBadge: { fontFamily: 'SpaceMono_700Bold', fontSize: 9, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 5 },
  cleanupHero: { borderRadius: 8, borderWidth: 1.5, padding: 13, gap: 8, marginBottom: 14, boxShadow: '3px 3px 0px #32252A' },
  cleanupHeroCopy: { flex: 1, marginTop: -30, marginLeft: 35 },
  levelBadge: { position: 'absolute', top: 14, right: 13, fontFamily: 'SpaceMono_700Bold', fontSize: 9, paddingHorizontal: 6, paddingVertical: 5, borderRadius: 3 },
  hpRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  hpTrack: { height: 18, padding: 3, borderWidth: 1.5, borderRadius: 3, flexDirection: 'row', gap: 3 },
  hpSegment: { flex: 1, borderRadius: 2 },
  cleanupDialogue: { minHeight: 65, borderWidth: 1.5, borderRadius: 6, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  evidenceListHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cleanupEvidenceCard: { minHeight: 126, borderWidth: 1.5, borderRadius: 7, padding: 8, marginBottom: 9, flexDirection: 'row', gap: 9, boxShadow: '3px 3px 0px #32252A' },
  cleanupThumb: { width: 96, height: 96, borderWidth: 1.5, borderRadius: 6, overflow: 'hidden' },
  cleanupEvidenceCopy: { flex: 1, justifyContent: 'space-between', minWidth: 0 },
  cleanupEvidenceTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  keepSafeButton: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, paddingHorizontal: 7, paddingVertical: 5, boxShadow: '2px 2px 0px #32252A' },
  resultsCountSmall: { fontFamily: 'SpaceMono_700Bold', fontSize: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(50, 37, 42, 0.72)', justifyContent: 'center', padding: 20 },
  cleanupModal: { borderWidth: 1.5, borderRadius: 5, padding: 14, boxShadow: '4px 4px 0px #32252A' },
  checkerStrip: { height: 8, marginBottom: 12 },
  modalTitle: { fontFamily: 'SpaceMono_700Bold', fontSize: 20, marginBottom: 10 },
  modalCopy: { borderWidth: 2, borderRadius: 3, padding: 11, gap: 8, marginBottom: 12 },
});
