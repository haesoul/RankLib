import { Platform, StyleSheet, TextStyle, ViewStyle } from "react-native";



export const getBaseStyles = (colors: any) => StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,

  safeContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
  } as ViewStyle,

  contentContainer: {
    flexGrow: 1,
    paddingBottom: 24, 
  } as ViewStyle,

  centerAll: {
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,

  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,

  miniText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500', 
    color: colors.textSecondary,
  } as TextStyle,

  baseText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    color: colors.text,
  } as TextStyle,

  mediumText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.text,
  } as TextStyle,

  bigText: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700', 
    color: colors.text,
    letterSpacing: 0.5,
  } as TextStyle,

  headerText: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: colors.text,
  } as TextStyle,

  errorText: {
    fontSize: 12,
    marginTop: 4,
    color: colors.error,
    fontWeight: '500',
  } as TextStyle,

  roundedBlock: {
    borderRadius: 12,
    backgroundColor: colors.card,
    overflow: 'hidden',
  } as ViewStyle,

  divider: {
    height: 1,
    backgroundColor: colors.border,
    width: '100%',
    marginVertical: 16,
  } as ViewStyle,

  shadowSm: {
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  } as ViewStyle,

  shadowMd: {
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 5,
      },
    }),
  } as ViewStyle,
});