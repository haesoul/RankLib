import { Platform, StyleSheet, TextStyle, ViewStyle } from "react-native";



// 2. Основная функция генерации стилей
export const getBaseStyles = (colors: any) => StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,

  // Контейнер с отступами (часто нужен для экранов с контентом)
  safeContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
  } as ViewStyle,

  // Для скроллящихся списков или контента
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 24, // Чтобы контент не прилипал к низу
  } as ViewStyle,

  // Центрирование всего (лоадеры, ошибки)
  centerAll: {
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,

  // =================================================================
  // FLEX UTILITIES (Позиционирование)
  // =================================================================
  
  // Стандартная строка (иконка + текст)
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,

  // Строка с распределением (левый и правый элементы)
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,

  // =================================================================
  // TYPOGRAPHY (Текст)
  // Важно: LineHeight критичен для Android, чтобы текст не обредался
  // =================================================================

  // Очень маленький текст (подписи, даты)
  // fontWeight '400' или '500' лучше читается в мелком размере, чем '300'
  miniText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500', 
    color: colors.textSecondary,
  } as TextStyle,

  // Обычный текст (параграфы, описания)
  baseText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400', // Regular
    color: colors.text,
  } as TextStyle,

  // Важный текст (названия полей, кнопки)
  mediumText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600', // Semi-bold
    color: colors.text,
  } as TextStyle,

  // Заголовки (H2, H3)
  // fontWeight '700' выглядит хорошо, не "сжимается", если шрифт поддерживает этот вес
  bigText: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700', // Bold
    color: colors.text,
    letterSpacing: 0.5, // Немного воздуха для заголовков
  } as TextStyle,

  // Крупные заголовки экранов (H1)
  headerText: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800', // Extra Bold
    color: colors.text,
  } as TextStyle,

  // Текст ошибки
  errorText: {
    fontSize: 12,
    marginTop: 4,
    color: colors.error,
    fontWeight: '500',
  } as TextStyle,

  // =================================================================
  // SHAPES & BORDERS (Визуал)
  // =================================================================
  
  // Карточки, инпуты
  roundedBlock: {
    borderRadius: 12,
    backgroundColor: colors.card,
    overflow: 'hidden',
  } as ViewStyle,

  // Разделитель
  divider: {
    height: 1,
    backgroundColor: colors.border,
    width: '100%',
    marginVertical: 16,
  } as ViewStyle,

  // =================================================================
  // SHADOWS (Тени)
  // iOS использует shadow*, Android использует elevation
  // =================================================================
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