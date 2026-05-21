import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { borderRadius, hs, rf, s, spacing, vs } from "../utils/responsive";

const modes = {
  login: "login",
  register: "register",
  invitation: "invitation",
  recovery: "recovery",
};

export default function AuthScreen() {
  const { activateInvitation, authBusy, recoverPassword, signIn, signUp } =
    useAuth();
  const { colors, isDarkMode } = useTheme();
  const scrollRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const registerNameInputRef = useRef(null);
  const registerPhoneInputRef = useRef(null);
  const registerEmailInputRef = useRef(null);
  const registerPasswordInputRef = useRef(null);
  const registerConfirmPasswordInputRef = useRef(null);
  const invitationCodeInputRef = useRef(null);
  const invitationNameInputRef = useRef(null);
  const invitationPhoneInputRef = useRef(null);
  const invitationEmailInputRef = useRef(null);
  const invitationPasswordInputRef = useRef(null);
  const invitationConfirmPasswordInputRef = useRef(null);
  const [mode, setMode] = useState(modes.login);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] =
    useState(false);
  const [showInvitationPassword, setShowInvitationPassword] = useState(false);
  const [showInvitationConfirmPassword, setShowInvitationConfirmPassword] =
    useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [invitationForm, setInvitationForm] = useState({
    invitationCode: "",
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const isLogin = mode === modes.login;
  const isRegister = mode === modes.register;
  const isInvitation = mode === modes.invitation;

  const palette = useMemo(
    () => ({
      page: colors.background,
      surface: colors.cardBackground,
      surfaceAlt: colors.cardMuted,
      accent: colors.primary,
      accentStrong: colors.primaryStrong,
      accentSoft: isDarkMode
        ? "rgba(255,255,255,0.12)"
        : "rgba(255,255,255,0.16)",
      text: colors.text,
      muted: colors.textSecondary,
      placeholder: colors.textTertiary,
      border: colors.border,
      borderStrong: colors.borderStrong,
      danger: colors.danger,
      info: colors.primaryStrong,
      white: colors.white,
      shadow: colors.shadow,
    }),
    [colors, isDarkMode],
  );

  const headline = useMemo(() => {
    if (mode === modes.recovery) {
      return {
        kicker: "Recuperacion segura",
        title: "Recuperar acceso",
        subtitle:
          "Enviaremos el enlace de recuperacion al correo operativo asociado al taller.",
        pills: ["Correo seguro", "Acceso validado"],
      };
    }

    if (mode === modes.register) {
      return {
        kicker: "Registro operativo",
        title: "Crear cuenta",
        subtitle:
          "Registra tu acceso para entrar al panel del taller y sincronizar tu informacion desde el primer inicio.",
        pills: ["Cuenta nueva", "Perfil", "Sincronizacion"],
      };
    }

    if (mode === modes.invitation) {
      return {
        kicker: "Alta autorizada",
        title: "Activar invitacion",
        subtitle:
          "Activa tu cuenta con el correo invitado; si administracion te compartio un codigo, puedes usarlo como referencia.",
        pills: ["Invitacion", "Aprobacion", "Equipo tecnico"],
      };
    }

    return {
      kicker: "Acceso seguro",
      title: "Auto-Guardian Taller",
      subtitle:
        "Inicia sesion para cargar tu espacio de trabajo y sincronizar tus datos del taller.",
      pills: ["Sincronizacion", "Seguridad", "Tu taller"],
    };
  }, [mode]);

  const scrollToFocusedInput = (y) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y, animated: true });
    });
  };

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

  const handleSignUp = async () => {
    resetMessages();

    if (
      !registerForm.fullName.trim() ||
      !registerForm.email.trim() ||
      !registerForm.password.trim() ||
      !registerForm.confirmPassword.trim()
    ) {
      setError("Completa los datos obligatorios para crear la cuenta.");
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setError("La confirmacion de contrasena no coincide.");
      return;
    }

    try {
      await signUp(registerForm);
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.page }]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? vs(24) : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.heroCard,
              { backgroundColor: palette.accent, shadowColor: palette.shadow },
            ]}
          >
            <Text style={styles.heroEyebrow}>{headline.kicker}</Text>
            <Text style={styles.heroTitle}>{headline.title}</Text>
            <Text style={styles.heroSubtitle}>{headline.subtitle}</Text>

            <View style={styles.heroHighlights}>
              {headline.pills.map((pill, index) => (
                <View
                  key={`${pill}-${index}`}
                  style={[
                    styles.heroHighlightPill,
                    { backgroundColor: palette.accentSoft },
                  ]}
                >
                  <Ionicons
                    color={palette.white}
                    name={resolveHeroIcon(mode, index)}
                    size={rf(16)}
                  />
                  <Text style={styles.heroHighlightText}>{pill}</Text>
                </View>
              ))}
            </View>
          </View>

          <View
            style={[
              styles.formCard,
              { backgroundColor: palette.surface, shadowColor: palette.shadow },
            ]}
          >
            {mode !== modes.recovery && (
              <View
                style={[
                  styles.modeSwitch,
                  { backgroundColor: palette.surfaceAlt },
                ]}
              >
                <Pressable
                  onPress={() => {
                    resetMessages();
                    setMode(modes.login);
                  }}
                  style={({ pressed }) => [
                    styles.modeButton,
                    isLogin && [
                      styles.modeButtonActive,
                      { backgroundColor: palette.accent },
                    ],
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      { color: palette.muted },
                      isLogin && [
                        styles.modeButtonTextActive,
                        { color: palette.white },
                      ],
                    ]}
                  >
                    Iniciar sesion
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    resetMessages();
                    setMode(modes.register);
                  }}
                  style={({ pressed }) => [
                    styles.modeButton,
                    isRegister && [
                      styles.modeButtonActive,
                      { backgroundColor: palette.accent },
                    ],
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      { color: palette.muted },
                      isRegister && [
                        styles.modeButtonTextActive,
                        { color: palette.white },
                      ],
                    ]}
                  >
                    Registrarme
                  </Text>
                </Pressable>
              </View>
            )}

            {isLogin && (
              <>
                <Text style={[styles.label, { color: palette.text }]}>
                  Correo
                </Text>
                <TextInput
                  ref={emailInputRef}
                  style={[
                    styles.input,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.surfaceAlt,
                      color: palette.text,
                    },
                  ]}
                  value={loginForm.email}
                  onChangeText={(value) =>
                    setLoginForm((current) => ({ ...current, email: value }))
                  }
                  placeholder="correo@dominio.com"
                  placeholderTextColor={palette.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onFocus={() => scrollToFocusedInput(vs(180))}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />

                <Text style={[styles.label, { color: palette.text }]}>
                  Contrasena
                </Text>
                <View
                  style={[
                    styles.passwordField,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.surfaceAlt,
                    },
                  ]}
                >
                  <TextInput
                    ref={passwordInputRef}
                    style={[styles.passwordInput, { color: palette.text }]}
                    value={loginForm.password}
                    onChangeText={(value) =>
                      setLoginForm((current) => ({
                        ...current,
                        password: value,
                      }))
                    }
                    placeholder="Minimo 6 caracteres"
                    placeholderTextColor={palette.placeholder}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onFocus={() => scrollToFocusedInput(vs(240))}
                    onSubmitEditing={handleLogin}
                  />
                  <Pressable
                    onPress={() => setShowPassword((current) => !current)}
                    style={({ pressed }) => [
                      styles.passwordEyeButton,
                      pressed && styles.linkButtonPressed,
                    ]}
                  >
                    <Ionicons
                      color={palette.muted}
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={rf(19)}
                    />
                  </Pressable>
                </View>
              </>
            )}

            {isRegister && (
              <>
                <Text style={[styles.label, { color: palette.text }]}>
                  Nombre
                </Text>
                <TextInput
                  ref={registerNameInputRef}
                  style={[
                    styles.input,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.surfaceAlt,
                      color: palette.text,
                    },
                  ]}
                  value={registerForm.fullName}
                  onChangeText={(value) =>
                    setRegisterForm((current) => ({
                      ...current,
                      fullName: value,
                    }))
                  }
                  placeholder="Nombre del usuario"
                  placeholderTextColor={palette.placeholder}
                  returnKeyType="next"
                  onFocus={() => scrollToFocusedInput(vs(150))}
                  onSubmitEditing={() => registerPhoneInputRef.current?.focus()}
                />

                <Text style={[styles.label, { color: palette.text }]}>
                  Telefono
                </Text>
                <TextInput
                  ref={registerPhoneInputRef}
                  style={[
                    styles.input,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.surfaceAlt,
                      color: palette.text,
                    },
                  ]}
                  value={registerForm.phone}
                  onChangeText={(value) =>
                    setRegisterForm((current) => ({ ...current, phone: value }))
                  }
                  placeholder="Numero de contacto"
                  placeholderTextColor={palette.placeholder}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  onFocus={() => scrollToFocusedInput(vs(210))}
                  onSubmitEditing={() => registerEmailInputRef.current?.focus()}
                />

                <Text style={[styles.label, { color: palette.text }]}>
                  Correo
                </Text>
                <TextInput
                  ref={registerEmailInputRef}
                  style={[
                    styles.input,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.surfaceAlt,
                      color: palette.text,
                    },
                  ]}
                  value={registerForm.email}
                  onChangeText={(value) =>
                    setRegisterForm((current) => ({ ...current, email: value }))
                  }
                  placeholder="correo@dominio.com"
                  placeholderTextColor={palette.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onFocus={() => scrollToFocusedInput(vs(270))}
                  onSubmitEditing={() =>
                    registerPasswordInputRef.current?.focus()
                  }
                />

                <Text style={[styles.label, { color: palette.text }]}>
                  Contrasena
                </Text>
                <View
                  style={[
                    styles.passwordField,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.surfaceAlt,
                    },
                  ]}
                >
                  <TextInput
                    ref={registerPasswordInputRef}
                    style={[styles.passwordInput, { color: palette.text }]}
                    value={registerForm.password}
                    onChangeText={(value) =>
                      setRegisterForm((current) => ({
                        ...current,
                        password: value,
                      }))
                    }
                    placeholder="Minimo 6 caracteres"
                    placeholderTextColor={palette.placeholder}
                    secureTextEntry={!showRegisterPassword}
                    autoCapitalize="none"
                    returnKeyType="next"
                    onFocus={() => scrollToFocusedInput(vs(340))}
                    onSubmitEditing={() =>
                      registerConfirmPasswordInputRef.current?.focus()
                    }
                  />
                  <Pressable
                    onPress={() =>
                      setShowRegisterPassword((current) => !current)
                    }
                    style={({ pressed }) => [
                      styles.passwordEyeButton,
                      pressed && styles.linkButtonPressed,
                    ]}
                  >
                    <Ionicons
                      color={palette.muted}
                      name={
                        showRegisterPassword ? "eye-off-outline" : "eye-outline"
                      }
                      size={rf(19)}
                    />
                  </Pressable>
                </View>

                <Text style={[styles.label, { color: palette.text }]}>
                  Confirmar contrasena
                </Text>
                <View
                  style={[
                    styles.passwordField,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.surfaceAlt,
                    },
                  ]}
                >
                  <TextInput
                    ref={registerConfirmPasswordInputRef}
                    style={[styles.passwordInput, { color: palette.text }]}
                    value={registerForm.confirmPassword}
                    onChangeText={(value) =>
                      setRegisterForm((current) => ({
                        ...current,
                        confirmPassword: value,
                      }))
                    }
                    placeholder="Repite la contrasena"
                    placeholderTextColor={palette.placeholder}
                    secureTextEntry={!showRegisterConfirmPassword}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onFocus={() => scrollToFocusedInput(vs(410))}
                    onSubmitEditing={handleSignUp}
                  />
                  <Pressable
                    onPress={() =>
                      setShowRegisterConfirmPassword((current) => !current)
                    }
                    style={({ pressed }) => [
                      styles.passwordEyeButton,
                      pressed && styles.linkButtonPressed,
                    ]}
                  >
                    <Ionicons
                      color={palette.muted}
                      name={
                        showRegisterConfirmPassword
                          ? "eye-off-outline"
                          : "eye-outline"
                      }
                      size={rf(19)}
                    />
                  </Pressable>
                </View>
              </>
            )}

            {mode === modes.recovery && (
              <>
                <Text style={[styles.label, { color: palette.text }]}>
                  Correo del usuario
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.surfaceAlt,
                      color: palette.text,
                    },
                  ]}
                  value={recoveryEmail}
                  onChangeText={setRecoveryEmail}
                  placeholder="correo@dominio.com"
                  placeholderTextColor={palette.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            )}

            {isInvitation && (
              <>
                <Text style={[styles.label, { color: palette.text }]}>
                  Codigo de invitacion opcional
                </Text>
                <TextInput
                  ref={invitationCodeInputRef}
                  style={[
                    styles.input,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.surfaceAlt,
                      color: palette.text,
                    },
                  ]}
                  value={invitationForm.invitationCode}
                  onChangeText={(value) =>
                    setInvitationForm((current) => ({
                      ...current,
                      invitationCode: value,
                    }))
                  }
                  placeholder="INV-000001"
                  placeholderTextColor={palette.placeholder}
                  autoCapitalize="characters"
                  returnKeyType="next"
                  onFocus={() => scrollToFocusedInput(vs(130))}
                  onSubmitEditing={() =>
                    invitationNameInputRef.current?.focus()
                  }
                />

                <Text style={[styles.label, { color: palette.text }]}>
                  Nombre completo
                </Text>
                <TextInput
                  ref={invitationNameInputRef}
                  style={[
                    styles.input,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.surfaceAlt,
                      color: palette.text,
                    },
                  ]}
                  value={invitationForm.fullName}
                  onChangeText={(value) =>
                    setInvitationForm((current) => ({
                      ...current,
                      fullName: value,
                    }))
                  }
                  placeholder="Nombre del tecnico"
                  placeholderTextColor={palette.placeholder}
                  returnKeyType="next"
                  onFocus={() => scrollToFocusedInput(vs(190))}
                  onSubmitEditing={() =>
                    invitationPhoneInputRef.current?.focus()
                  }
                />

                <Text style={[styles.label, { color: palette.text }]}>
                  Telefono
                </Text>
                <TextInput
                  ref={invitationPhoneInputRef}
                  style={[
                    styles.input,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.surfaceAlt,
                      color: palette.text,
                    },
                  ]}
                  value={invitationForm.phone}
                  onChangeText={(value) =>
                    setInvitationForm((current) => ({
                      ...current,
                      phone: value,
                    }))
                  }
                  placeholder="Numero de contacto"
                  placeholderTextColor={palette.placeholder}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  onFocus={() => scrollToFocusedInput(vs(250))}
                  onSubmitEditing={() =>
                    invitationEmailInputRef.current?.focus()
                  }
                />

                <Text style={[styles.label, { color: palette.text }]}>
                  Correo
                </Text>
                <TextInput
                  ref={invitationEmailInputRef}
                  style={[
                    styles.input,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.surfaceAlt,
                      color: palette.text,
                    },
                  ]}
                  value={invitationForm.email}
                  onChangeText={(value) =>
                    setInvitationForm((current) => ({
                      ...current,
                      email: value,
                    }))
                  }
                  placeholder="correo@dominio.com"
                  placeholderTextColor={palette.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onFocus={() => scrollToFocusedInput(vs(310))}
                  onSubmitEditing={() =>
                    invitationPasswordInputRef.current?.focus()
                  }
                />

                <Text style={[styles.label, { color: palette.text }]}>
                  Contrasena
                </Text>
                <View
                  style={[
                    styles.passwordField,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.surfaceAlt,
                    },
                  ]}
                >
                  <TextInput
                    ref={invitationPasswordInputRef}
                    style={[styles.passwordInput, { color: palette.text }]}
                    value={invitationForm.password}
                    onChangeText={(value) =>
                      setInvitationForm((current) => ({
                        ...current,
                        password: value,
                      }))
                    }
                    placeholder="Minimo 6 caracteres"
                    placeholderTextColor={palette.placeholder}
                    secureTextEntry={!showInvitationPassword}
                    autoCapitalize="none"
                    returnKeyType="next"
                    onFocus={() => scrollToFocusedInput(vs(380))}
                    onSubmitEditing={() =>
                      invitationConfirmPasswordInputRef.current?.focus()
                    }
                  />
                  <Pressable
                    onPress={() =>
                      setShowInvitationPassword((current) => !current)
                    }
                    style={({ pressed }) => [
                      styles.passwordEyeButton,
                      pressed && styles.linkButtonPressed,
                    ]}
                  >
                    <Ionicons
                      color={palette.muted}
                      name={
                        showInvitationPassword
                          ? "eye-off-outline"
                          : "eye-outline"
                      }
                      size={rf(19)}
                    />
                  </Pressable>
                </View>

                <Text style={[styles.label, { color: palette.text }]}>
                  Confirmar contrasena
                </Text>
                <View
                  style={[
                    styles.passwordField,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.surfaceAlt,
                    },
                  ]}
                >
                  <TextInput
                    ref={invitationConfirmPasswordInputRef}
                    style={[styles.passwordInput, { color: palette.text }]}
                    value={invitationForm.confirmPassword}
                    onChangeText={(value) =>
                      setInvitationForm((current) => ({
                        ...current,
                        confirmPassword: value,
                      }))
                    }
                    placeholder="Repite la contrasena"
                    placeholderTextColor={palette.placeholder}
                    secureTextEntry={!showInvitationConfirmPassword}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onFocus={() => scrollToFocusedInput(vs(450))}
                    onSubmitEditing={handleInvitationActivation}
                  />
                  <Pressable
                    onPress={() =>
                      setShowInvitationConfirmPassword((current) => !current)
                    }
                    style={({ pressed }) => [
                      styles.passwordEyeButton,
                      pressed && styles.linkButtonPressed,
                    ]}
                  >
                    <Ionicons
                      color={palette.muted}
                      name={
                        showInvitationConfirmPassword
                          ? "eye-off-outline"
                          : "eye-outline"
                      }
                      size={rf(19)}
                    />
                  </Pressable>
                </View>
              </>
            )}

            {!!feedback && (
              <Text style={[styles.infoText, { color: palette.accent }]}>
                {feedback}
              </Text>
            )}
            {!!error && (
              <Text style={[styles.errorText, { color: palette.danger }]}>
                {error}
              </Text>
            )}

            <Pressable
              onPress={
                mode === modes.recovery
                  ? handleRecovery
                  : isInvitation
                    ? handleInvitationActivation
                    : isRegister
                      ? handleSignUp
                      : handleLogin
              }
              disabled={authBusy}
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: palette.accent },
                authBusy && styles.submitButtonDisabled,
                pressed && styles.pressed,
              ]}
            >
              {authBusy ? (
                <ActivityIndicator color={palette.white} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {mode === modes.recovery
                    ? "Enviar enlace"
                    : isInvitation
                      ? "Activar cuenta"
                      : isRegister
                        ? "Crear cuenta"
                        : "Entrar"}
                </Text>
              )}
            </Pressable>

            {isLogin && (
              <View style={styles.secondaryLinks}>
                <Pressable
                  onPress={() => {
                    resetMessages();
                    setRecoveryEmail(loginForm.email);
                    setMode(modes.recovery);
                  }}
                  style={({ pressed }) => [
                    styles.linkButton,
                    pressed && styles.linkButtonPressed,
                  ]}
                >
                  <Text
                    style={[styles.linkButtonText, { color: palette.info }]}
                  >
                    Recuperar contrasena
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    resetMessages();
                    setMode(modes.invitation);
                  }}
                  style={({ pressed }) => [
                    styles.linkButton,
                    pressed && styles.linkButtonPressed,
                  ]}
                >
                  <Text
                    style={[styles.linkButtonText, { color: palette.info }]}
                  >
                    Activar invitacion
                  </Text>
                </Pressable>
              </View>
            )}

            {isRegister && (
              <Pressable
                onPress={() => {
                  resetMessages();
                  setMode(modes.invitation);
                }}
                style={({ pressed }) => [
                  styles.linkButton,
                  pressed && styles.linkButtonPressed,
                ]}
              >
                <Text style={[styles.linkButtonText, { color: palette.info }]}>
                  Tengo una invitacion
                </Text>
              </Pressable>
            )}

            {mode === modes.recovery && (
              <Pressable
                onPress={() => {
                  resetMessages();
                  setMode(modes.login);
                }}
                style={({ pressed }) => [
                  styles.linkButton,
                  pressed && styles.linkButtonPressed,
                ]}
              >
                <Text style={[styles.linkButtonText, { color: palette.info }]}>
                  Volver al login
                </Text>
              </Pressable>
            )}

            <Text style={[styles.securityHint, { color: palette.muted }]}>
              {isInvitation
                ? "La activacion valida el correo invitado y, si existe un codigo, lo toma como referencia adicional antes de crear tu perfil operativo."
                : isRegister
                  ? "Al crear tu cuenta se genera tu perfil operativo y queda lista para acceder al taller."
                  : "Al continuar, tus datos locales se vinculan con tu espacio seguro en la nube."}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function resolveHeroIcon(mode, index) {
  if (mode === modes.invitation) {
    return (
      ["key-outline", "shield-checkmark-outline", "construct-outline"][index] ||
      "ellipse-outline"
    );
  }

  if (mode === modes.register) {
    return (
      ["person-add-outline", "document-text-outline", "cloud-upload-outline"][
        index
      ] || "ellipse-outline"
    );
  }

  if (mode === modes.recovery) {
    return (
      ["mail-open-outline", "lock-closed-outline"][index] || "ellipse-outline"
    );
  }

  return (
    ["cloud-done-outline", "shield-checkmark-outline", "car-sport-outline"][
      index
    ] || "ellipse-outline"
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
  keyboardContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: vs(48),
    gap: vs(18),
  },
  heroCard: {
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    padding: spacing.xl,
    gap: vs(10),
    shadowOffset: { width: 0, height: s(8) },
    shadowOpacity: 0.12,
    shadowRadius: s(18),
    elevation: 10,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.74)",
    fontSize: rf(12),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: rf(26),
    fontWeight: "800",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: rf(14),
    lineHeight: vs(20),
  },
  heroHighlights: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: hs(10),
    marginTop: vs(8),
  },
  heroHighlightPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: hs(6),
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    paddingHorizontal: hs(12),
    paddingVertical: vs(8),
  },
  heroHighlightText: {
    color: "#ffffff",
    fontSize: rf(12),
    fontWeight: "700",
  },
  formCard: {
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    padding: spacing.lg,
    gap: vs(10),
    shadowOffset: { width: 0, height: s(8) },
    shadowOpacity: 0.08,
    shadowRadius: s(18),
    elevation: 8,
  },
  modeSwitch: {
    flexDirection: "row",
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    padding: s(4),
    marginBottom: vs(8),
  },
  modeButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: vs(12),
    alignItems: "center",
  },
  modeButtonActive: {
    backgroundColor: "#000000",
  },
  modeButtonText: {
    fontSize: rf(14),
    fontWeight: "700",
  },
  modeButtonTextActive: {
    color: "#ffffff",
  },
  label: {
    fontSize: rf(13),
    fontWeight: "700",
    marginTop: vs(4),
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: hs(14),
    paddingVertical: vs(14),
    fontSize: rf(15),
  },
  passwordField: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingLeft: hs(14),
    paddingRight: hs(6),
  },
  passwordInput: {
    flex: 1,
    paddingVertical: vs(14),
    fontSize: rf(15),
  },
  passwordEyeButton: {
    width: s(38),
    height: s(38),
    borderRadius: s(19),
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: rf(13),
    fontWeight: "600",
    marginTop: vs(4),
  },
  infoText: {
    fontSize: rf(13),
    fontWeight: "600",
    marginTop: vs(4),
  },
  submitButton: {
    marginTop: vs(12),
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: vs(15),
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: rf(15),
    fontWeight: "800",
  },
  linkButton: {
    alignItems: "center",
    paddingTop: vs(8),
  },
  linkButtonPressed: {
    opacity: 0.75,
  },
  linkButtonText: {
    fontSize: rf(13),
    fontWeight: "700",
  },
  secondaryLinks: {
    gap: vs(4),
  },
  securityHint: {
    marginTop: vs(4),
    fontSize: rf(12),
    lineHeight: vs(18),
    textAlign: "center",
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
