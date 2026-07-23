"use client";

import React from "react";
import { Alert, AppState, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppButton } from "@/components/common/AppButton";
import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { Text } from "@/components/StyledText";
import { readableTextInputStyle } from "@/constants/formStyles";
import {
  PARENT_PIN_LENGTH,
  hasParentPin,
  isValidParentPin,
  setParentPinWithReauthentication,
} from "@/lib/parentAccess";
import { requireInternet } from "@/lib/network";
import { supabase } from "@/lib/supabase";

export default function ParentPinSettingsScreen() {
  const router = useRouter();
  const [accountId, setAccountId] = React.useState("");
  const [hasExistingPin, setHasExistingPin] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [pin, setPin] = React.useState("");
  const [confirmation, setConfirmation] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");

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
        try {
          const configured = await hasParentPin(id);
          if (mounted) setHasExistingPin(configured);
        } catch {
          if (mounted) {
            setLoadError(
              "Secure PIN storage is unavailable. You can retry, but no PIN change is saved unless confirmation succeeds.",
            );
          }
        }
      } catch {
        if (mounted) {
          setLoadError("Could not verify the signed-in parent account.");
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
    });
    return () => subscription.remove();
  }, []);

  const canSubmit =
    Boolean(accountId && password) &&
    isValidParentPin(pin) &&
    pin === confirmation;

  const savePin = async () => {
    if (!canSubmit || submitting) return;
    if (!(await requireInternet("Verifying the parent account"))) return;

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

      if (!saved) {
        Alert.alert(
          "Parent verification did not work",
          "Check the parent account password and try again.",
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

  return (
    <SettingsScaffold title="Parent Access PIN">
      <View className="mt-5 bg-white rounded-xl border border-gray-100 p-5">
        <View className="w-12 h-12 rounded-full bg-purple-50 items-center justify-center mb-4">
          <Ionicons name="keypad-outline" size={24} color="#7C3AED" />
        </View>
        <Text variant="bold" className="text-lg text-gray-800 mb-2">
          {loading
            ? "Checking parent access..."
            : hasExistingPin
              ? "Change the parent PIN"
              : "Set a parent PIN before child mode"}
        </Text>
        <Text className="text-gray-600 leading-6">
          The {PARENT_PIN_LENGTH}-digit PIN is stored securely for this parent
          account on this device. Your current parent account password is
          required to set or replace it.
        </Text>
        {loadError ? (
          <Text className="text-amber-700 leading-5 mt-3">{loadError}</Text>
        ) : null}
      </View>

      {!loading && accountId ? (
        <View className="mt-5 bg-white rounded-xl border border-gray-100 p-5">
          <Text className="text-gray-700 mb-2">Current parent account password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Password"
            placeholderTextColor="#9CA3AF"
            className="border border-gray-200 rounded-xl px-4 py-3 text-lg text-gray-800"
            style={readableTextInputStyle}
            accessibilityLabel="Current parent account password"
          />

          <Text className="text-gray-700 mt-4 mb-2">New {PARENT_PIN_LENGTH}-digit PIN</Text>
          <TextInput
            value={pin}
            onChangeText={(value) =>
              setPin(value.replace(/\D/g, "").slice(0, PARENT_PIN_LENGTH))
            }
            secureTextEntry
            keyboardType="number-pad"
            placeholder={"•".repeat(PARENT_PIN_LENGTH)}
            placeholderTextColor="#9CA3AF"
            className="border border-gray-200 rounded-xl px-4 py-3 text-lg text-gray-800"
            style={readableTextInputStyle}
            accessibilityLabel="New parent PIN"
          />

          <Text className="text-gray-700 mt-4 mb-2">Confirm new PIN</Text>
          <TextInput
            value={confirmation}
            onChangeText={(value) =>
              setConfirmation(value.replace(/\D/g, "").slice(0, PARENT_PIN_LENGTH))
            }
            secureTextEntry
            keyboardType="number-pad"
            placeholder={"•".repeat(PARENT_PIN_LENGTH)}
            placeholderTextColor="#9CA3AF"
            className="border border-gray-200 rounded-xl px-4 py-3 text-lg text-gray-800"
            style={readableTextInputStyle}
            accessibilityLabel="Confirm new parent PIN"
          />

          {confirmation && pin !== confirmation ? (
            <Text className="text-red-600 mt-2">The PINs do not match.</Text>
          ) : null}

          <AppButton
            label={hasExistingPin ? "Change parent PIN" : "Set parent PIN"}
            loadingLabel="Saving..."
            className="mt-5"
            onPress={() => void savePin()}
            disabled={!canSubmit}
            loading={submitting}
          />
        </View>
      ) : null}
    </SettingsScaffold>
  );
}
