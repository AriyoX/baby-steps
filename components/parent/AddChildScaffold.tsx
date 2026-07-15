import type { ReactNode } from "react"
import { ScrollView, StatusBar, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { Text } from "@/components/StyledText"
import { AppButton } from "@/components/common/AppButton"
import { brandColors } from "@/constants/Brand"

type AddChildScaffoldProps = {
  step: number
  totalSteps?: number
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  onBack: () => void
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
  footer?: ReactNode
  scroll?: boolean
}

export function AddChildScaffold({
  step,
  totalSteps = 4,
  eyebrow,
  title,
  description,
  children,
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled = false,
  footer,
  scroll = true,
}: AddChildScaffoldProps) {
  const content = (
    <View className="px-5 pb-8">
      <View className="pt-7 pb-5">
        <Text variant="bold" className="text-xs uppercase tracking-[2px] text-secondary-600 mb-2">
          {eyebrow}
        </Text>
        <Text variant="bold" className="text-[30px] leading-9 text-neutral-900 mb-2">
          {title}
        </Text>
        <Text className="text-base leading-6 text-neutral-600">{description}</Text>
      </View>

      <View className="bg-white rounded-[28px] p-5 border border-primary-100 shadow-sm">
        {children}
      </View>

      {footer ? <View className="mt-4">{footer}</View> : null}
    </View>
  )

  return (
    <SafeAreaView className="flex-1 bg-[#F8F6F1]">
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <View className="absolute -top-8 -right-12 w-40 h-40 rounded-full bg-primary-100 opacity-60" />
      <View className="absolute top-56 -left-16 w-32 h-32 rounded-full bg-accent-100 opacity-50" />

      <View className="px-5 pt-3 pb-4 bg-white/90 border-b border-neutral-100">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="w-11 h-11 rounded-full bg-primary-50 items-center justify-center border border-primary-100"
          >
            <Ionicons name="arrow-back" size={21} color={brandColors.victoriaBlue} />
          </TouchableOpacity>
          <View className="bg-neutral-50 border border-neutral-100 rounded-full px-4 py-2">
            <Text variant="bold" className="text-sm text-neutral-600">
              Step {step} of {totalSteps}
            </Text>
          </View>
        </View>

        <View className="h-2 rounded-full bg-primary-50 overflow-hidden">
          <View
            className="h-full rounded-full bg-secondary-500"
            style={{ width: `${Math.min(100, Math.max(0, (step / totalSteps) * 100))}%` }}
          />
        </View>
      </View>

      {scroll ? (
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        <View className="flex-1">{content}</View>
      )}

      <View className="px-5 pt-3 pb-4 bg-white border-t border-neutral-100">
        <AppButton
          label={nextLabel}
          icon="arrow-forward"
          onPress={onNext}
          disabled={nextDisabled}
          className="rounded-2xl min-h-[56px]"
        />
      </View>
    </SafeAreaView>
  )
}
