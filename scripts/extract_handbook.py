from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from docx import Document
from docx.document import Document as DocumentObject
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table, _Cell
from docx.text.paragraph import Paragraph


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_DOCX = PROJECT_ROOT / "source" / "Handbook_ParknGo.docx"
DATA_PATH = PROJECT_ROOT / "src" / "data" / "handbook.json"
ASSET_DIR = PROJECT_ROOT / "public" / "assets" / "handbook"


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    cleaned = re.sub(r"[^\w\s-]", "", ascii_value.lower())
    cleaned = re.sub(r"[\s_]+", "-", cleaned).strip("-")
    return cleaned or "section"


def iter_block_items(parent):
    if isinstance(parent, DocumentObject):
        parent_element = parent.element.body
    elif isinstance(parent, _Cell):
        parent_element = parent._tc
    else:
        raise TypeError(f"Unsupported parent type: {type(parent)!r}")

    for child in parent_element.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, parent)
        elif isinstance(child, CT_Tbl):
            yield Table(child, parent)


def paragraph_images(document: Document, paragraph: Paragraph, image_map: dict[str, str]) -> list[str]:
    image_paths: list[str] = []
    embeds = paragraph._element.xpath(".//a:blip/@r:embed")

    for rel_id in embeds:
        part = document.part.related_parts[rel_id]
        filename = Path(part.partname).name
        asset_name = image_map.get(filename)
        if asset_name is None:
            asset_name = filename
            (ASSET_DIR / asset_name).write_bytes(part.blob)
            image_map[filename] = asset_name
        image_paths.append(f"/assets/handbook/{asset_name}")

    return image_paths


def extract_blocks(document: Document) -> list[dict]:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    image_map: dict[str, str] = {}
    blocks: list[dict] = []

    for block in iter_block_items(document):
        if isinstance(block, Paragraph):
            text = normalize_text(block.text)
            style_name = block.style.name if block.style else "Normal"
            images = paragraph_images(document, block, image_map)

            if images:
                blocks.append(
                    {
                        "type": "image",
                        "style": style_name,
                        "images": images,
                    }
                )

            if text:
                if style_name == "Caption":
                    blocks.append({"type": "caption", "text": text, "style": style_name})
                elif style_name == "List Paragraph":
                    blocks.append({"type": "list-item", "text": text, "style": style_name})
                else:
                    blocks.append({"type": "paragraph", "text": text, "style": style_name})

        elif isinstance(block, Table):
            rows = []
            for row in block.rows:
                rows.append([normalize_text(cell.text) for cell in row.cells])
            blocks.append({"type": "table", "rows": rows})

    return blocks


def build_payload(blocks: list[dict]) -> dict:
    title = "Handbook ParknGo"
    version = "V1.0.0"
    hero_image = None
    figure_index: list[str] = []
    intro_blocks: list[dict] = []
    sections: list[dict] = []
    current_section = None

    for block in blocks:
        if block["type"] == "image" and hero_image is None:
            hero_image = block["images"][0]
            intro_blocks.append(block)
            continue

        if block["type"] == "paragraph" and block["text"] == "Handbook ParknGo":
            title = block["text"]
            continue

        if block["type"] == "paragraph" and re.fullmatch(r"V\d+\.\d+\.\d+", block["text"]):
            version = block["text"]
            continue

        if block["type"] == "paragraph" and block.get("style") == "table of figures":
            if block["text"] != "Danh mục hình ảnh":
                figure_index.append(block["text"])
            continue

        if block["type"] == "paragraph" and block.get("style", "").startswith("Heading"):
            current_section = {
                "id": slugify(block["text"]),
                "title": block["text"],
                "blocks": [],
            }
            sections.append(current_section)
            continue

        if current_section is None:
            intro_blocks.append(block)
        else:
            current_section["blocks"].append(block)

    return {
        "title": title,
        "version": version,
        "heroImage": hero_image,
        "figureIndex": figure_index,
        "introBlocks": intro_blocks,
        "sections": sections,
        "stats": {
            "sectionCount": len(sections),
            "figureCount": len(figure_index),
        },
    }


def main() -> None:
    document = Document(str(SOURCE_DOCX))
    blocks = extract_blocks(document)
    payload = build_payload(blocks)
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {DATA_PATH}")
    print(f"Extracted {payload['stats']['figureCount']} figures and {payload['stats']['sectionCount']} sections")


if __name__ == "__main__":
    main()
