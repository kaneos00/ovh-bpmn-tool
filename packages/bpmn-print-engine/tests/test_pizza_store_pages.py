"""Tests for the two A4-portrait Pizza-Store review pages."""
from pathlib import Path
import subprocess
import sys
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tests" / "fixtures" / "Pizza-Store.bpmn"
GENERATED = ROOT / "tests" / "fixtures" / "generated"
SCRIPT = ROOT / "scripts" / "generate-pizza-store-pages.py"
NS = {
    "bpmn": "http://www.omg.org/spec/BPMN/20100524/MODEL",
    "bpmndi": "http://www.omg.org/spec/BPMN/20100524/DI",
    "dc": "http://www.omg.org/spec/DD/20100524/DC",
    "di": "http://www.omg.org/spec/DD/20100524/DI",
}


class PizzaStorePageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.run([sys.executable, str(SCRIPT)], check=True)

    def test_generates_exactly_two_well_formed_pages(self):
        pages = sorted(GENERATED.glob("pizza-store-page-*.bpmn"))
        self.assertEqual(len(pages), 2)
        ET.parse(SOURCE)
        for page in pages:
            with self.subTest(page=page.name):
                ET.parse(page)

    def test_page_views_preserve_the_complete_bpmn_semantic_model(self):
        source = ET.parse(SOURCE).getroot()
        source_ids = {
            element.get("id") for element in source.iter()
            if element.get("id") and element.tag.startswith("{" + NS["bpmn"] + "}")
        }
        for page in sorted(GENERATED.glob("pizza-store-page-*.bpmn")):
            root = ET.parse(page).getroot()
            page_ids = {
                element.get("id") for element in root.iter()
                if element.get("id") and element.tag.startswith("{" + NS["bpmn"] + "}")
            }
            with self.subTest(page=page.name):
                self.assertEqual(page_ids, source_ids)
                self.assertEqual(len(root.findall(".//bpmn:participant", NS)), 2)
                self.assertEqual(len(root.findall(".//bpmn:messageFlow", NS)), 6)

    def test_all_page_shapes_fit_inside_a4_portrait_di(self):
        pages = sorted(GENERATED.glob("pizza-store-page-*.bpmn"))
        for page in pages:
            root = ET.parse(page).getroot()
            shapes = root.findall(".//bpmndi:BPMNShape", NS)
            self.assertTrue(shapes, page.name)
            for shape in shapes:
                bounds = shape.find("dc:Bounds", NS)
                if bounds is None:
                    continue
                x, y = float(bounds.get("x")), float(bounds.get("y"))
                width, height = float(bounds.get("width")), float(bounds.get("height"))
                with self.subTest(page=page.name, shape=shape.get("bpmnElement")):
                    self.assertGreaterEqual(x, -0.01)
                    self.assertGreaterEqual(y, -0.01)
                    self.assertLessEqual(x + width, 595.01)
                    self.assertLessEqual(y + height, 842.01)

    def test_lane_geometry_is_consistent_between_pages(self):
        pages = sorted(GENERATED.glob("pizza-store-page-*.bpmn"))
        lane_geometry = []
        for page in pages:
            root = ET.parse(page).getroot()
            lanes = {}
            for shape in root.findall(".//bpmndi:BPMNShape", NS):
                element_id = shape.get("bpmnElement")
                element = next((e for e in root.iter() if e.get("id") == element_id), None)
                if element is None or element.tag != "{" + NS["bpmn"] + "}lane":
                    continue
                bounds = shape.find("dc:Bounds", NS)
                lanes[element.get("name")] = (
                    round(float(bounds.get("x")), 3),
                    round(float(bounds.get("width")), 3),
                    round(float(bounds.get("y")), 3),
                    round(float(bounds.get("height")), 3),
                )
            lane_geometry.append(lanes)
        self.assertEqual(set(lane_geometry[0]), set(lane_geometry[1]))
        for name in lane_geometry[0]:
            with self.subTest(lane=name):
                self.assertEqual(lane_geometry[0][name][1:], lane_geometry[1][name][1:])
                self.assertAlmostEqual(lane_geometry[0][name][1], lane_geometry[1][name][1], places=2)

    def test_lanes_keep_their_header_inset_inside_the_participant_pool(self):
        for page in sorted(GENERATED.glob("pizza-store-page-*.bpmn")):
            root = ET.parse(page).getroot()
            shapes = root.findall(".//bpmndi:BPMNShape", NS)
            by_element = {shape.get("bpmnElement"): shape for shape in shapes}
            participant_ids = {
                e.get("id") for e in root.findall(".//bpmn:participant", NS)
            }
            lane_ids = {e.get("id") for e in root.findall(".//bpmn:lane", NS)}
            participant = by_element[next(iter(participant_ids))]
            pool_bounds = participant.find("dc:Bounds", NS)
            pool_x = float(pool_bounds.get("x"))
            pool_right = pool_x + float(pool_bounds.get("width"))
            for lane_id in lane_ids:
                bounds = by_element[lane_id].find("dc:Bounds", NS)
                lane_x = float(bounds.get("x"))
                lane_right = lane_x + float(bounds.get("width"))
                with self.subTest(page=page.name, lane=lane_id):
                    self.assertGreater(lane_x, pool_x, "lane header must not overlap pool label")
                    self.assertAlmostEqual(lane_right, pool_right, places=2)

    def test_edges_are_clipped_to_each_page_without_dropping_crossing_flows(self):
        pages = sorted(GENERATED.glob("pizza-store-page-*.bpmn"))
        edge_ids = []
        for page in pages:
            root = ET.parse(page).getroot()
            edge_ids.append({e.get("bpmnElement") for e in root.findall(".//bpmndi:BPMNEdge", NS)})
        self.assertTrue(edge_ids[0])
        self.assertTrue(edge_ids[1])
        self.assertTrue(edge_ids[0] & edge_ids[1], "cross-page flow should be represented on both page views")

    def test_every_page_contains_both_participants_and_lanes(self):
        for page in sorted(GENERATED.glob("pizza-store-page-*.bpmn")):
            root = ET.parse(page).getroot()
            with self.subTest(page=page.name):
                self.assertEqual(len(root.findall(".//bpmn:participant", NS)), 2)
                lane_names = {lane.get("name") for lane in root.findall(".//bpmn:lane", NS)}
                self.assertEqual(lane_names, {"clerk", "pizza chef", "Delivery boy"})


if __name__ == "__main__":
    unittest.main()
