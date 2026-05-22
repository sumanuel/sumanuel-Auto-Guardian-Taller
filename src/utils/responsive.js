import { Dimensions, PixelRatio, Platform } from "react-native";

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;
const MIN_SCALE = 0.85;
const MAX_SCALE_PHONE = 1.6;
const MAX_SCALE_TABLET = 3.5;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getWidthScale = () => {
  const { width } = Dimensions.get("window");
  return clamp(width / BASE_WIDTH, MIN_SCALE, MAX_SCALE_PHONE);
};

const getHeightScale = () => {
  const { height } = Dimensions.get("window");
  return clamp(height / BASE_HEIGHT, MIN_SCALE, MAX_SCALE_PHONE);
};

export const isTablet = () => {
  const { width, height } = Dimensions.get("window");
  return Math.min(width, height) >= 600;
};

export const isSmallDevice = () => {
  const { width, height } = Dimensions.get("window");
  return Math.min(width, height) < 375;
};

export const isLargeDevice = () => {
  const { width, height } = Dimensions.get("window");
  return Math.min(width, height) > 800;
};

const getScale = () => {
  const { width, height } = Dimensions.get("window");
  const tablet = isTablet();
  const baseWidth = tablet ? 600 : BASE_WIDTH;
  const baseHeight = tablet ? 1024 : BASE_HEIGHT;
  const widthScale = clamp(
    width / baseWidth,
    MIN_SCALE,
    tablet ? MAX_SCALE_TABLET : MAX_SCALE_PHONE,
  );
  const heightScale = clamp(
    height / baseHeight,
    MIN_SCALE,
    tablet ? MAX_SCALE_TABLET : MAX_SCALE_PHONE,
  );

  return Math.min(
    widthScale,
    heightScale,
    tablet ? MAX_SCALE_TABLET : MAX_SCALE_PHONE,
  );
};

export const s = (size) => size * getScale();

export const ms = (size, factor = 0.7) => {
  const scaled = s(size);
  return size + (scaled - size) * factor;
};

export const rf = (fontSize, factor = isTablet() ? 1 : 0.8) => {
  const scaled = ms(fontSize, factor);
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

export const vs = (size) => size * getHeightScale();
export const hs = (size) => size * getWidthScale();

export const screenWidth = Dimensions.get("window").width;
export const screenHeight = Dimensions.get("window").height;

export const platformScale = (size) => {
  const platformMultiplier = Platform.OS === "android" ? 1.02 : 1;
  return size * getScale() * platformMultiplier;
};

export const spacing = {
  xs: s(4),
  sm: s(6),
  md: s(12),
  lg: s(18),
  xl: s(24),
  xxl: s(36),
};

export const borderRadius = {
  sm: s(6),
  md: s(12),
  lg: s(18),
  xl: s(24),
  pill: s(999),
};

export const iconSize = {
  xs: s(16),
  sm: s(20),
  md: s(28),
  lg: s(44),
  xl: s(56),
  xxl: s(60),
};
