import { Realm } from "realm";



export class ClassOfGrading extends Realm.Object<ClassOfGrading> {
  _id!: Realm.BSON.ObjectId;
  name!: string;
  photo?: string;
  priority!: number;
  categories!: Realm.List<Category>;
  objects!: Realm.List<GradeObject>;


  tags?: Tag[];
  rankTypes?: RankType[]

  noteName?: string;
  notesName?: string;
  objectName?: string;
  objectsName?: string;
  
  static schema: Realm.ObjectSchema = {
    name: "ClassOfGrading",
    primaryKey: "_id",
    properties: {
      _id: "objectId",
      name: { type: "string", indexed: true },
      photo: "string?",
      priority: { type: "int", default: 1 },
      categories: { type: "list", objectType: "Category" },
      objects: { type: "list", objectType: "GradeObject" },
      tags: { type: "list", objectType: "Tag" },
      rankTypes: { type: "list", objectType: "RankType" },

      objectName: "string?",  // Единственное число (Character)
      objectsName: "string?", // Множественное (Characters)
      noteName: "string?",    // Заметка (Note)
      notesName: "string?",   // Заметки (Notes)
    },
  };
}

export class RankType extends Realm.Object<RankType> {
  _id!: Realm.BSON.ObjectId;
  name!: string;
  fromRank!: number;
  color?: string;
  createdAt!: Date;
  static schema: Realm.ObjectSchema = {
    name: "RankType",
    primaryKey: "_id",
    properties: {
      _id: "objectId",
      name: "string",
      fromRank: "float",
      color: "string?",
      createdAt: "date",
    },
  };
}
export class Tag extends Realm.Object<Tag> {
  _id!: Realm.BSON.ObjectId;
  name!: string;
  createdAt!: Date;

  parentTag?: Tag;

  subTags!: Realm.List<Tag>;
  static schema: Realm.ObjectSchema = {
    name: "Tag",
    primaryKey: "_id",
    properties: {
      _id: "objectId",
      name: { type: "string", indexed: true },
      createdAt: "date",
      parentTag: "Tag?",
      subTags: { type: "list", objectType: "Tag" },
    },
  };
}


export class Category extends Realm.Object<Category> {
  _id!: Realm.BSON.ObjectId;
  name!: string;
  class_of_category!: ClassOfGrading;
  subcategories!: Realm.List<SubCategory>;
  priority!: number;
  weight?: number;
  static schema: Realm.ObjectSchema = {
    name: "Category",
    primaryKey: "_id",
    properties: {
      _id: "objectId",
      name: "string",
      class_of_category: "ClassOfGrading",
      subcategories: { type: "list", objectType: "SubCategory" },
      priority: "int",
      weight: "int"
    },
  };
}

export class SubCategory extends Realm.Object<SubCategory> {
  _id!: Realm.BSON.ObjectId;
  name!: string;
  category!: Category;
  priority!: number;
  weight?: number;
  static schema: Realm.ObjectSchema = {
    name: "SubCategory",
    primaryKey: "_id",
    properties: {
      _id: "objectId",
      name: "string",
      category: "Category",
      priority: 'int'
    },
  };
}

export class GradeObject extends Realm.Object<GradeObject> {
  _id!: Realm.BSON.ObjectId;
  name!: string;
  photo?: string;
  class_of_object!: ClassOfGrading;
  categories_of_object!: Realm.List<CategoryOfObject>;
  overall_rank?: number | null;
  media!: Realm.List<MediaItem>;
  notes!: Realm.List<Note>;
  tags!: Realm.List<Tag>;
  description?: string;

  object_name?: string
  static schema: Realm.ObjectSchema = {
    name: "GradeObject",
    primaryKey: "_id",
    properties: {
      _id: "objectId",
      name: { type: "string", indexed: true },

      photo: "string?",
      class_of_object: "ClassOfGrading",
      overall_rank: "float?",
      categories_of_object: { type: "list", objectType: "CategoryOfObject" },
      media: { type: "list", objectType: "MediaItem" },
      notes: { type: "list", objectType: "Note" },
      tags: { type: "list", objectType: "Tag" },
      description: "string?",
      object_name: "string?",
      note_name: "string?",
      galery_name: "string?"
    },
  };
}

export class MediaItem extends Realm.Object<MediaItem> {
  uri!: string;
  mediaType!: string;
  mimeType?: string;
  thumbnailUri?: string;
  caption?: string;
  createdAt!: Date;

  static schema: Realm.ObjectSchema = {
    name: "MediaItem",
    embedded: true,
    properties: {
      uri: "string",
      mediaType: "string",
      mimeType: "string?",
      thumbnailUri: "string?",
      caption: "string?",
      createdAt: "date",
    },
  };
}

export class Note extends Realm.Object<Note> {
  text!: string;
  author?: string;
  pinned?: boolean;
  createdAt!: Date;
  photoUri?: string;
  static schema: Realm.ObjectSchema = {
    name: "Note",
    embedded: true,
    properties: {
      text: "string",
      author: "string?",
      pinned: { type: "bool", default: false },
      createdAt: "date",
      photoUri: "string?",
    },
  };
}



export class CategoryOfObject extends Realm.Object<CategoryOfObject> {
  _id!: Realm.BSON.ObjectId;
  category!: Category;                  
  object!: GradeObject;                 
  rank?: number | null;
  subcategories_of_category!: Realm.List<SubCategoryOfObject>;
  proof?: Proof;

  static schema: Realm.ObjectSchema = {
    name: "CategoryOfObject",
    primaryKey: "_id",
    
    properties: {
      _id: "objectId",
      category: "Category",
      object: "GradeObject",
      rank: { type: "float", optional: true},
      subcategories_of_category: { type: "list", objectType: "SubCategoryOfObject" },
      proof: "Proof?",
      
    },
  };
}


export class SubCategoryOfObject extends Realm.Object<SubCategoryOfObject> {
  _id!: Realm.BSON.ObjectId;
  subcategory!: SubCategory;           
  category_of_object!: CategoryOfObject;
  rank?: number | null;
  proof?: Proof;
  color?: string;
  static schema: Realm.ObjectSchema = {
    name: "SubCategoryOfObject",
    primaryKey: "_id",
    properties: {
      _id: "objectId",
      subcategory: "SubCategory",
      category_of_object: "CategoryOfObject",
      rank: { type: "float", optional: true},
      proof: "Proof?",
      color: "string?"
    },
  };
}
export class Proof extends Realm.Object<Proof> {
  image?: string;
  text?: string;

  static schema: Realm.ObjectSchema = {
    name: "Proof",
    embedded: true,
    properties: {
      image: "string?",
      text: "string?",
    },
  };
}
export class LeaderboardEntry extends Realm.Object<LeaderboardEntry> {
  _id!: Realm.BSON.ObjectId;
  classOfGrading!: ClassOfGrading;
  category!: Category;
  object!: GradeObject;
  rankValue!: number;
  period?: string;
  updatedAt!: Date;

  static schema = {
    name: "LeaderboardEntry",
    primaryKey: "_id",
    properties: {
      _id: "objectId",
      classOfGrading: "ClassOfGrading?",
      category: "Category?",
      object: "GradeObject",
      rankValue: "float",
      period: "string?",
      updatedAt: "date",
    },
  };
}


export const SCHEMAS = [
  ClassOfGrading,
  Category,
  SubCategory,
  GradeObject,
  CategoryOfObject,
  SubCategoryOfObject,
  Proof,
  LeaderboardEntry,
  MediaItem,
  Note,
  Tag,
  RankType
];





