import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../hooks';
import { useAuthStore } from '../store';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../constants';
import {
  generateAdvice,
  getWeeklyCheckIn,
  getEducationArticles,
  getFinancialGlossary,
  type Advice,
} from '../services/advisorService';
import { getDailyTip } from '../services/tips';

type AdvisorTab = 'advice' | 'checkin' | 'learn' | 'glossary';

export const AdvisorScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const userId = currentUser?.id || '';

  const [activeTab, setActiveTab] = useState<AdvisorTab>('advice');
  const [refreshing, setRefreshing] = useState(false);
  const [advice, setAdvice] = useState<Advice[]>([]);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const [showArticle, setShowArticle] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<{
    title: string; content: string; emoji: string;
  } | null>(null);

  const dailyTip = getDailyTip();
  const checkIn = getWeeklyCheckIn();
  const articles = getEducationArticles();
  const glossary = getFinancialGlossary();

  const loadAdvice = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await generateAdvice(userId);
      setAdvice(data);
    } catch (error) {
      console.error('Advice error:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadAdvice();
  }, [loadAdvice]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAdvice();
    setRefreshing(false);
  }, [loadAdvice]);

  const tabs: Array<{ key: AdvisorTab; label: string; icon: string }> = [
    { key: 'advice', label: 'Savjeti', icon: 'bulb-outline' },
    { key: 'checkin', label: 'Check-in', icon: 'clipboard-outline' },
    { key: 'learn', label: 'Nauči', icon: 'book-outline' },
    { key: 'glossary', label: 'Pojmovi', icon: 'library-outline' },
  ];

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high':
        return { bg: colors.error + '15', border: colors.error + '40', text: colors.error };
      case 'medium':
        return { bg: colors.warning + '15', border: colors.warning + '40', text: colors.warning };
      default:
        return { bg: colors.success + '15', border: colors.success + '40', text: colors.success };
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Važno';
      case 'medium': return 'Preporuka';
      default: return 'Informacija';
    }
  };

  const renderAdviceTab = () => (
    <View>
      {/* Savjet dana */}
      <View style={[styles.tipCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
        <Text style={[styles.tipTitle, { color: colors.primary }]}>
          <Ionicons name="bulb-outline" size={14} color={colors.primary} /> Savjet dana
        </Text>
        <Text style={[styles.tipText, { color: colors.text }]}>{dailyTip}</Text>
      </View>

      {/* Personalizirani savjeti */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        <Ionicons name="sparkles-outline" size={16} color={colors.text} /> Personalizirani savjeti
      </Text>

      {advice.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="sync-outline" size={40} color={colors.textSecondary} style={{ marginBottom: Spacing.sm }} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Analiziram vaše financije...
          </Text>
        </View>
      )}

      {advice.map((item) => {
        const style = getPriorityStyle(item.priority);
        return (
          <View
            key={item.id}
            style={[styles.adviceCard, { backgroundColor: style.bg, borderColor: style.border }]}
          >
            <View style={styles.adviceHeader}>
              <Text style={styles.adviceEmoji}>{item.emoji}</Text>
              <View style={styles.adviceHeaderInfo}>
                <Text style={[styles.adviceTitle, { color: colors.text }]}>{item.title}</Text>
                <View style={[styles.priorityBadge, { backgroundColor: style.text + '20' }]}>
                  <Text style={[styles.priorityText, { color: style.text }]}>
                    {getPriorityLabel(item.priority)}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={[styles.adviceMessage, { color: colors.textSecondary }]}>
              {item.message}
            </Text>
            {item.actionLabel && (
              <TouchableOpacity
                style={[styles.actionButton, { borderColor: style.text }]}
                onPress={() => {
                  if (item.actionRoute) {
                    const tabScreens = ['Dashboard', 'Transactions', 'Budget', 'Goals', 'More'];
                    if (tabScreens.includes(item.actionRoute)) {
                      (navigation as any).navigate('Main', { screen: item.actionRoute });
                    } else {
                      (navigation as any).navigate(item.actionRoute);
                    }
                  }
                }}
              >
                <Text style={[styles.actionButtonText, { color: style.text }]}>
                  {item.actionLabel} →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );

  const renderCheckInTab = () => (
    <View>
      <View style={[styles.checkInHeader, { backgroundColor: colors.primary + '10' }]}>
        <Ionicons name="clipboard-outline" size={40} color={colors.primary} style={{ marginBottom: Spacing.sm }} />
        <Text style={[styles.checkInTitle, { color: colors.text }]}>Tjedni check-in</Text>
        <Text style={[styles.checkInSubtitle, { color: colors.textSecondary }]}>
          Odvojite 2 minute da razmislite o svojim financijama ovaj tjedan
        </Text>
      </View>

      {checkIn.map((item, index) => (
        <View
          key={index}
          style={[styles.questionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={styles.questionEmoji}>{item.emoji}</Text>
          <Text style={[styles.questionText, { color: colors.text }]}>{item.question}</Text>
          <View style={styles.questionType}>
            {item.type === 'yes_no' && (
              <View style={styles.yesNoRow}>
                <TouchableOpacity style={[styles.yesNoBtn, { backgroundColor: colors.success + '15' }]}>
                  <Text style={[styles.yesNoText, { color: colors.success }]}>Da <Ionicons name="checkmark" size={16} color={colors.success} /></Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.yesNoBtn, { backgroundColor: colors.error + '15' }]}>
                  <Text style={[styles.yesNoText, { color: colors.error }]}>Ne <Ionicons name="close" size={16} color={colors.error} /></Text>
                </TouchableOpacity>
              </View>
            )}
            {item.type === 'scale' && (
              <View style={styles.scaleRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.scaleBtn, { backgroundColor: colors.surfaceVariant }]}
                  >
                    <Text style={[styles.scaleText, { color: colors.text }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {item.type === 'reflection' && (
              <View style={[styles.reflectionBox, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.reflectionPlaceholder, { color: colors.textTertiary }]}>
                  Zapišite svoju misao...
                </Text>
              </View>
            )}
          </View>
        </View>
      ))}

      <View style={[styles.hint, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.hintText, { color: colors.textSecondary }]}>
          <Ionicons name="information-circle-outline" size={12} color={colors.textSecondary} /> Tjedni check-in je navika koja pomaže graditi financijsku svjesnost.
          Pitanja se mijenjaju svaki tjedan.
        </Text>
      </View>
    </View>
  );

  const renderLearnTab = () => (
    <View>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
        Kratki članci za bolje razumijevanje financija
      </Text>

      {articles.map((article) => (
        <TouchableOpacity
          key={article.id}
          style={[styles.articleCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            setSelectedArticle({
              title: article.title,
              content: article.content,
              emoji: article.emoji,
            });
            setShowArticle(true);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.articleEmoji}>{article.emoji}</Text>
          <View style={styles.articleInfo}>
            <Text style={[styles.articleTitle, { color: colors.text }]}>{article.title}</Text>
            <Text style={[styles.articleSummary, { color: colors.textSecondary }]}>
              {article.summary}
            </Text>
            <Text style={[styles.articleMeta, { color: colors.textTertiary }]}>
              ⏱ {article.readTimeMin} min čitanja
            </Text>
          </View>
          <Text style={{ color: colors.textTertiary, fontSize: 18 }}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderGlossaryTab = () => (
    <View>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
        Financijski pojmovi objašnjeni jednostavnim jezikom
      </Text>

      {glossary.map((item, index) => (
        <View
          key={index}
          style={[styles.glossaryItem, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={styles.glossaryEmoji}>{item.emoji}</Text>
          <View style={styles.glossaryInfo}>
            <Text style={[styles.glossaryTerm, { color: colors.text }]}>{item.term}</Text>
            <Text style={[styles.glossaryDef, { color: colors.textSecondary }]}>
              {item.definition}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Savjetnik</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Tabovi */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                { backgroundColor: activeTab === tab.key ? colors.primary : colors.surfaceVariant },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.key ? '#FFF' : colors.textSecondary} />
              <Text
                style={[styles.tabLabel, { color: activeTab === tab.key ? '#FFF' : colors.textSecondary }]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {activeTab === 'advice' && renderAdviceTab()}
        {activeTab === 'checkin' && renderCheckInTab()}
        {activeTab === 'learn' && renderLearnTab()}
        {activeTab === 'glossary' && renderGlossaryTab()}
      </ScrollView>

      {/* Article Modal */}
      <Modal visible={showArticle} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.articleModalHeader}>
                <Text style={styles.articleModalEmoji}>{selectedArticle?.emoji}</Text>
                <Text style={[styles.articleModalTitle, { color: colors.text }]}>
                  {selectedArticle?.title}
                </Text>
              </View>
              <Text style={[styles.articleContent, { color: colors.text }]}>
                {selectedArticle?.content}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowArticle(false)}
            >
              <Text style={styles.closeButtonText}>Zatvori</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  backButton: { fontSize: 16, fontWeight: '600' },
  screenTitle: { ...Typography.heading2 },
  content: { padding: Spacing.base, paddingBottom: Spacing['3xl'] },
  tabs: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg, paddingVertical: Spacing.xs },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  tabLabel: { fontSize: 13, fontWeight: '600' },

  // Tip
  tipCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
  },
  tipTitle: { fontSize: 14, fontWeight: '700', marginBottom: Spacing.sm },
  tipText: { fontSize: 14, lineHeight: 22 },

  sectionTitle: { ...Typography.subtitle, marginBottom: Spacing.md },
  sectionSubtitle: { fontSize: 14, marginBottom: Spacing.md },

  // Advice cards
  adviceCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  adviceHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
  adviceEmoji: { fontSize: 28, marginRight: Spacing.md },
  adviceHeaderInfo: { flex: 1 },
  adviceTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: { fontSize: 11, fontWeight: '700' },
  adviceMessage: { fontSize: 14, lineHeight: 22, marginBottom: Spacing.sm },
  actionButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  actionButtonText: { fontSize: 13, fontWeight: '600' },

  // Check-in
  checkInHeader: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  checkInTitle: { ...Typography.heading2, marginBottom: 4 },
  checkInSubtitle: { fontSize: 14, textAlign: 'center' },

  questionCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  questionEmoji: { fontSize: 24, marginBottom: Spacing.sm },
  questionText: { fontSize: 16, fontWeight: '600', marginBottom: Spacing.md, lineHeight: 24 },
  questionType: {},
  yesNoRow: { flexDirection: 'row', gap: Spacing.sm },
  yesNoBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
  yesNoText: { fontSize: 16, fontWeight: '700' },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  scaleBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  scaleText: { fontSize: 18, fontWeight: '700' },
  reflectionBox: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 80,
  },
  reflectionPlaceholder: { fontSize: 14, fontStyle: 'italic' },

  // Articles
  articleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  articleEmoji: { fontSize: 32, marginRight: Spacing.md },
  articleInfo: { flex: 1 },
  articleTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  articleSummary: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  articleMeta: { fontSize: 11 },

  // Glossary
  glossaryItem: {
    flexDirection: 'row',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  glossaryEmoji: { fontSize: 24, marginRight: Spacing.md },
  glossaryInfo: { flex: 1 },
  glossaryTerm: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  glossaryDef: { fontSize: 13, lineHeight: 20 },

  // Empty & hint
  emptyState: { alignItems: 'center', paddingVertical: Spacing['2xl'] },
  emptyText: { fontSize: 14 },
  hint: { padding: Spacing.sm, borderRadius: BorderRadius.md, marginTop: Spacing.md },
  hintText: { fontSize: 12, lineHeight: 18 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  articleModalHeader: { alignItems: 'center', marginBottom: Spacing.lg },
  articleModalEmoji: { fontSize: 48, marginBottom: Spacing.md },
  articleModalTitle: { ...Typography.heading2, textAlign: 'center' },
  articleContent: { fontSize: 15, lineHeight: 24, marginBottom: Spacing.lg },
  closeButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  closeButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
