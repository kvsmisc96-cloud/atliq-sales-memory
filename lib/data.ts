import snapshotJson from "../data/extracted.json";
import sourcesJson from "../data/generated/sources.json";
import crmJson from "../data/generated/crm.json";
import type { CrmRow, Snapshot, SourceDoc } from "./types";

export const snapshot = snapshotJson as unknown as Snapshot;
export const sources = sourcesJson as unknown as SourceDoc[];
export const crm = crmJson as unknown as CrmRow[];
export const TODAY = snapshot.today; // the dataset's "today": 2026-07-10

const byFile = new Map(sources.map((s) => [s.file, s]));
export const sourceText = (file: string) => byFile.get(file)?.text;
export const sourceDoc = (file: string) => byFile.get(file);

export const PEOPLE = ["Bhavin", "Dhaval", "Karandeep", "Jay"] as const;
