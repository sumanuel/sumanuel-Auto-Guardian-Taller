import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { TOUCH } from "../../utils/touch";

// Tira de miniaturas. Toque = ver en pantalla completa. Con onRemove muestra
// una "x" grande para quitar la foto antes de guardar.
// photos: array de strings (uri local) o de { url }.
export default function PhotoStrip({ photos = [], onRemove, size = 88 }) {
  const { colors } = useTheme();
  const [viewerUri, setViewerUri] = useState(null);

  const items = photos
    .map((photo, index) => ({
      index,
      uri: typeof photo === "string" ? photo : photo?.url,
    }))
    .filter((item) => item.uri);

  if (!items.length) {
    return null;
  }

  return (
    <>
      <View style={styles.row}>
        {items.map((item) => (
          <View key={`${item.uri}-${item.index}`} style={{ width: size }}>
            <Pressable
              accessibilityLabel="Ver foto"
              accessibilityRole="imagebutton"
              onPress={() => setViewerUri(item.uri)}
            >
              <Image
                source={{ uri: item.uri }}
                style={[
                  styles.thumb,
                  {
                    width: size,
                    height: size,
                    borderColor: colors.border,
                    backgroundColor: colors.cardMuted,
                  },
                ]}
              />
            </Pressable>
            {onRemove ? (
              <Pressable
                accessibilityLabel="Quitar foto"
                accessibilityRole="button"
                hitSlop={TOUCH.hitSlop}
                onPress={() => onRemove(item.index)}
                style={[styles.remove, { backgroundColor: colors.danger }]}
              >
                <Ionicons color={colors.white} name="close" size={22} />
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setViewerUri(null)}
        statusBarTranslucent
        transparent
        visible={Boolean(viewerUri)}
      >
        <Pressable onPress={() => setViewerUri(null)} style={styles.viewer}>
          {viewerUri ? (
            <Image
              resizeMode="contain"
              source={{ uri: viewerUri }}
              style={styles.viewerImage}
            />
          ) : null}
          <View style={styles.viewerClose}>
            <Ionicons color="#ffffff" name="close" size={32} />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  thumb: { borderRadius: 12, borderWidth: 1 },
  remove: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  viewer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
    justifyContent: "center",
  },
  viewerImage: { width: "100%", height: "88%" },
  viewerClose: { position: "absolute", top: 48, right: 24 },
});
