"""
Утилиты преобразования вложенного payload из Realm в плоскую структуру Django.
Идентификаторы embedded Realm-объектов должны укладываться в CharField(max_length=24).
"""

from typing import Any, Dict, List
import logging
import re

logger = logging.getLogger(__name__)


def stable_embedded_id(parent_id: str, kind: str, index: int = 0) -> str:
    """Детерминированный 24-символьный ID для embedded-записей Realm."""
    value = f"{parent_id}:{kind}:{index}"
    seeds = (0x811C9DC5, 0x9E3779B9, 0x85EBCA6B)
    hashes = []
    for seed in seeds:
        h = seed
        for char in value:
            h ^= ord(char)
            h = (h * 0x01000193) & 0xFFFFFFFF
        hashes.append(f"{h:08x}")
    return "".join(hashes)


def _ref_id(value: Any):
    if isinstance(value, dict):
        return value.get("_id") or value.get("id")
    return value


def _embedded_id(item: Dict[str, Any], parent_id: str, kind: str, index: int) -> str:
    value = item.get("_id") or item.get("id")
    # Django uses 24-character IDs. Legacy clients generated longer IDs; remap them.
    if value is not None and re.fullmatch(r"[a-fA-F0-9]{24}", str(value)):
        return str(value).lower()
    return stable_embedded_id(parent_id, kind, index)


def flatten_realm_data(data: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
    """Convert nested frontend data into the flat model arrays expected by ExportService."""
    flat_data: Dict[str, List[Dict[str, Any]]] = {
        key: [] for key in (
            "ClassOfGrading", "Category", "SubCategory", "GradeObject", "Tag",
            "RankType", "MediaItem", "Note", "CategoryOfObject",
            "SubCategoryOfObject", "Proof", "ObjectTag", "ClassTag", "ClassRankType",
        )
    }

    try:
        for class_data in data.get("ClassOfGrading", []) or []:
            class_id = str(class_data["_id"])
            flat_data["ClassOfGrading"].append({
                "_id": class_id,
                "name": class_data.get("name", "Unnamed Class"),
                "photo": class_data.get("photo"),
                "photo_base64": class_data.get("photo_base64"),
                "priority": class_data.get("priority", 1),
                "objectName": class_data.get("objectName"),
                "objectsName": class_data.get("objectsName"),
                "noteName": class_data.get("noteName"),
                "notesName": class_data.get("notesName"),
            })

            for category in class_data.get("categories", []) or []:
                category_id = str(category["_id"])
                flat_data["Category"].append({
                    "_id": category_id,
                    "name": category.get("name", "Unnamed Category"),
                    "priority": category.get("priority", 1),
                    "weight": category.get("weight"),
                    "class_of_grading": class_id,
                })
                for subcategory in category.get("subcategories", []) or []:
                    flat_data["SubCategory"].append({
                        "_id": str(subcategory["_id"]),
                        "name": subcategory.get("name", "Unnamed SubCategory"),
                        "priority": subcategory.get("priority", 1),
                        "weight": subcategory.get("weight"),
                        "category": category_id,
                    })

            for obj in class_data.get("objects", []) or []:
                object_id = str(obj["_id"])
                flat_data["GradeObject"].append({
                    "_id": object_id,
                    "name": obj.get("name", "Unnamed Object"),
                    "photo": obj.get("photo"),
                    "photo_base64": obj.get("photo_base64"),
                    "object_name": obj.get("object_name"),
                    "note_name": obj.get("note_name"),
                    "galery_name": obj.get("galery_name"),
                    "description": obj.get("description"),
                    "overall_rank": obj.get("overall_rank"),
                    "class_of_grading": class_id,
                })

                for index, media in enumerate(obj.get("media", []) or []):
                    flat_data["MediaItem"].append({
                        "_id": _embedded_id(media, object_id, "media", index),
                        "uri": media.get("uri"),
                        "uri_base64": media.get("uri_base64"),
                        "mediaType": media.get("mediaType") or "photo",
                        "mimeType": media.get("mimeType"),
                        "thumbnailUri": media.get("thumbnailUri"),
                        "thumbnail_base64": media.get("thumbnail_base64"),
                        "caption": media.get("caption"),
                        "length": media.get("length"),
                        "isFavorite": media.get("isFavorite", False),
                        "isHighlighted": media.get("isHighlighted", False),
                        "createdAt": media.get("createdAt"),
                        "grade_object": object_id,
                    })

                for index, note in enumerate(obj.get("notes", []) or []):
                    flat_data["Note"].append({
                        "_id": _embedded_id(note, object_id, "note", index),
                        "text": note.get("text", ""),
                        "author": note.get("author"),
                        "pinned": note.get("pinned", False),
                        "photoUri": note.get("photoUri"),
                        "photo_base64": note.get("photo_base64"),
                        "createdAt": note.get("createdAt"),
                        "grade_object": object_id,
                    })

                for rating in obj.get("categories_of_object", []) or []:
                    rating_id = str(rating["_id"])
                    proof_id = None
                    proof_data = rating.get("proof")
                    if proof_data is not None:
                        proof_id = stable_embedded_id(rating_id, "proof", 0)
                        flat_data["Proof"].append({
                            "_id": proof_id,
                            "image": proof_data.get("image"),
                            "image_base64": proof_data.get("image_base64"),
                            "text": proof_data.get("text"),
                        })

                    flat_data["CategoryOfObject"].append({
                        "_id": rating_id,
                        "category": _ref_id(rating.get("category")),
                        "object": object_id,
                        "rank": rating.get("rank"),
                        "proof": proof_id,
                    })

                    for subrating in rating.get("subcategories_of_category", []) or []:
                        subrating_id = str(subrating["_id"])
                        subproof_id = None
                        subproof_data = subrating.get("proof")
                        if subproof_data is not None:
                            subproof_id = stable_embedded_id(subrating_id, "proof", 0)
                            flat_data["Proof"].append({
                                "_id": subproof_id,
                                "image": subproof_data.get("image"),
                                "image_base64": subproof_data.get("image_base64"),
                                "text": subproof_data.get("text"),
                            })
                        flat_data["SubCategoryOfObject"].append({
                            "_id": subrating_id,
                            "subcategory": _ref_id(subrating.get("subcategory")),
                            "category_of_object": rating_id,
                            "rank": subrating.get("rank"),
                            "color": subrating.get("color"),
                            "proof": subproof_id,
                        })

                # M2M IDs are generated by Django. The unique constraints protect duplicates.
                for tag_ref in obj.get("tags", []) or []:
                    tag_id = _ref_id(tag_ref)
                    if tag_id:
                        flat_data["ObjectTag"].append({
                            "grade_object": object_id,
                            "tag": str(tag_id),
                        })

            for tag_ref in class_data.get("tags", []) or []:
                tag_id = _ref_id(tag_ref)
                if tag_id:
                    flat_data["ClassTag"].append({
                        "class_of_grading": class_id,
                        "tag": str(tag_id),
                    })
            for rank_ref in class_data.get("rankTypes", []) or []:
                rank_id = _ref_id(rank_ref)
                if rank_id:
                    flat_data["ClassRankType"].append({
                        "class_of_grading": class_id,
                        "rank_type": str(rank_id),
                    })

        for tag in data.get("Tag", []) or []:
            parent = _ref_id(tag.get("parentTag"))
            flat_data["Tag"].append({
                "_id": str(tag["_id"]),
                "name": tag.get("name", "Unnamed Tag"),
                "parent_tag": str(parent) if parent else None,
                "createdAt": tag.get("createdAt"),
            })

        for rank_type in data.get("RankType", []) or []:
            flat_data["RankType"].append({
                "_id": str(rank_type["_id"]),
                "name": rank_type.get("name", "Unnamed RankType"),
                "fromRank": rank_type.get("fromRank", 0),
                "color": rank_type.get("color"),
                "createdAt": rank_type.get("createdAt"),
            })

        # Accept legacy flat arrays as well. Avoid duplicating records already flattened.
        for key in flat_data:
            if key in ("ClassOfGrading", "Tag", "RankType"):
                continue
            for row in data.get(key, []) or []:
                row_id = row.get("_id")
                if not row_id or not any(existing.get("_id") == row_id for existing in flat_data[key]):
                    flat_data[key].append(row)

        total = sum(len(rows) for rows in flat_data.values())
        logger.info("Flattened %s Realm records", total)
        return flat_data
    except Exception as exc:
        logger.error("Error flattening Realm data: %s", exc, exc_info=True)
        raise ValueError(f"Failed to flatten Realm data: {exc}") from exc


def normalize_data_keys(data: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize snake_case top-level payload names to Django model names."""
    key_mapping = {
        "classes": "ClassOfGrading", "tags": "Tag", "rank_types": "RankType",
        "categories": "Category", "subcategories": "SubCategory", "objects": "GradeObject",
        "media": "MediaItem", "notes": "Note", "proofs": "Proof",
        "category_of_objects": "CategoryOfObject", "subcategory_of_objects": "SubCategoryOfObject",
        "object_tags": "ObjectTag", "class_tags": "ClassTag", "class_rank_types": "ClassRankType",
    }
    return {key_mapping.get(key, key): value for key, value in data.items()}
