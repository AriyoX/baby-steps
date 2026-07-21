import React from "react";
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/StyledText";
import { brandColors, brandShadows } from "@/constants/Brand";
import type { LegalDocument } from "@/content/legal";

type LegalDocumentModalProps = {
  document: LegalDocument;
  onClose: () => void;
  visible: boolean;
};

export function LegalDocumentModal({
  document,
  onClose,
  visible,
}: LegalDocumentModalProps) {
  return (
    <Modal
      animationType="slide"
      navigationBarTranslucent
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safeArea}>
          <View
            accessibilityViewIsModal
            style={styles.sheet}
            testID="legal-document-modal"
          >
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text variant="bold" style={styles.title}>
                  {document.title}
                </Text>
                <Text style={styles.updated}>Last updated {document.lastUpdated}</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel={`Close ${document.title}`}
                accessibilityRole="button"
                activeOpacity={0.72}
                onPress={onClose}
                style={styles.closeButton}
                testID="legal-document-close"
              >
                <FontAwesome name="close" size={20} color={brandColors.neutral[700]} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {document.introduction.map((paragraph) => (
                <Text key={paragraph} style={styles.paragraph}>
                  {paragraph}
                </Text>
              ))}

              {document.sections.map((section) => (
                <View key={section.title} style={styles.section}>
                  <Text variant="bold" style={styles.sectionTitle}>
                    {section.title}
                  </Text>
                  {section.paragraphs?.map((paragraph) => (
                    <Text key={paragraph} style={styles.paragraph}>
                      {paragraph}
                    </Text>
                  ))}
                  {section.bullets?.map((bullet) => (
                    <View key={bullet} style={styles.bulletRow}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.bulletText}>{bullet}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity
                accessibilityLabel={`Close ${document.title}`}
                accessibilityRole="button"
                activeOpacity={0.82}
                onPress={onClose}
                style={styles.doneButton}
              >
                <Text variant="bold" style={styles.doneButtonText}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(17, 24, 39, 0.52)",
    flex: 1,
    justifyContent: "flex-end",
  },
  bullet: {
    color: brandColors.victoriaBlue,
    fontSize: 18,
    lineHeight: 23,
    width: 18,
  },
  bulletRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    marginBottom: 8,
  },
  bulletText: {
    color: brandColors.neutral[700],
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: brandColors.neutral[50],
    borderColor: brandColors.neutral[200],
    borderRadius: 18,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  content: {
    paddingBottom: 20,
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  doneButton: {
    alignItems: "center",
    backgroundColor: brandColors.victoriaBlue,
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 50,
    width: "100%",
  },
  doneButtonText: {
    color: brandColors.white,
    fontSize: 16,
  },
  footer: {
    backgroundColor: brandColors.white,
    borderTopColor: brandColors.neutral[100],
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  header: {
    alignItems: "center",
    borderBottomColor: brandColors.neutral[100],
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 14,
  },
  paragraph: {
    color: brandColors.neutral[700],
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 10,
  },
  safeArea: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    color: brandColors.neutral[900],
    fontSize: 17,
    lineHeight: 23,
    marginBottom: 8,
  },
  sheet: {
    ...brandShadows.lifted,
    backgroundColor: brandColors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: "92%",
    maxWidth: 680,
    overflow: "hidden",
    width: "100%",
  },
  title: {
    color: brandColors.neutral[900],
    fontSize: 24,
    lineHeight: 30,
  },
  updated: {
    color: brandColors.neutral[500],
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
});
