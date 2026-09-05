"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  AppState,
  ImageBackground,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { Text } from "@/components/StyledText"
import { brandColors } from "@/constants/Brand"
import { CHILD_HOME_ROUTE } from "@/constants/ChildNavigation"
import { useChild } from "@/context/ChildContext"
import {
  PARENT_PIN_LENGTH,
  hasParentPin,
  reauthenticateParentAccount,
  verifyParentPin,
} from "@/lib/parentAccess"
import { supabase } from "@/lib/supabase"
import { getParentGateLayout } from "@/lib/responsiveLayout"

const NUMBER_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
]

export default function ParentGate() {
  const [accountId, setAccountId] = useState("")
  const [accountEmail, setAccountEmail] = useState("")
  const [pinConfigured, setPinConfigured] = useState<boolean | null>(null)
  const [input, setInput] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [usePassword, setUsePassword] = useState(false)
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [now, setNow] = useState(Date.now())
  const appStateRef = useRef<"active" | string>("active")
  const submissionGenerationRef = useRef(0)
  const router = useRouter()
  const { activeChild, deactivateChildMode } = useChild()
  const { height, width } = useWindowDimensions()
  const gateLayout = getParentGateLayout(width, height)
  const keypadColumnWidth =
    (gateLayout.keypadWidth -
      gateLayout.keypadPadding * 2 -
      gateLayout.keypadGap * 2) /
    3

  useEffect(() => {
    let mounted = true

    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (!mounted) return
        const id = data.session?.user.id
        if (error || !id) {
          router.replace("/login")
          return
        }

        setAccountId(id)
        setAccountEmail(data.session?.user.email ?? "")
        try {
          const configured = await hasParentPin(id)
          if (!mounted) return
          setPinConfigured(configured)
          setUsePassword(!configured)
        } catch {
          if (!mounted) return
          setPinConfigured(false)
          setUsePassword(true)
          setMessage(
            "Your PIN could not be opened. Use your account password instead.",
          )
        }
      } catch {
        if (!mounted) return
        router.replace("/login")
      }
    })()

    return () => {
      mounted = false
    }
  }, [router])

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState
      if (nextState === "active") return

      submissionGenerationRef.current += 1
      setInput("")
      setPassword("")
      setShowPassword(false)
      setMessage("")
      setSubmitting(false)
    })

    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (cooldownUntil <= now) return
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [cooldownUntil, now])

  const retrySeconds = useMemo(
    () => Math.max(0, Math.ceil((cooldownUntil - now) / 1000)),
    [cooldownUntil, now],
  )
  const isCoolingDown = retrySeconds > 0

  const unlockParentArea = async (
    destination: "/parent" | "/parent/settings/parent-pin" = "/parent",
  ) => {
    await deactivateChildMode()
    if (appStateRef.current === "active") {
      router.replace(destination)
    }
  }

  const returnToChildMode = () => {
    if (!activeChild) return
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace({
      pathname: CHILD_HOME_ROUTE as any,
      params: { active: activeChild.id },
    })
  }

  const handleDigitPress = (digit: string) => {
    if (submitting || isCoolingDown || input.length >= PARENT_PIN_LENGTH) return
    setMessage("")
    setInput((current) => current + digit)
  }

  const handleClear = () => {
    if (submitting || isCoolingDown) return
    setMessage("")
    setInput((current) => current.slice(0, -1))
  }

  const handlePinSubmit = async () => {
    if (
      !accountId ||
      input.length !== PARENT_PIN_LENGTH ||
      submitting ||
      isCoolingDown
    ) {
      return
    }

    const submissionGeneration = submissionGenerationRef.current + 1
    submissionGenerationRef.current = submissionGeneration
    setSubmitting(true)
    try {
      const result = await verifyParentPin(accountId, input)
      if (
        submissionGenerationRef.current !== submissionGeneration ||
        appStateRef.current !== "active"
      ) {
        return
      }
      setInput("")

      if (result.status === "success") {
        await unlockParentArea()
        return
      }

      if (result.status === "cooldown") {
        const nextCooldown = Date.now() + result.retryAfterMs
        setNow(Date.now())
        setCooldownUntil(nextCooldown)
        setMessage("")
        return
      }

      if (result.status === "not-configured") {
        setPinConfigured(false)
        setUsePassword(true)
        setMessage("The parent PIN needs to be set up again.")
        return
      }

      setMessage("That PIN did not work. Please try again.")
    } catch {
      if (submissionGenerationRef.current !== submissionGeneration) return
      setInput("")
      setPinConfigured(false)
      setUsePassword(true)
      setMessage(
        "Your PIN could not be opened. Use your account password instead.",
      )
    } finally {
      if (submissionGenerationRef.current === submissionGeneration) {
        setSubmitting(false)
      }
    }
  }

  const handlePasswordSubmit = async () => {
    if (!accountId || !password || submitting) return
    const submissionGeneration = submissionGenerationRef.current + 1
    submissionGenerationRef.current = submissionGeneration
    setSubmitting(true)
    setMessage("")

    try {
      const authenticated = await reauthenticateParentAccount(accountId, password)
      if (
        submissionGenerationRef.current !== submissionGeneration ||
        appStateRef.current !== "active"
      ) {
        return
      }
      setPassword("")
      if (authenticated) {
        await unlockParentArea(
          pinConfigured ? "/parent/settings/parent-pin" : "/parent",
        )
        return
      }
      setMessage("That password did not work. Check it and try again.")
    } catch {
      if (submissionGenerationRef.current !== submissionGeneration) return
      setPassword("")
      setMessage("That password did not work. Check it and try again.")
    } finally {
      if (submissionGenerationRef.current === submissionGeneration) {
        setSubmitting(false)
      }
    }
  }

  if (pinConfigured === null) {
    return (
      <View className="flex-1 bg-primary-800 items-center justify-center">
        <ActivityIndicator size="large" color={brandColors.white} />
      </View>
    )
  }

  return (
    <>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ImageBackground
        source={require("@/assets/images/gameBackground.jpg")}
        className="flex-1"
      >
        <SafeAreaView className="flex-1 bg-primary-800/90">
          <View className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-primary-400/30" />
          <View className="absolute -bottom-24 left-1/3 w-64 h-64 rounded-full bg-accent-400/20" />

          <TouchableOpacity
            className="absolute top-5 left-5 z-20 w-12 h-12 rounded-2xl bg-white/15 items-center justify-center border border-white/20"
            onPress={returnToChildMode}
            disabled={!activeChild}
            accessibilityRole="button"
            accessibilityLabel="Return to child mode"
            accessibilityState={{ disabled: !activeChild }}
          >
            <Ionicons name="arrow-back" size={25} color={brandColors.white} />
          </TouchableOpacity>

          <View className="flex-1 items-center justify-center">
          <View
            className="flex-row"
            style={{
              columnGap: gateLayout.columnGap,
              justifyContent: "center",
              maxWidth: gateLayout.contentMaxWidth,
              paddingHorizontal: gateLayout.contentPadding,
              paddingVertical: gateLayout.isShort ? 8 : 20,
              width: "100%",
            }}
          >
            <View
              className="flex-1 justify-center"
              style={{
                maxWidth: gateLayout.isTablet ? 490 : undefined,
                paddingLeft: gateLayout.isShort ? 0 : gateLayout.isTablet ? 16 : 8,
              }}
            >
              <View
                className="self-start flex-row items-center rounded-full bg-accent-400 px-4 py-2"
                style={{ marginBottom: gateLayout.isShort ? 8 : 16 }}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={18}
                  color={brandColors.neutral[900]}
                />
                <Text variant="bold" className="text-neutral-900 text-sm ml-2">
                  Grown-up space
                </Text>
              </View>

              <Text
                variant="bold"
                className="text-white"
                style={{
                  fontSize: gateLayout.isShort ? 28 : gateLayout.isTablet ? 42 : 34,
                  lineHeight: gateLayout.isShort ? 34 : gateLayout.isTablet ? 48 : 40,
                }}
              >
                Parent Access
              </Text>
              <Text
                className="text-primary-100 mt-2"
                style={{
                  fontSize: gateLayout.isShort ? 14 : gateLayout.isTablet ? 18 : 16,
                  lineHeight: gateLayout.isShort ? 19 : gateLayout.isTablet ? 27 : 24,
                  maxWidth: gateLayout.isTablet ? 450 : 390,
                }}
              >
                {usePassword
                  ? "Enter the parent account password to leave child mode."
                  : `Enter the ${PARENT_PIN_LENGTH}-digit parent PIN to leave child mode.`}
              </Text>

              <View
                style={{
                  minHeight: gateLayout.isShort ? 36 : 52,
                  marginTop: gateLayout.isShort ? 8 : 16,
                }}
              >
                {message ? (
                  <Text
                    variant="bold"
                    className="text-accent-300 text-sm"
                    accessibilityLiveRegion="polite"
                  >
                    {message}
                  </Text>
                ) : isCoolingDown ? (
                  <Text
                    variant="bold"
                    className="text-accent-300 text-sm"
                    accessibilityLiveRegion="polite"
                  >
                    Try again in {retrySeconds} seconds.
                  </Text>
                ) : (
                  <Text className="text-white/65 text-sm">
                    This PIN is saved on this device for this parent.
                  </Text>
                )}
              </View>

              {pinConfigured ? (
                <TouchableOpacity
                  className="self-start mt-2 py-2"
                  onPress={() => {
                    setUsePassword((current) => !current)
                    setInput("")
                    setPassword("")
                    setShowPassword(false)
                    setMessage("")
                  }}
                  accessibilityRole="button"
                >
                  <Text variant="bold" className="text-white underline">
                    {usePassword ? "Use parent PIN" : "Forgot PIN? Use parent password"}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View
              className="justify-center items-center"
              style={{ width: gateLayout.keypadWidth }}
            >
              <View
                className="w-full rounded-[30px] bg-neutral-900/35 border border-white/15"
                style={{ padding: gateLayout.keypadPadding }}
              >
                {usePassword ? (
                  <>
                    <View
                      className="flex-row items-center rounded-2xl border border-white/20 px-4"
                    >
                      <TextInput
                        value={password}
                        onChangeText={(value) => {
                          setPassword(value)
                          setMessage("")
                        }}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder="Parent account password"
                        placeholderTextColor="rgba(255,255,255,0.45)"
                        style={{
                          color: brandColors.white,
                          flex: 1,
                          fontSize: gateLayout.isTablet ? 19 : 17,
                          paddingVertical: gateLayout.isShort ? 10 : gateLayout.isTablet ? 17 : 14,
                        }}
                        accessibilityLabel="Parent account password"
                      />
                      <TouchableOpacity
                        className="p-2"
                        onPress={() => setShowPassword((visible) => !visible)}
                        accessibilityRole="button"
                        accessibilityLabel={
                          showPassword ? "Hide parent password" : "Show parent password"
                        }
                      >
                        <Ionicons
                          name={showPassword ? "eye-off-outline" : "eye-outline"}
                          size={22}
                          color={brandColors.white}
                        />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      className={`rounded-2xl justify-center items-center flex-row mt-4 ${
                        password && !submitting ? "bg-accent-400" : "bg-white/10"
                      }`}
                      style={{ height: gateLayout.keypadButtonHeight }}
                      onPress={() => void handlePasswordSubmit()}
                      disabled={!password || submitting}
                      accessibilityRole="button"
                      accessibilityLabel="Verify parent password"
                    >
                      {submitting ? (
                        <ActivityIndicator color={brandColors.neutral[900]} />
                      ) : (
                        <Text variant="bold" className="text-neutral-900">
                          Verify parent
                        </Text>
                        )}
                      </TouchableOpacity>
                    <TouchableOpacity
                      className="mt-3 items-center py-2"
                      onPress={() =>
                        router.replace({
                          pathname: "/forgot-password",
                          params: { email: accountEmail },
                        } as any)
                      }
                      accessibilityRole="button"
                      accessibilityLabel="Reset forgotten parent password"
                    >
                      <Text variant="bold" className="text-sm text-white underline">
                        Forgot both? Reset the account password
                      </Text>
                    </TouchableOpacity>
                    <Text className="mt-1 text-center text-xs leading-4 text-white/60">
                      A reset needs internet access and the parent email inbox.
                    </Text>
                  </>
                ) : (
                  <>
                    <View
                      className="rounded-2xl bg-white/15 border border-white/20 items-center justify-center"
                      style={{
                        height: gateLayout.keypadButtonHeight,
                        marginBottom: gateLayout.keypadGap,
                      }}
                    >
                      <Text
                        variant="bold"
                        className={`text-[28px] tracking-[8px] ${
                          input ? "text-white" : "text-white/40"
                        }`}
                        accessibilityLabel={`${input.length} PIN digits entered`}
                      >
                        {input ? "●".repeat(input.length) : "—"}
                      </Text>
                    </View>

                    {NUMBER_ROWS.map((row) => (
                      <View
                        key={row.join("")}
                        className="flex-row"
                        style={{
                          columnGap: gateLayout.keypadGap,
                          marginBottom: gateLayout.keypadGap,
                        }}
                      >
                        {row.map((digit) => (
                          <TouchableOpacity
                            key={digit}
                            className="flex-1 bg-white/20 rounded-2xl justify-center items-center border border-white/10"
                            style={{ height: gateLayout.keypadButtonHeight }}
                            onPress={() => handleDigitPress(digit)}
                            disabled={submitting || isCoolingDown}
                            accessibilityRole="button"
                            accessibilityLabel={`Enter ${digit}`}
                          >
                            <Text variant="bold" className="text-white text-2xl">
                              {digit}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ))}

                    <View
                      className="flex-row"
                      style={{ columnGap: gateLayout.keypadGap }}
                    >
                      <TouchableOpacity
                        className="bg-white/10 rounded-2xl justify-center items-center"
                        style={{
                          height: gateLayout.keypadButtonHeight,
                          width: keypadColumnWidth,
                        }}
                        onPress={handleClear}
                        disabled={submitting || isCoolingDown}
                        accessibilityRole="button"
                        accessibilityLabel="Delete last PIN digit"
                      >
                        <Ionicons
                          name="backspace-outline"
                          size={25}
                          color={brandColors.white}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="bg-white/20 rounded-2xl justify-center items-center border border-white/10"
                        style={{
                          height: gateLayout.keypadButtonHeight,
                          width: keypadColumnWidth,
                        }}
                        onPress={() => handleDigitPress("0")}
                        disabled={submitting || isCoolingDown}
                        accessibilityRole="button"
                        accessibilityLabel="Enter 0"
                      >
                        <Text variant="bold" className="text-white text-2xl">
                          0
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className={`flex-1 rounded-2xl justify-center items-center ${
                          input.length === PARENT_PIN_LENGTH &&
                          !submitting &&
                          !isCoolingDown
                            ? "bg-accent-400"
                            : "bg-white/10"
                        }`}
                        style={{ height: gateLayout.keypadButtonHeight }}
                        onPress={() => void handlePinSubmit()}
                        disabled={
                          input.length !== PARENT_PIN_LENGTH ||
                          submitting ||
                          isCoolingDown
                        }
                        accessibilityRole="button"
                        accessibilityLabel="Verify parent PIN"
                      >
                        {submitting ? (
                          <ActivityIndicator color={brandColors.neutral[900]} />
                        ) : (
                          <Ionicons
                            name="arrow-forward"
                            size={24}
                            color={
                              input.length === PARENT_PIN_LENGTH
                                ? brandColors.neutral[900]
                                : brandColors.neutral[400]
                            }
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </>
  )
}
