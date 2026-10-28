"""Tests for the four A4-portrait Pizza-Store review pages."""
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

    def test_generates_exactly_four_well_formed_pages(self):
        pages = sorted(GENERATED.glob("pizza-store-page-*.bpmn"))
        self.assertEqual(len(pages), 4)
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

    def test_every_page_contains_both_participants_and_lanes(self):
        for page in sorted(GENERATED.glob("pizza-store-page-*.bpmn")):
            root = ET.parse(page).getroot()
            with self.subTest(page=page.name):
                self.assertEqual(len(root.findall(".//bpmn:participant", NS)), 2)
                lane_names = {lane.get("name") for lane in root.findall(".//bpmn:lane", NS)}
                self.assertEqual(lane_names, {"clerk", "pizza chef", "Delivery boy"})


if __name__ == "__main__":
    unittest.main()
