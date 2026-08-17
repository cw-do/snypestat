import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, tracking } from '../design/tokens';

const TERMS = [
  ['G · Goal', 'A goal scored by the player. Every goal also counts as one shot on goal.'],
  ['A · Assist', 'A pass or play that directly contributes to a teammate’s goal.'],
  ['TP · Total Points', 'Goals plus assists (G + A). This total is calculated automatically.'],
  ['SOG · Shots on Goal', 'A shot that would enter the net if the goalie did not stop it. Do not add SOG again after recording a goal.'],
  ['BLK · Blocked Shots', 'An opponent’s shot attempt stopped by the player’s body or stick.'],
  ['TK · Takeaways', 'The player causes the opponent to lose possession and the player’s team gains control.'],
  ['GV · Giveaways', 'The player’s pass or play gives possession of the puck to the opponent.'],
  ['+ / − · Plus/Minus', 'Record + for a team goal and − for an opponent goal while the player is on the ice.'],
  ['TOI · Time on Ice', 'The player’s total on-ice time, calculated automatically from completed shifts.']
];

export function StatGuideModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.wrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.head}>
            <View><Text style={styles.kicker}>HOCKEY STAT GUIDE</Text><Text style={styles.title}>What do these mean?</Text></View>
            <Pressable onPress={onClose} hitSlop={12}><Text style={styles.close}>×</Text></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {TERMS.map(([term, definition]) => <View key={term} style={styles.term}><Text style={styles.termName}>{term}</Text><Text style={styles.definition}>{definition}</Text></View>)}
          </ScrollView>
          <Pressable onPress={onClose} style={styles.done}><Text style={styles.doneText}>GOT IT</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.76)' },
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, top: 70, bottom: 40, justifyContent: 'center' },
  sheet: { maxHeight: '100%', backgroundColor: colors.inkRaised, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.lg },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  kicker: { color: colors.blue, fontSize: 9, fontWeight: '900', letterSpacing: tracking.wide },
  title: { color: colors.ice, fontSize: 23, fontWeight: '900', marginTop: 4 },
  close: { color: colors.muted, fontSize: 32, fontWeight: '400' },
  term: { paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.lineSoft },
  termName: { color: colors.ice, fontSize: 13, fontWeight: '900' },
  definition: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  done: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md, borderRadius: radius.md, backgroundColor: '#103747', borderWidth: 1, borderColor: colors.blueDeep },
  doneText: { color: colors.blue, fontSize: 10, fontWeight: '900', letterSpacing: tracking.label }
});
