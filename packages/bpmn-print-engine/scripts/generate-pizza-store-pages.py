#!/usr/bin/env python3
"""Generate four A4-portrait visual BPMN pages from the real Pizza-Store model.

The BPMN semantic model is kept intact on each page. Only BPMN-DI is sliced,
so these files are print/review views, not independent executable processes.
This is a reference-fixture generator for the engine work, not the production
pagination/partitioning implementation.
"""
from copy import deepcopy
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tests" / "fixtures" / "Pizza-Store.bpmn"
OUTPUT = ROOT / "tests" / "fixtures" / "generated"
NS = {
    "bpmn": "http://www.omg.org/spec/BPMN/20100524/MODEL",
    "bpmndi": "http://www.omg.org/spec/BPMN/20100524/DI",
    "dc": "http://www.omg.org/spec/DD/20100524/DC",
    "di": "http://www.omg.org/spec/DD/20100524/DI",
}
for prefix, uri in (("bpmn2", NS["bpmn"]), ("bpmndi", NS["bpmndi"]),
                    ("dc", NS["dc"]), ("di", NS["di"])):
    ET.register_namespace(prefix, uri)

BPMN = "{" + NS["bpmn"] + "}"
BPMNDI = "{" + NS["bpmndi"] + "}"
DC = "{" + NS["dc"] + "}"
DI = "{" + NS["di"] + "}"
PAGE_COUNT = 4
# Boundaries deliberately fall between shapes in the reference model.
# Four horizontal windows produce four A4 portrait print views.
X_BOUNDS = (40.0, 440.0, 665.0, 990.0, 1373.0)
Y_MIN, Y_MAX = 120.0, 970.0
PAGE_W, PAGE_H = 595.0, 842.0
MARGIN = 40.0
CONTENT_W, CONTENT_H = PAGE_W - 2 * MARGIN, PAGE_H - 2 * MARGIN


def local(tag):
    return tag.rsplit("}", 1)[-1]


def attr_float(element, name):
    return float(element.get(name, "0"))


def clip_polyline(points, left, right):
    """Clip an orthogonal/non-orthogonal polyline to a vertical page window."""
    if len(points) < 2:
        return []
    clipped = []
    for (x1, y1), (x2, y2) in zip(points, points[1:]):
        dx, dy = x2 - x1, y2 - y1
        low, high = 0.0, 1.0
        if abs(dx) < 1e-9:
            if x1 < left or x1 > right:
                continue
        else:
            t1, t2 = (left - x1) / dx, (right - x1) / dx
            low, high = max(0.0, min(t1, t2)), min(1.0, max(t1, t2))
            if low > high:
                continue
        a = (x1 + low * dx, y1 + low * dy)
        b = (x1 + high * dx, y1 + high * dy)
        if not clipped or clipped[-1] != a:
            clipped.append(a)
        if clipped[-1] != b:
            clipped.append(b)
    return clipped


def main():
    source_root = ET.parse(SOURCE).getroot()
    diagrams = source_root.findall("bpmndi:BPMNDiagram", NS)
    if len(diagrams) != 1:
        raise SystemExit(f"Expected one BPMNDiagram, got {len(diagrams)}")
    source_plane = diagrams[0].find("bpmndi:BPMNPlane", NS)
    if source_plane is None:
        raise SystemExit("BPMNPlane missing")

    shapes = source_plane.findall("bpmndi:BPMNShape", NS)
    edges = source_plane.findall("bpmndi:BPMNEdge", NS)
    shape_info = {}
    for shape in shapes:
        bounds = shape.find("dc:Bounds", NS)
        if bounds is not None:
            shape_info[shape.get("bpmnElement")] = (
                shape, bounds, attr_float(bounds, "x"), attr_float(bounds, "y"),
                attr_float(bounds, "width"), attr_float(bounds, "height")
            )

    OUTPUT.mkdir(parents=True, exist_ok=True)
    for stale in OUTPUT.glob("pizza-store-page-*.bpmn"):
        stale.unlink()

    for page_index in range(PAGE_COUNT):
        left, right = X_BOUNDS[page_index:page_index + 2]
        width, height = right - left, Y_MAX - Y_MIN
        scale = min(CONTENT_W / width, CONTENT_H / height)
        rendered_w, rendered_h = width * scale, height * scale
        offset_x = MARGIN + (CONTENT_W - rendered_w) / 2
        offset_y = MARGIN + (CONTENT_H - rendered_h) / 2

        root = deepcopy(source_root)
        plane = root.find(".//bpmndi:BPMNPlane", NS)
        for child in list(plane):
            tag = local(child.tag)
            if tag == "BPMNShape":
                element_id = child.get("bpmnElement")
                info = shape_info.get(element_id)
                bounds = child.find("dc:Bounds", NS)
                if info is None or bounds is None:
                    plane.remove(child)
                    continue
                _, _, x, y, w, h = info
                # Pools and lanes are clipped to the page. Other shapes are
                # kept whole and assigned by their center to avoid cut nodes.
                source_element = next((e for e in source_root.iter()
                                       if e.get("id") == element_id), None)
                kind = local(source_element.tag) if source_element is not None else ""
                if kind in {"participant", "lane"}:
                    x0, x1 = max(x, left), min(x + w, right)
                    if x1 <= x0:
                        plane.remove(child)
                        continue
                    bounds.set("x", f"{offset_x + (x0 - left) * scale:.3f}")
                    bounds.set("width", f"{(x1 - x0) * scale:.3f}")
                else:
                    center = x + w / 2
                    if not (left <= center < right or
                            (page_index == PAGE_COUNT - 1 and center <= right)):
                        plane.remove(child)
                        continue
                    bounds.set("x", f"{offset_x + (x - left) * scale:.3f}")
                    bounds.set("width", f"{w * scale:.3f}")
                bounds.set("y", f"{offset_y + (y - Y_MIN) * scale:.3f}")
                bounds.set("height", f"{h * scale:.3f}")
            elif tag == "BPMNEdge":
                points = []
                for waypoint in child.findall("di:waypoint", NS):
                    points.append((attr_float(waypoint, "x"), attr_float(waypoint, "y")))
                clipped = clip_polyline(points, left, right)
                if len(clipped) < 2:
                    plane.remove(child)
                    continue
                for waypoint in list(child.findall("di:waypoint", NS)):
                    child.remove(waypoint)
                for x, y in clipped:
                    ET.SubElement(child, DI + "waypoint", {
                        "x": f"{offset_x + (x - left) * scale:.3f}",
                        "y": f"{offset_y + (y - Y_MIN) * scale:.3f}",
                    })
            else:
                plane.remove(child)

        out = OUTPUT / f"pizza-store-page-{page_index + 1:02d}.bpmn"
        ET.ElementTree(root).write(out, encoding="utf-8", xml_declaration=True)

    print(f"Generated {PAGE_COUNT} A4 portrait BPMN review pages from {SOURCE.name}")


if __name__ == "__main__":
    main()
