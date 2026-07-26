"use client";

import React from "react";
import {
  Alert,
  AppState,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppButton } from "@/components/common/AppButton";
import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { Text } from "@/components/StyledText";
import { readableTextInputStyle } from "@/constants/formStyles";
import { brandColors } from "@/constants/Brand";
import {
  PARENT_PIN_LENGTH,
  hasParentPin,
  isValidParentPin,
  revealParentPinWithReauthentication,
  setParentPinWithReauthentication,
} from "@/lib/parentAccess";
import { requireInternet } from "@/lib/network";
import { supabase } from "@/lib/supabase";

export default function ParentPinSettingsScreen() {
  const router = useRouter();
  const [accountId, setAccountId] = React.useState("");
  const [accountEmail, setAccountEmail] = React.useState("");
  const [hasExistingPin, setHasExistingPin] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [pin, setPin] = React.useState("");
  const [confirmation, setConfirmation] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showPins, setShowPins] = React.useState(false);
  const [revealedPin, setRevealedPin] = React.useState("");
  const [revealing, setRevealing] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        const id = data.session?.user.id ?? "";
        if (error || !id) {
          throw new Error("A signed-in parent is required.");
        }

        if (!mounted) return;
        setAccountId(id);
        setAccountEmail(data.session?.user.email ?? "");
        try {
          const configured = await hasParentPin(id);
          if (mounted) setHasExistingPin(configured);
        } catch {
          if (mounted) {
            setLoadError(
              "We could not open the saved PIN. Try again before changing it.",
            );
          }
        }
      } catch {
        if (mounted) {
          setLoadError("We could not open the parent account. Please sign in again.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") return;
      setPassword("");
      setPin("");
      setConfirmation("");
      setShowPassword(false);
      setShowPins(false);
      setRevealedPin("");
    });
    return () => subscription.remove();
  }, []);

  React.useEffect(() => {
    if (!revealedPin) return;
    const timer = setTimeout(() => setRevealedPin(""), 30_000);
    return () => clearTimeout(timer);
  }, [revealedPin]);

  const canSubmit =
    Boolean(accountId && password) &&
    isValidParentPin(pin) &&
    pin === confirmation;

  const savePin = async () => {
    if (!canSubmit || submitting) return;
    if (!(await requireInternet("Checking your password"))) return;

    setSubmitting(true);
    try {
      const saved = await setParentPinWithReauthentication({
        accountId,
        password,
        pin,
      });

      setPassword("");
      setPin("");
      setConfirmation("");
      setShowPassword(false);
      setShowPins(false);

      if (!saved) {
        Alert.alert(
          "That password did not work",
          "Check your account password and try again.",
        );
        return;
      }

      setHasExistingPin(true);
      Alert.alert(
        hasExistingPin ? "Parent PIN changed" : "Parent PIN set",
        "This PIN is now required to leave child mode on this device.",
        [{ text: "Done", onPress: () => router.back() }],
      );
    } catch {
      Alert.alert("Could not save the PIN", "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const revealCurrentPin = async () => {
    if (revealedPin) {
      setRevealedPin("");
      return;
    }
    if (!accountId || !password || revealing || submitting) return;
    if (!(await requireInternet("Checking your password"))) return;

    setRevealing(true);
    try {
      const savedPin = await revealParentPinWithReauthentication({
        accountId,
        password,
      });
      setPassword("");
      setShowPassword(false);

      if (!savedPin) {
        Alert.alert(
          "That password did not work",
          "Check your account password and try again.",
        );
        return;
      }

      setRevealedPin(savedPin);
    } catch {
      setPassword("");
      setShowPassword(false);
      Alert.alert("Could not show the PIN", "Please try again.");
    } finally {
      setRevealing(false);
    }
  };

  return (
    <SettingsScaffold title="Parent Access PIN">
      <View className="mt-5 overflow-hidden rounded-[28px] bg-primary-700 p-5">
        <View className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <View className="flex-row items-start">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <Ionicons name="shield-checkmark" size={28} color={brandColors.white} />
          </View>
          <View className="ml-4 flex-1">
            <View className="self-start rounded-full bg-accent-400 px-3 py-1">
              <Text variant="bold" className="text-xs text-neutral-900">
                {loading
                  ? "CHECKING"
                  : hasExistingPin
                    ? "PIN ACTIVE"
                    : "SETUP NEEDED"}
              </Text>
            </View>
            <Text variant="bold" className="mt-3 text-2xl text-white">
              {hasExistingPin ? "Keep parent space private" : "Create a parent shortcut"}
            </Text>
          </View>
        </View>
        <Text className="mt-4 leading-6 text-primary-50">
          A {PARENT_PIN_LENGTH}-digit PIN lets you quickly leave child mode. It
          is saved on this device for this parent.
        </Text>
        {loadError ? (
          <View className="mt-4 rounded-2xl bg-amber-50 p-3">
            <Text className="leading-5 text-amber-900">{loadError}</Text>
          </View>
        ) : null}
      </View>

      {!loading && accountId ? (
        <>
          <View className="mt-5 rounded-[24px] border border-neutral-100 bg-white p-5">
            <View className="mb-4 flex-row items-center">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary-50">
                <Text variant="bold" className="text-primary-700">1</Text>
              </View>
              <View className="ml-3 flex-1">
                <Text variant="bold" className="text-lg text-neutral-900">
                  Enter your password
                </Text>
                <Text className="mt-0.5 text-sm text-neutral-500">
                  Use your Baby Steps account password.
                </Text>
              </View>
            </View>

            <Text className="mb-2 text-sm text-neutral-700">
              Parent account password
            </Text>
            <View className="min-h-[56px] flex-row items-center rounded-2xl border border-neutral-200 bg-neutral-50 px-4">
              <Ionicons name="lock-closed-outline" size={20} color={brandColors.neutral[500]} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Enter your password"
                placeholderTextColor={brandColors.neutral[400]}
                className="ml-3 flex-1 text-lg text-neutral-800"
                style={readableTextInputStyle}
                accessibilityLabel="Current parent account password"
              />
              <TouchableOpacity
                className="p-2"
                onPress={() => setShowPassword((visible) => !visible)}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? "Hide parent account password" : "Show parent account password"
                }
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={21}
                  color={brandColors.victoriaBlue}
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              className="mt-3 self-start py-1"
              onPress={() =>
                router.push({
                  pathname: "/forgot-password",
                  params: { email: accountEmail },
                } as any)
              }
              accessibilityRole="button"
            >
              <Text variant="bold" className="text-sm text-primary-700">
                Forgot account password?
              </Text>
            </TouchableOpacity>
            {hasExistingPin ? (
              <Text className="mt-3 text-xs leading-5 text-neutral-500">
                For safety, enter your password each time you show or change
                the PIN.
              </Text>
            ) : null}
          </View>

          {hasExistingPin ? (
            <View className="mt-4 rounded-[24px] border border-neutral-100 bg-white p-5">
              <Text variant="bold" className="text-lg text-neutral-900">
                Current PIN
              </Text>
              <Text className="mt-1 text-sm leading-5 text-neutral-500">
                Show it briefly if you have forgotten it.
              </Text>
              <View className="mt-4 min-h-[58px] flex-row items-center rounded-2xl border border-neutral-200 bg-neutral-50 px-4">
                <Ionicons
                  name={revealedPin ? "eye-outline" : "lock-closed-outline"}
                  size={21}
                  color={brandColors.neutral[500]}
                />
                <Text
                  variant="bold"
                  className="ml-3 flex-1 text-xl tracking-[5px] text-neutral-800"
                  accessibilityLabel={
                    revealedPin
                      ? `Current parent PIN ${revealedPin}`
                      : "Current parent PIN hidden"
                  }
                >
                  {revealedPin || "•".repeat(PARENT_PIN_LENGTH)}
                </Text>
                <AppButton
                  label={revealedPin ? "Hide PIN" : "Show current PIN"}
                  accessibilityLabel={
                    revealedPin ? "Hide PIN" : "Show current PIN"
                  }
                  loadingLabel="Checking..."
                  variant="secondary"
                  fullWidth={false}
                  onPress={() => void revealCurrentPin()}
                  loading={revealing}
                  disabled={!revealedPin && !password}
                />
              </View>
              {revealedPin ? (
                <Text className="mt-2 text-xs text-neutral-500">
                  This will hide again after 30 seconds.
                </Text>
              ) : null}
            </View>
          ) : null}

          <View className="mt-4 rounded-[24px] border border-neutral-100 bg-white p-5">
            <View className="mb-4 flex-row items-center">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-secondary-50">
                <Text variant="bold" className="text-secondary-700">2</Text>
              </View>
              <View className="ml-3 flex-1">
                <Text variant="bold" className="text-lg text-neutral-900">
                  {hasExistingPin ? "Change your PIN" : "Choose your PIN"}
                </Text>
                <Text className="mt-0.5 text-sm text-neutral-500">
                  Pick six digits you can remember but a child cannot guess.
                </Text>
              </View>
              <TouchableOpacity
                className="flex-row items-center rounded-full bg-neutral-100 px-3 py-2"
                onPress={() => setShowPins((visible) => !visible)}
                accessibilityRole="button"
                accessibilityLabel={showPins ? "Hide parent PINs" : "Show parent PINs"}
              >
                <Ionicons
                  name={showPins ? "eye-off-outline" : "eye-outline"}
                  size={17}
                  color={brandColors.neutral[700]}
                />
                <Text variant="bold" className="ml-1.5 text-xs text-neutral-700">
                  {showPins ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text className="mb-2 text-sm text-neutral-700">
              New {PARENT_PIN_LENGTH}-digit PIN
            </Text>
            <View className="min-h-[56px] flex-row items-center rounded-2xl border border-neutral-200 bg-neutral-50 px-4">
              <Ionicons name="keypad-outline" size={20} color={brandColors.neutral[500]} />
              <TextInput
                value={pin}
                onChangeText={(value) =>
                  setPin(value.replace(/\D/g, "").slice(0, PARENT_PIN_LENGTH))
                }
                secureTextEntry={!showPins}
                keyboardType="number-pad"
                placeholder={"•".repeat(PARENT_PIN_LENGTH)}
                placeholderTextColor={brandColors.neutral[400]}
                className="ml-3 flex-1 text-xl tracking-[5px] text-neutral-800"
                style={readableTextInputStyle}
                accessibilityLabel="New parent PIN"
              />
              <Text variant="bold" className="text-xs text-neutral-400">
                {pin.length}/{PARENT_PIN_LENGTH}
              </Text>
            </View>
            <View className="mt-2 flex-row gap-1.5">
              {Array.from({ length: PARENT_PIN_LENGTH }, (_, index) => (
                <View
                  key={`pin-progress-${index}`}
                  className={`h-1.5 flex-1 rounded-full ${
                    index < pin.length ? "bg-secondary-500" : "bg-neutral-100"
                  }`}
                />
              ))}
            </View>

            <Text className="mb-2 mt-5 text-sm text-neutral-700">Confirm new PIN</Text>
            <View
              className={`min-h-[56px] flex-row items-center rounded-2xl border bg-neutral-50 px-4 ${
                confirmation && pin !== confirmation
                  ? "border-red-300"
                  : confirmation && pin === confirmation
                    ? "border-emerald-300"
                    : "border-neutral-200"
              }`}
            >
              <Ionicons
                name={
                  confirmation && pin === confirmation
                    ? "checkmark-circle-outline"
                    : "shield-outline"
                }
                size={20}
                color={
                  confirmation && pin === confirmation
                    ? brandColors.success
                    : brandColors.neutral[500]
                }
              />
              <TextInput
                value={confirmation}
                onChangeText={(value) =>
                  setConfirmation(value.replace(/\D/g, "").slice(0, PARENT_PIN_LENGTH))
                }
                secureTextEntry={!showPins}
                keyboardType="number-pad"
                placeholder={"•".repeat(PARENT_PIN_LENGTH)}
                placeholderTextColor={brandColors.neutral[400]}
                className="ml-3 flex-1 text-xl tracking-[5px] text-neutral-800"
                style={readableTextInputStyle}
                accessibilityLabel="Confirm new parent PIN"
              />
            </View>

            {confirmation && pin !== confirmation ? (
              <Text className="mt-2 text-sm text-red-600">The PINs do not match yet.</Text>
            ) : confirmation && pin === confirmation ? (
              <Text className="mt-2 text-sm text-emerald-700">PINs match.</Text>
            ) : null}

            <View className="mt-4 flex-row items-start rounded-2xl bg-amber-50 p-3">
              <Ionicons name="bulb-outline" size={18} color={brandColors.gold[700]} />
              <Text className="ml-2 flex-1 text-xs leading-5 text-amber-900">
                Avoid birthdays, 123456, or six repeated digits.
              </Text>
            </View>

            <AppButton
              label={hasExistingPin ? "Save new parent PIN" : "Set parent PIN"}
              accessibilityLabel={
                hasExistingPin ? "Save new parent PIN" : "Set parent PIN"
              }
              loadingLabel="Saving..."
              className="mt-5"
              onPress={() => void savePin()}
              disabled={!canSubmit}
              loading={submitting}
            />
          </View>

          <View className="mb-6 mt-4 rounded-[24px] border border-primary-100 bg-primary-50 p-4">
            <View className="flex-row items-center">
              <Ionicons name="help-buoy-outline" size={22} color={brandColors.victoriaBlue} />
              <Text variant="bold" className="ml-3 text-base text-primary-900">
                If you forget it
              </Text>
            </View>
            <Text className="mt-2 text-sm leading-5 text-primary-800">
              On the child-mode lock screen, use the parent account password
              instead. If both are forgotten, request a password reset from that
              same screen, then return and choose a new PIN.
            </Text>
          </View>
        </>
      ) : null}
    </SettingsScaffold>
  );
}
