import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { borderRadius, rf, spacing } from "../utils/responsive";

const modes = {
  login: "login",
  recovery: "recovery",
  invitation: "invitation",
};

export default function AuthScreen() {
  const { activateInvitation, authBusy, recoverPassword, signIn } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [mode, setMode] = useState(modes.login);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [invitationForm, setInvitationForm] = useState({
    invitationCode: "",
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const headline = useMemo(() => {
    if (mode === modes.recovery) {
      return {
        kicker: "Recuperacion",
        title: "Restablecer acceso",
        subtitle:
          "Enviaremos el correo de recuperacion al email operativo del usuario.",
      };
    }

    if (mode === modes.invitation) {
      return {
        kicker: "Alta restringida",
        title: "Activar invitacion",
        subtitle:
          "Completa la activacion con el codigo entregado por la administracion del taller.",
      };
    }

    return {
      kicker: "Acceso seguro",
      title: "Ingresar al taller",
      subtitle:
        "Controla operaciones, diagnosticos, avances y entregas con acceso validado.",
    };
  }, [mode]);

  const resetMessages = () => {
    setFeedback(null);
    setError(null);
  };

  const handleLogin = async () => {
    resetMessages();

    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      setError("Debes completar correo y contrasena.");
      return;
    }

    try {
      await signIn(loginForm);
    } catch (authError) {
      setError(resolveFirebaseError(authError));
    }
  };

  const handleRecovery = async () => {
    resetMessages();

    if (!recoveryEmail.trim()) {
      setError("Indica el correo del usuario.");
      return;
    }

    try {
      await recoverPassword(recoveryEmail);
      setFeedback(
        "Se envio el correo de recuperacion si la cuenta existe y esta habilitada.",
      );
    } catch (authError) {
      setError(resolveFirebaseError(authError));
    }
  };

  const handleInvitationActivation = async () => {
    resetMessages();

    if (
      !invitationForm.invitationCode.trim() ||
      !invitationForm.fullName.trim() ||
      !invitationForm.email.trim() ||
      !invitationForm.password.trim() ||
      !invitationForm.confirmPassword.trim()
    ) {
      setError("Completa los datos obligatorios para activar la invitacion.");
      return;
    }

    if (invitationForm.password !== invitationForm.confirmPassword) {
      setError("La confirmacion de contrasena no coincide.");
      return;
    }

    try {
      await activateInvitation(invitationForm);
      setFeedback(
        "Invitacion activada. Tu cuenta quedo registrada y puede requerir aprobacion interna.",
      );
    } catch (authError) {
      setError(resolveFirebaseError(authError));
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={
            isDarkMode
              ? ["#18314b", "#0c1724", "#09111a"]
              : ["#dce8f7", "#f2f6fb", "#eef2f6"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, { borderColor: colors.borderStrong }]}
        >
          <Text style={[styles.kicker, { color: colors.primary }]}>
            {headline.kicker}
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>
            {headline.title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {headline.subtitle}
          </Text>
        </LinearGradient>

        <View
          style={[
            styles.formCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          {mode === modes.login && (
            <>
              <LabeledInput
                label="Correo"
                value={loginForm.email}
                onChangeText={(value) =>
                  setLoginForm((current) => ({ ...current, email: value }))
                }
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <LabeledInput
                label="Contrasena"
                value={loginForm.password}
                onChangeText={(value) =>
                  setLoginForm((current) => ({ ...current, password: value }))
                }
                secureTextEntry
                autoCapitalize="none"
              />
              <PrimaryButton
                label="Ingresar"
                loading={authBusy}
                onPress={handleLogin}
              />
              <View style={styles.linkRow}>
                <LinkButton
                  label="Recuperar acceso"
                  onPress={() => {
                    resetMessages();
                    setMode(modes.recovery);
                  }}
                />
                <LinkButton
                  label="Activar invitacion"
                  onPress={() => {
                    resetMessages();
                    setMode(modes.invitation);
                  }}
                />
              </View>
            </>
          )}

          {mode === modes.recovery && (
            <>
              <LabeledInput
                label="Correo del usuario"
                value={recoveryEmail}
                onChangeText={setRecoveryEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <PrimaryButton
                label="Enviar correo"
                loading={authBusy}
                onPress={handleRecovery}
              />
              <LinkButton
                label="Volver al login"
                onPress={() => {
                  resetMessages();
                  setMode(modes.login);
                }}
              />
            </>
          )}

          {mode === modes.invitation && (
            <>
              <LabeledInput
                label="Codigo de invitacion"
                value={invitationForm.invitationCode}
                onChangeText={(value) =>
                  setInvitationForm((current) => ({
                    ...current,
                    invitationCode: value,
                  }))
                }
                autoCapitalize="characters"
              />
              <LabeledInput
                label="Nombre completo"
                value={invitationForm.fullName}
                onChangeText={(value) =>
                  setInvitationForm((current) => ({
                    ...current,
                    fullName: value,
                  }))
                }
              />
              <LabeledInput
                label="Telefono"
                value={invitationForm.phone}
                onChangeText={(value) =>
                  setInvitationForm((current) => ({ ...current, phone: value }))
                }
                keyboardType="phone-pad"
              />
              <LabeledInput
                label="Correo"
                value={invitationForm.email}
                onChangeText={(value) =>
                  setInvitationForm((current) => ({ ...current, email: value }))
                }
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <LabeledInput
                label="Contrasena"
                value={invitationForm.password}
                onChangeText={(value) =>
                  setInvitationForm((current) => ({
                    ...current,
                    password: value,
                  }))
                }
                secureTextEntry
                autoCapitalize="none"
              />
              <LabeledInput
                label="Confirmar contrasena"
                value={invitationForm.confirmPassword}
                onChangeText={(value) =>
                  setInvitationForm((current) => ({
                    ...current,
                    confirmPassword: value,
                  }))
                }
                secureTextEntry
                autoCapitalize="none"
              />
              <PrimaryButton
                label="Activar cuenta"
                loading={authBusy}
                onPress={handleInvitationActivation}
              />
              <LinkButton
                label="Volver al login"
                onPress={() => {
                  resetMessages();
                  setMode(modes.login);
                }}
              />
            </>
          )}

          {(error || feedback) && (
            <View
              style={[
                styles.messageBox,
                {
                  backgroundColor: error
                    ? colors.cardMuted
                    : colors.backgroundAccent,
                  borderColor: error ? colors.danger : colors.borderStrong,
                },
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  { color: error ? colors.danger : colors.text },
                ]}
              >
                {error || feedback}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LabeledInput({ label, ...props }) {
  const { colors } = useTheme();

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.textTertiary}
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        {...props}
      />
    </View>
  );
}

function PrimaryButton({ label, loading, onPress }) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={[styles.primaryButton, { backgroundColor: colors.primary }]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={[styles.primaryButtonText, { color: colors.white }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function LinkButton({ label, onPress }) {
  const { colors } = useTheme();

  return (
    <Pressable onPress={onPress} style={styles.linkButton}>
      <Text style={[styles.linkText, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

function resolveFirebaseError(error) {
  const errorCode = error?.code;

  switch (errorCode) {
    case "auth/invalid-email":
      return "El correo no tiene un formato valido.";
    case "auth/user-not-found":
    case "auth/invalid-credential":
      return "Las credenciales no coinciden con un usuario habilitado.";
    case "auth/email-already-in-use":
      return "Ese correo ya esta asociado a una cuenta existente.";
    case "auth/weak-password":
      return "La contrasena debe tener al menos 6 caracteres.";
    default:
      return (
        error?.message || "No fue posible completar la operacion de acceso."
      );
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  kicker: {
    fontSize: rf(12),
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  title: {
    fontSize: rf(30),
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: rf(14),
    lineHeight: rf(20),
  },
  formCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: rf(15),
  },
  primaryButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: spacing.xxl + spacing.md,
  },
  primaryButtonText: {
    fontSize: rf(14),
    fontWeight: "800",
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  linkButton: {
    paddingVertical: spacing.xs,
  },
  linkText: {
    fontSize: rf(13),
    fontWeight: "700",
  },
  messageBox: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  messageText: {
    fontSize: rf(13),
    lineHeight: rf(19),
  },
});
