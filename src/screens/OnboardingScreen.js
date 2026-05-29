import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { borderRadius, rf, spacing } from "../utils/responsive";

const ONBOARDING_STORAGE_KEY = "@ag_taller_onboarding_completed";
const { width } = Dimensions.get("window");

const slides = [
  {
    key: "control",
    eyebrow: "Centro operativo",
    title: "Control claro desde el primer acceso",
    description:
      "Revisa agenda, diagnosticos y ordenes recientes en una sola vista pensada para decisiones rapidas del taller.",
    icon: "speedometer-outline",
    highlights: ["Agenda compacta", "Filtros por fecha", "Prioridad operativa"],
  },
  {
    key: "flow",
    eyebrow: "Flujo tecnico",
    title: "Del diagnostico a la entrega sin perder contexto",
    description:
      "Abre diagnosticos, convierte a orden, registra avances y conserva una trazabilidad limpia por unidad.",
    icon: "git-merge-outline",
    highlights: ["Diagnostico", "Orden", "Cronologia historica"],
  },
  {
    key: "team",
    eyebrow: "Equipo y control",
    title: "Asignacion y responsabilidad visibles",
    description:
      "Cada orden puede tener responsables definidos antes de iniciar, evitando trabajo sin trazabilidad operativa.",
    icon: "people-outline",
    highlights: ["Responsables", "Estados claros", "Reglas de inicio"],
  },
  {
    key: "history",
    eyebrow: "Historial confiable",
    title: "Historial por unidad pensado para consulta real",
    description:
      "Mantiene diagnosticos cerrados, ordenes entregadas y cronologias separadas para consultar sin ruido operativo.",
    icon: "shield-checkmark-outline",
    highlights: ["Vehiculos", "Historial operativo", "Entrega final"],
  },
];

export default function OnboardingScreen({ onComplete }) {
  const { colors, isDarkMode } = useTheme();
  const scrollRef = useRef(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const palette = useMemo(
    () => ({
      page: isDarkMode ? "#090b0d" : "#101317",
      hero: isDarkMode ? "#12161b" : "#171b20",
      panel: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.06)",
      panelStrong: isDarkMode
        ? "rgba(255,255,255,0.08)"
        : "rgba(255,255,255,0.1)",
      border: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.12)",
      text: "#f5f7fa",
      muted: "rgba(245,247,250,0.74)",
      accent: colors.accent,
      primary: colors.primary,
    }),
    [colors.accent, colors.primary, isDarkMode],
  );

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } finally {
      onComplete?.();
    }
  };

  const handleNext = () => {
    if (currentSlide >= slides.length - 1) {
      completeOnboarding();
      return;
    }

    const nextIndex = currentSlide + 1;
    setCurrentSlide(nextIndex);
    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
  };

  const handlePrevious = () => {
    if (currentSlide <= 0) {
      return;
    }

    const previousIndex = currentSlide - 1;
    setCurrentSlide(previousIndex);
    scrollRef.current?.scrollTo({ x: previousIndex * width, animated: true });
  };

  const handleScroll = (event) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentSlide(nextIndex);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.page }]}>
      <View style={styles.topBar}>
        <View
          style={[
            styles.brandPill,
            {
              backgroundColor: palette.panel,
              borderColor: palette.border,
            },
          ]}
        >
          <Ionicons
            color={palette.accent}
            name="construct-outline"
            size={rf(15)}
          />
          <Text style={[styles.brandPillText, { color: palette.text }]}>
            Auto-Guardian Taller
          </Text>
        </View>

        <Pressable onPress={completeOnboarding} style={styles.skipAction}>
          <Text style={[styles.skipText, { color: palette.muted }]}>
            Saltar
          </Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {slides.map((slide, index) => {
          const isActive = index === currentSlide;

          return (
            <View key={slide.key} style={styles.slide}>
              <View
                style={[
                  styles.heroCard,
                  {
                    backgroundColor: palette.hero,
                    borderColor: palette.border,
                  },
                ]}
              >
                <View style={styles.visualStack}>
                  <View
                    style={[
                      styles.logoFrame,
                      {
                        backgroundColor: palette.panel,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <Image
                      source={require("../../assets/icon.png")}
                      resizeMode="contain"
                      style={styles.logoImage}
                    />
                  </View>

                  <View
                    style={[
                      styles.iconBadge,
                      {
                        backgroundColor: palette.panelStrong,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <Ionicons
                      color={palette.accent}
                      name={slide.icon}
                      size={rf(18)}
                    />
                    <Text
                      style={[styles.iconBadgeText, { color: palette.text }]}
                    >
                      {slide.eyebrow}
                    </Text>
                  </View>
                </View>

                <View style={styles.copyBlock}>
                  <Text style={[styles.kicker, { color: palette.accent }]}>
                    Paso {index + 1}
                  </Text>
                  <Text style={[styles.title, { color: palette.text }]}>
                    {slide.title}
                  </Text>
                  <Text style={[styles.description, { color: palette.muted }]}>
                    {slide.description}
                  </Text>
                </View>

                <View style={styles.highlightRow}>
                  {slide.highlights.map((item) => (
                    <View
                      key={item}
                      style={[
                        styles.highlightChip,
                        {
                          backgroundColor: palette.panel,
                          borderColor: palette.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.highlightChipText,
                          { color: palette.text },
                        ]}
                      >
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>

                <View
                  style={[
                    styles.progressCard,
                    {
                      backgroundColor: palette.panel,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.progressLabel, { color: palette.muted }]}
                  >
                    Estado de introduccion
                  </Text>
                  <Text style={[styles.progressValue, { color: palette.text }]}>
                    {String(index + 1).padStart(2, "0")} /{" "}
                    {String(slides.length).padStart(2, "0")}
                  </Text>
                  <View style={styles.indicatorTrack}>
                    {slides.map((_, indicatorIndex) => (
                      <View
                        key={`${slide.key}-${indicatorIndex}`}
                        style={[
                          styles.indicatorDot,
                          {
                            backgroundColor:
                              indicatorIndex === index
                                ? palette.accent
                                : palette.border,
                            flex: indicatorIndex === index ? 1.4 : 1,
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          disabled={currentSlide === 0}
          onPress={handlePrevious}
          style={[
            styles.secondaryAction,
            {
              backgroundColor: palette.panel,
              borderColor: palette.border,
              opacity: currentSlide === 0 ? 0.45 : 1,
            },
          ]}
        >
          <Text style={[styles.secondaryActionText, { color: palette.text }]}>
            Anterior
          </Text>
        </Pressable>

        <Pressable
          onPress={handleNext}
          style={[styles.primaryAction, { backgroundColor: palette.primary }]}
        >
          <Text style={styles.primaryActionText}>
            {isActiveLastSlide(currentSlide) ? "Entrar" : "Continuar"}
          </Text>
          <Ionicons
            color="#ffffff"
            name="arrow-forward-outline"
            size={rf(18)}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function isActiveLastSlide(currentSlide) {
  return currentSlide === slides.length - 1;
}

export { ONBOARDING_STORAGE_KEY };

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  brandPillText: {
    fontSize: rf(12),
    fontWeight: "800",
  },
  skipAction: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  skipText: {
    fontSize: rf(13),
    fontWeight: "700",
  },
  slide: {
    width,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  heroCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    justifyContent: "space-between",
    gap: spacing.xl,
  },
  visualStack: {
    gap: spacing.md,
    alignItems: "center",
  },
  logoFrame: {
    width: rf(168),
    height: rf(168),
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  iconBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBadgeText: {
    fontSize: rf(12),
    fontWeight: "800",
  },
  copyBlock: {
    gap: spacing.sm,
  },
  kicker: {
    fontSize: rf(11),
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    fontSize: rf(28),
    lineHeight: rf(34),
    fontWeight: "900",
  },
  description: {
    fontSize: rf(14),
    lineHeight: rf(22),
    fontWeight: "500",
  },
  highlightRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  highlightChip: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  highlightChipText: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  progressCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  progressLabel: {
    fontSize: rf(11),
    fontWeight: "700",
  },
  progressValue: {
    fontSize: rf(18),
    fontWeight: "900",
  },
  indicatorTrack: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  indicatorDot: {
    height: rf(6),
    borderRadius: borderRadius.pill,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  secondaryAction: {
    flex: 0.9,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    minHeight: rf(50),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  secondaryActionText: {
    fontSize: rf(14),
    fontWeight: "800",
  },
  primaryAction: {
    flex: 1.2,
    borderRadius: borderRadius.lg,
    minHeight: rf(50),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    gap: spacing.xs,
  },
  primaryActionText: {
    color: "#ffffff",
    fontSize: rf(14),
    fontWeight: "900",
  },
});
