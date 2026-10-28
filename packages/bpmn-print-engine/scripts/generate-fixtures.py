#!/usr/bin/env python3
"""Generate reviewable, per-page BPMN fixtures from the pizza test source.

This is a fixture helper, NOT the production BPMN partitioner. It intentionally
creates small, inspectable BPMN print views so reviewers can open each page in
bpmn-js/KHI Flows and comment on lane continuity and page transitions.
"""
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tests" / "fixtures" / "pizza-process.bpmn"
OUTPUT = ROOT / "tests" / "fixtures" / "generated"
NS = {
    "bpmn": "http://www.omg.org/spec/BPMN/20100524/MODEL",
    "bpmndi": "http://www.omg.org/spec/BPMN/20100524/DI",
    "dc": "http://www.omg.org/spec/DD/20100524/DC",
    "di": "http://www.omg.org/spec/DD/20100524/DI",
}
for prefix, uri in NS.items():
    ET.register_namespace(prefix, uri)
ET.register_namespace("xsi", "http://www.w3.org/2001/XMLSchema-instance")

PAGE_WIDTH = 760.0
PAGE_LEFT = 40.0
PAGE_TOP = 40.0
LANE_HEIGHT = 180.0
PAGE_GAP = 50.0
SHAPE_TAG = f"{{{NS['bpmndi']}}}BPMNShape"
BOUNDS_TAG = f"{{{NS['dc']}}}Bounds"
FLOW_TAG = f"{{{NS['bpmn']}}}sequenceFlow"
LANE_TAG = f"{{{NS['bpmn']}}}lane"
REF_TAG = f"{{{NS['bpmn']}}}flowNodeRef"
SHAPE_BOUNDS = f"{{{NS['dc']}}}Bounds"

tree = ET.parse(SOURCE)
root = tree.getroot()
process = root.find(".//bpmn:process", NS)
plane = root.find(".//bpmndi:BPMNPlane", NS)
if process is None or plane is None:
    raise SystemExit("Fixture invalide : process ou BPMNPlane introuvable")

nodes = {node.get("id"): node for node in list(process) if node.tag.endswith(("startEvent", "endEvent", "task", "userTask", "serviceTask", "exclusiveGateway", "parallelGateway"))}
shape_by_id = {}
for shape in plane.findall("bpmndi:BPMNShape", NS):
    bpmn_id = shape.get("bpmnElement")
    bounds = shape.find("dc:Bounds", NS)
    if bpmn_id and bounds is not None:
        shape_by_id[bpmn_id] = (shape, bounds)
if not nodes or not shape_by_id:
    raise SystemExit("Fixture invalide : aucun nœud ou shape BPMN DI")

# Partition by element center; keep whole shapes and preserve the original lanes
# on each page. This helper is intentionally not the production algorithm.
page_for = {}
for node_id in nodes:
    if node_id not in shape_by_id:
        continue
    bounds = shape_by_id[node_id][1]
    center = float(bounds.get("x", "0")) + float(bounds.get("width", "0")) / 2
    page_for[node_id] = int(max(0, center - PAGE_LEFT) // PAGE_WIDTH)

page_count = max(page_for.values(), default=0) + 1
OUTPUT.mkdir(parents=True, exist_ok=True)
for old in OUTPUT.glob("pizza-page-*.bpmn"):
    old.unlink()

for page_index in range(page_count):
    definitions = ET.Element(f"{{{NS['bpmn']}}}definitions", {
        "id": f"Definitions_Pizza_Print_Page_{page_index + 1}",
        "targetNamespace": "https://example.org/khi-flows/pizza-print-test/generated",
    })
    page_process = ET.SubElement(definitions, f"{{{NS['bpmn']}}}process", {
        "id": f"Process_Pizza_Print_Page_{page_index + 1}",
        "name": f"Préparer et livrer une pizza — page {page_index + 1}/{page_count}",
        "isExecutable": "false",
    })
    lane_set = ET.SubElement(page_process, f"{{{NS['bpmn']}}}laneSet", {"id": f"LaneSet_Page_{page_index + 1}"})
    lane_ids = []
    # Keep both lane bands on every page, even when one is temporarily empty.
    for lane_pos, (lane_id, lane_name, y) in enumerate((("Lane_Kitchen", "Cuisine", 40), ("Lane_Delivery", "Livraison", 220))):
        lane = ET.SubElement(lane_set, f"{{{NS['bpmn']}}}lane", {"id": f"{lane_id}_P{page_index + 1}", "name": lane_name})
        lane_ids.append((lane, y))
    selected = [node_id for node_id in nodes if page_for.get(node_id) == page_index]
    # Add continuation marker nodes at page boundaries; these are print-only
    # annotations represented as tasks so they remain visible in BPMN editors.
    if page_index > 0:
        marker_id = f"Continuation_From_P{page_index}"
        marker = ET.SubElement(page_process, f"{{{NS['bpmn']}}}task", {"id": marker_id, "name": f"Suite de la page {page_index}"})
        selected.insert(0, marker_id)
        nodes[marker_id] = marker
    if page_index < page_count - 1:
        marker_id = f"Continuation_To_P{page_index + 2}"
        marker = ET.SubElement(page_process, f"{{{NS['bpmn']}}}task", {"id": marker_id, "name": f"Suite page {page_index + 2}"})
        selected.append(marker_id)
        nodes[marker_id] = marker
    for node_id in selected:
        node = nodes[node_id]
        if node_id not in page_process.attrib and node.getparent if False else False:
            pass
        # Re-create the node to avoid moving it out of the source tree.
        clone = ET.fromstring(ET.tostring(node, encoding="unicode"))
        page_process.append(clone)
        for lane, _ in lane_ids:
            # Lane membership is filled below from source lane memberships.
            pass
    # Build lane membership based on source fixture; continuation markers stay
    # in the lane of the last/first visible source element on the corresponding side.
    source_lane_membership = {}
    for lane in process.findall(".//bpmn:lane", NS):
        for ref in lane.findall("bpmn:flowNodeRef", NS):
            source_lane_membership[ref.text] = (lane.get("id"), lane.get("name"))
    for node_id in selected:
        if node_id in source_lane_membership:
            lane_id, _ = source_lane_membership[node_id]
            target_lane = next(l for l, _ in lane_ids if l.get("name") == source_lane_membership[node_id][1])
        else:
            # Boundary markers follow the nearest source lane where possible.
            target_lane = lane_ids[0][0] if page_index == 0 else lane_ids[1][0]
        ET.SubElement(target_lane, REF_TAG).text = node_id
    # Preserve sequence flows only when both endpoints are on this page.
    for flow in process.findall("bpmn:sequenceFlow", NS):
        source_id, target_id = flow.get("sourceRef"), flow.get("targetRef")
        if page_for.get(source_id) == page_index and page_for.get(target_id) == page_index:
            page_process.append(ET.fromstring(ET.tostring(flow, encoding="unicode")))
    # Add a minimal DI plane with all lanes and selected node shapes.
    diagram = ET.SubElement(definitions, f"{{{NS['bpmndi']}}}BPMNDiagram", {"id": f"Diagram_Page_{page_index + 1}"})
    out_plane = ET.SubElement(diagram, f"{{{NS['bpmndi']}}}BPMNPlane", {"id": f"Plane_Page_{page_index + 1}", "bpmnElement": page_process.get("id")})
    for lane, y in lane_ids:
        shape = ET.SubElement(out_plane, SHAPE_TAG, {"id": f"{lane.get('id')}_di", "bpmnElement": lane.get("id"), "isHorizontal": "true"})
        ET.SubElement(shape, BOUNDS_TAG, {"x": str(PAGE_LEFT), "y": str(y), "width": str(PAGE_WIDTH), "height": str(LANE_HEIGHT)})
    for node_id in selected:
        source_entry = shape_by_id.get(node_id)
        if source_entry:
            original_shape, original_bounds = source_entry
            x = float(original_bounds.get("x", "0"))
            width = float(original_bounds.get("width", "100"))
            y = float(original_bounds.get("y", "80"))
            height = float(original_bounds.get("height", "80"))
            page_left = PAGE_LEFT + page_index * PAGE_WIDTH
            x_out = PAGE_LEFT + max(10, x - page_left)
        else:
            x_out = PAGE_LEFT + 10 if node_id.startswith("Continuation_From") else PAGE_LEFT + PAGE_WIDTH - 140
            y = 100 if page_index == 0 else 280
            width, height = 120, 80
        shape = ET.SubElement(out_plane, SHAPE_TAG, {"id": f"{node_id}_di", "bpmnElement": node_id})
        ET.SubElement(shape, BOUNDS_TAG, {"x": str(x_out), "y": str(y), "width": str(width), "height": str(height)})
    ET.indent(definitions, space="  ")
    output_path = OUTPUT / f"pizza-page-{page_index + 1:02d}.bpmn"
    ET.ElementTree(definitions).write(output_path, encoding="utf-8", xml_declaration=True)
    print(output_path.relative_to(ROOT))
print(f"Généré {page_count} pages à partir de {SOURCE.name}")
