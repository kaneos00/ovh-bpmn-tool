"""Structural checks for the human-reviewable per-page BPMN fixtures."""
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests" / "fixtures"
GENERATED = FIXTURES / "generated"
BPMN = {"bpmn": "http://www.omg.org/spec/BPMN/20100524/MODEL"}
DI = {
    "bpmndi": "http://www.omg.org/spec/BPMN/20100524/DI",
    "dc": "http://www.omg.org/spec/DD/20100524/DC",
    "di": "http://www.omg.org/spec/DD/20100524/DI",
}


class GeneratedFixtureTests(unittest.TestCase):
    def test_source_and_generated_pages_are_well_formed_xml(self):
        files = [FIXTURES / "pizza-process.bpmn", *sorted(GENERATED.glob("pizza-page-*.bpmn"))]
        self.assertEqual(len(files), 4, "Expected source plus three committed print pages")
        for path in files:
            with self.subTest(file=path.name):
                ET.parse(path)

    def test_generated_pages_have_lanes_and_continuation_markers(self):
        pages = sorted(GENERATED.glob("pizza-page-*.bpmn"))
        self.assertEqual(len(pages), 3)
        for index, path in enumerate(pages, start=1):
            root = ET.parse(path).getroot()
            lanes = root.findall(".//bpmn:lane", BPMN)
            lane_names = {lane.get("name") for lane in lanes}
            self.assertEqual(lane_names, {"Cuisine", "Livraison"})
            node_ids = {node.get("id") for node in root.findall(".//bpmn:process/*", BPMN)}
            if index > 1:
                self.assertIn(f"Continuation_From_P{index - 1}", node_ids)
            if index < len(pages):
                self.assertIn(f"Continuation_To_P{index + 1}", node_ids)

    def test_all_sequence_flow_endpoints_exist_on_the_same_page(self):
        for path in sorted(GENERATED.glob("pizza-page-*.bpmn")):
            root = ET.parse(path).getroot()
            process = root.find(".//bpmn:process", BPMN)
            node_ids = {
                node.get("id") for node in list(process)
                if node.tag.rsplit("}", 1)[-1] not in {"laneSet", "sequenceFlow"}
            }
            for flow in process.findall("bpmn:sequenceFlow", BPMN):
                with self.subTest(file=path.name, flow=flow.get("id")):
                    self.assertIn(flow.get("sourceRef"), node_ids)
                    self.assertIn(flow.get("targetRef"), node_ids)

    def test_lane_references_and_di_references_are_resolvable(self):
        for path in sorted(GENERATED.glob("pizza-page-*.bpmn")):
            root = ET.parse(path).getroot()
            process = root.find(".//bpmn:process", BPMN)
            ids = {element.get("id") for element in root.iter() if element.get("id")}
            for ref in process.findall(".//bpmn:flowNodeRef", BPMN):
                with self.subTest(file=path.name, lane_ref=ref.text):
                    self.assertIn(ref.text, ids)
            flows = {flow.get("id") for flow in process.findall("bpmn:sequenceFlow", BPMN)}
            for edge in root.findall(".//bpmndi:BPMNEdge", DI):
                with self.subTest(file=path.name, edge=edge.get("id")):
                    self.assertIn(edge.get("bpmnElement"), flows)


if __name__ == "__main__":
    unittest.main()
