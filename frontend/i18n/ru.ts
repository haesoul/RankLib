
export const ru = {
  translation: {
    common: {
      cancel: "Отмена",
      close: "Закрыть",
      save: "Сохранить",
      save_changes: "Сохранить изменения",
      delete: "Удалить",
      create: "Создать",
      done: "Готово",
      back: "Назад",
      edit: "Редактировать",
      editing: "Редактирование",
      change: "Изменить",
      changing: "Изменение",
      add: "Добавить",
      settings: "Настройки",
      yes: "Да",
      no: "Нет",
      ok: 'Ок',
      delete_all: "Удалить все",
      delete_selected: "Удалить выбранное",
      delete_all_confirmation: "Вы точно хотите удалить все данные? Это действие необратимо.",
      deletion: "Удаление",
      loading: "Загрузка...",
      name: "Название",
      new_name: "Новое название",
      name_placeholder: "Введите название",
      description: "Описание",
      without_name: "Без названия",
      search: "Поиск",
      confirm: "Подвердить",
      png_export: "Экспортировать в png",
      success_export: "Фото успешно сохранено в галерею",
      cards: "Карточки",
      variant: "Вариант",
      removal_requirements: "Введите код подтверждения для удаления:",
      calculations: "Расчеты",
      modes: "Режимы", 
      pro_mode: "Pro режим"
    },

    categories: {
      reorder: "Переставить",
      new_category_placeholder: "Новая категория",
      new_subcategory_placeholder: "Новая подкатегория",
      no_categories: "Нет категорий",
      no_subcategories: "Нет подкатегорий",
      top_categories: "Топ Категорий",
      categories: "Категории",
      delete: "Удалить категорию",
      delete_sub: "Удалить подкатегорию",
      weight: "Вес",
      change_weight: "Изменить вес",
      weight_meaning: "Важность категории (Вес)"
    },

    class: {
      create: "Создать класс",
      create_new: "Создать новый класс",
      create_rank_type: "Создать тип ранга",
      rank_types: "Типы ранга",
      delete_class: "Удалить класс",
      name_placeholder: "Название класса",
      priority_placeholder: "Приоритет (число)",
      class: "Класс",
      not_found: "Класс не найден",
      no_objects: "Объектов нет",
      main_info: "Основная информация",
      explained_priority: "Приоритет (Сортировка)",

      terminology: "Терминология",
      terminology_setting: "Настройте способ маркировки объектов и заметок в пользовательском интерфейсе.",

      object_name: "Объект (в единственном числе)",
      objects_name: "Объекты (во множественном числе)",
      note_name: "Заметка (в единственном числе)",
      notes_name: "Заметки (во множественном числе)",

      class_card: "Карточка класса",

      pro_mode: "Pro режим",
      
    },

    tags: {
      tags: "Тэги",
      tags_for_all_objects: "Тэги для всех объектов",
      select_tags: "Выбрать тэги",
      tags_selected: "тэг(ов) выбрано",
      no_tags_in_class: "В этом классе пока нет тэгов",
      filter_by_tags: "Фильтрация по тэгам"
    },

    object: {
      create: "Создать объект",
      mass_create: "Массовое создание объектов",
      failed_delete: "Не удалось удалить объект",
      object: "Объект",
      deletion: "Удаление объекта",
      deletion_warn_msg: "Удалить объект?",
      auto_calc_cats_based_by_subs: "Автоматический подсчет ранга категорий",
      auto_calc_object_by_cats: "Автоматический подсчет ранга объекта",
      not_found: "Объект не найден",
      name_placeholder: "Название объекта",
      add_fields: "Добавить поля (макс. 100)",
      compare: "Сравнить объекты"
    },

    gallery: {
      missing_id_warning: "GalleryScreen: отсутствует параметр id",
      empty_text: "Нет медиа",
      play_video: "Воспроизвести",
      not_found: "Видео не найдено",
      no_gallery_permission: "Нет доступа к галерее"
    },

    notes: {
      no_notes: "Пока нет заметок",
      read_more: "Читать далее",
      notes: "Заметки",
      creating: "Новая заметка",
      create: "Записать",
      delete_title: "Удалить заметку?",
      delete_message: "Вы точно хотите удалить заметку? Это действие необратимо.",
      attachment: "Вложение"
    },

    grading: {
      top9: 'Топ 9',
      top10: 'Топ 10',
      top100: 'Топ 100',
      grade: "Оценка",
      rank: "Ранг",
      update_rank_placeholder: "Обновить ранг",
      leaderboard: "Таблица лидеров",
      batch_grading: "Множественная оценка"
    },

    pickImage: {
      pick: "Выбрать фото",
      photo_copy_error: "Ошибка копирования фото:",
      change_photo: "Изменить фото",
    },
    language: {
      change_language: "Изменить язык",
      select_language: "Выберите язык",
    },
    pro_mode: {
      create_by_json: "Создать через JSON",
      json_executor: "JSON Script Executor",
      insert_example: "Вставить пример",
      execute_script: "Выполнить скрипт",
      create_only_warning: "Только операция CREATE. Изменения необратимы.",
      field_docs: "Документация по полям",
      single_object: "Один объект",
      batch_objects: "Массово (массив)",
      success_single: 'Класс "{{name}}" успешно создан',
      success_batch: "Создано классов: {{count}}",
      docs_note_single: "Скрипт принимает JSON-объект. Допустимые поля:",
      docs_note_batch: "Скрипт принимает массив JSON-объектов []. Каждый элемент:",
      categories_warning: "⚠ Создание объектов — через отдельные Pro-экраны.",
      schema_name: "Название класса",
      schema_priority: "Приоритет сортировки (по умолчанию 1)",
      schema_object_name: 'Объект — ед. число (напр. "Персонаж")',
      schema_objects_name: 'Объекты — мн. число (напр. "Персонажи")',
      schema_note_name: 'Заметка — ед. число (напр. "Заметка")',
      schema_notes_name: 'Заметки — мн. число (напр. "Заметки")',
      schema_overall_rank: "Числовой ранг объекта",
      schema_description: "Текст описания в свободной форме",
      success_single_object: "Объект \"{{name}}\" создан",
      success_batch_objects: "Создано объектов: {{count}}",
      object_extra_warning: "Категории, медиафайлы, заметки и теги можно добавить только после создания, внутри самого объекта.",
      class_not_found: "Класс не найден — проверьте id в маршруте"
    }
  },
};

export default ru;