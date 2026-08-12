#!/usr/bin/env python3
"""Build EXL014–EXL023 score-free Exam Lab extracts and Desktop pack."""
from __future__ import annotations

import csv
import json
import shutil
import subprocess
import textwrap
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXAM_LAB = ROOT / "modules" / "exam-lab"
DESKTOP = Path("/Users/james/Desktop/EchoAural_EXL_ScoreFree_Pack")
FFMPEG = "/opt/homebrew/bin/ffmpeg"
USER_AGENT = "EchoAuralEXLBuilder/1.0 (educational; rights-tracked)"
EXTRACT_DURATION = 50

EXTRACTS = [
    {
        "id": "EXL014",
        "title": "Unfamiliar Latin dance extract",
        "area": "Popular music",
        "genre": "Latin dance / salsa",
        "forces": "Percussion, bass, synthesiser and layered dance textures",
        "composer": "Kevin MacLeod",
        "work": "Latin Industries",
        "movement": "Extract 0:45–1:35",
        "source_url": "https://upload.wikimedia.org/wikipedia/commons/d/d6/Latin_Industries_%28ISRC_USUAN1200015%29.mp3",
        "licence": "CC BY 3.0",
        "attribution": "Latin Industries Kevin MacLeod (incompetech.com)",
        "recording_source": "Wikimedia Commons / incompetech.com",
        "start": 45,
    },
    {
        "id": "EXL015",
        "title": "Unfamiliar Middle Eastern extract",
        "area": "World focus: Middle Eastern music",
        "genre": "Middle Eastern",
        "forces": "Strings, drums and Middle Eastern-style melodic lines",
        "composer": "Kevin MacLeod",
        "work": "East of Tunesia",
        "movement": "Extract 0:20–1:10",
        "source_url": "https://upload.wikimedia.org/wikipedia/commons/1/10/East_of_Tunesia_%28MacLeod%2C_Kevin%29_%28ISRC_USUAN1100246%29.oga",
        "licence": "CC BY 3.0",
        "attribution": "East of Tunesia Kevin MacLeod (incompetech.com)",
        "recording_source": "Wikimedia Commons / incompetech.com",
        "start": 20,
    },
    {
        "id": "EXL016",
        "title": "Unfamiliar Indian-influenced extract",
        "area": "World focus: Indian music",
        "genre": "Indian-influenced world music",
        "forces": "Sitar-like melody, percussion and drone textures",
        "composer": "Kevin MacLeod",
        "work": "Dhaka",
        "movement": "Extract 0:25–1:15",
        "source_url": "https://upload.wikimedia.org/wikipedia/commons/2/29/Dhaka_%28ISRC_USUAN1400003%29.mp3",
        "licence": "CC BY 3.0",
        "attribution": "Dhaka Kevin MacLeod (incompetech.com)",
        "recording_source": "Wikimedia Commons / incompetech.com",
        "start": 25,
    },
    {
        "id": "EXL017",
        "title": "Unfamiliar African rhythm extract",
        "area": "World focus: African music",
        "genre": "African percussion",
        "forces": "Percussion ensemble with layered rhythmic patterns",
        "composer": "Kevin MacLeod",
        "work": "Untitled African rhythm",
        "movement": "Extract 0:08–0:58",
        "source_url": "https://upload.wikimedia.org/wikipedia/commons/1/13/Untitled_African_rhythm_%28ISRC_USUAN1100028%29.mp3",
        "licence": "CC BY 3.0",
        "attribution": "Untitled African rhythm Kevin MacLeod (incompetech.com)",
        "recording_source": "Wikimedia Commons / incompetech.com",
        "start": 8,
    },
    {
        "id": "EXL018",
        "title": "Unfamiliar reggae extract",
        "area": "Popular music",
        "genre": "Reggae",
        "forces": "Electric guitar, bass, drums and keyboard textures",
        "composer": "Kevin MacLeod",
        "work": "Tea Roots",
        "movement": "Extract 0:25–1:15",
        "source_url": "https://upload.wikimedia.org/wikipedia/commons/6/6d/Tea_Roots_%28MacLeod%2C_Kevin%29_%28ISRC_USUAN1100472%29.oga",
        "licence": "CC BY 3.0",
        "attribution": "Tea Roots Kevin MacLeod (incompetech.com)",
        "recording_source": "Wikimedia Commons / incompetech.com",
        "start": 25,
    },
    {
        "id": "EXL019",
        "title": "Unfamiliar Japanese folk extract",
        "area": "World focus: Japanese music",
        "genre": "Japanese folk song",
        "forces": "Traditional Japanese vocal and instrumental ensemble",
        "composer": "Traditional Japanese music",
        "work": "Matsumae–Oiwake",
        "movement": "Extract 0:00–0:50 (1931 recording)",
        "source_url": "https://upload.wikimedia.org/wikipedia/commons/8/85/Matsumae--Oiwake_%281931%29.ogg",
        "licence": "Public domain",
        "attribution": "1931 field recording via Wikimedia Commons",
        "recording_source": "Wikimedia Commons (1931 recording)",
        "start": 0,
    },
    {
        "id": "EXL020",
        "title": "Unfamiliar hip-hop extract",
        "area": "Popular music",
        "genre": "Hip-hop",
        "forces": "Drum machine, bass and sampled-style textures",
        "composer": "Kevin MacLeod",
        "work": "Chillin Hard",
        "movement": "Extract 0:12–1:02",
        "source_url": "https://upload.wikimedia.org/wikipedia/commons/c/c7/Chillin_Hard_%28ISRC_USUAN1600028%29.mp3",
        "licence": "CC BY 3.0",
        "attribution": "Chillin Hard Kevin MacLeod (incompetech.com)",
        "recording_source": "Wikimedia Commons / incompetech.com",
        "start": 12,
    },
    {
        "id": "EXL021",
        "title": "Unfamiliar pop extract",
        "area": "Popular music",
        "genre": "Pop / light jazz",
        "forces": "Piano, bass, drums and melodic lead",
        "composer": "Kevin MacLeod",
        "work": "Carefree",
        "movement": "Extract 0:18–1:08",
        "source_url": "https://upload.wikimedia.org/wikipedia/commons/5/58/Kevin_MacLeod_-_Carefree.ogg",
        "licence": "CC BY 3.0",
        "attribution": "Carefree Kevin MacLeod (incompetech.com)",
        "recording_source": "Wikimedia Commons / incompetech.com",
        "start": 18,
    },
    {
        "id": "EXL022",
        "title": "Unfamiliar house / EDM extract",
        "area": "Popular music",
        "genre": "House / electronic dance music",
        "forces": "Synthesiser, drum machine and electronic bass",
        "composer": "Kevin MacLeod",
        "work": "Kick Shock",
        "movement": "Extract 0:03–0:53",
        "source_url": "https://upload.wikimedia.org/wikipedia/commons/8/80/Kick_Shock_%28ISRC_USUAN1100523%29.mp3",
        "licence": "CC BY 3.0",
        "attribution": "Kick Shock Kevin MacLeod (incompetech.com)",
        "recording_source": "Wikimedia Commons / incompetech.com",
        "start": 3,
    },
    {
        "id": "EXL023",
        "title": "Unfamiliar Celtic folk extract",
        "area": "World focus: Celtic folk music",
        "genre": "Celtic folk",
        "forces": "Fiddle, harp and folk ensemble textures",
        "composer": "Kevin MacLeod",
        "work": "Brittle Rille",
        "movement": "Extract 0:35–1:25",
        "source_url": "https://upload.wikimedia.org/wikipedia/commons/d/dc/Brittle_Rille_%28ISRC_USUAN1200047%29.mp3",
        "licence": "CC BY 3.0",
        "attribution": "Brittle Rille Kevin MacLeod (incompetech.com)",
        "recording_source": "Wikimedia Commons / incompetech.com",
        "start": 35,
    },
]


def mc(cmd, prompt, correct, options, reqs, skills, module, path, status, focus, primary, secondary):
    return {
        "type": "multiple-choice",
        "commandWord": cmd,
        "prompt": prompt,
        "correctChoice": correct,
        "options": options,
        "modelAnswer": correct,
        "cambridgeRequirements": reqs,
        "skills": skills,
        "route": {"module": module, "path": path, "status": status, "focus": focus},
        "primary_skill_code": primary,
        "secondary_skill_codes": secondary,
    }


def st(cmd, prompt, accepted, model, reqs, skills, module, path, status, focus, primary, secondary):
    return {
        "type": "short-text",
        "commandWord": cmd,
        "prompt": prompt,
        "acceptedAnswers": accepted,
        "modelAnswer": model,
        "cambridgeRequirements": reqs,
        "skills": skills,
        "route": {"module": module, "path": path, "status": status, "focus": focus},
        "primary_skill_code": primary,
        "secondary_skill_codes": secondary,
    }


QUESTIONS = {
    "EXL014": [
        mc("Identify", "From which region is this music most closely associated?", "Latin America", ["Western Europe", "Latin America", "East Asia", "Scandinavia"], ["CAM-EX-03", "CAM-EX-12"], ["world region", "Latin America", "salsa", "context"], "Context & Style", "#", "planned", "locating Latin American traditions", "CTX.GENRE", "INS.FAMILY"),
        mc("Identify", "Which family of instruments is most prominent?", "Percussion", ["Strings", "Percussion", "Brass", "Woodwind"], ["CAM-EX-03", "CAM-INS-01"], ["instrument family", "percussion", "Latin dance", "ensemble"], "Instrument Identifier", "../instrument-identifier/index.html", "live", "identifying percussion-led Latin textures", "INS.FAMILY", "CTX.GENRE"),
        st("Describe", "Describe one feature of the rhythm.", ["syncopated", "driving", "dance-like", "repeated", "energetic", "off-beat", "cross-rhythm", "lively"], "Syncopated / driving / dance-like", ["CAM-EX-03"], ["rhythm", "syncopation", "Latin dance", "pulse"], "Meter Master", "../meter-master/index.html", "live", "describing Latin dance rhythms", "RHY.DEVICE", "RHY.METRE"),
        st("Name", "Name the short repeated bass pattern heard in the extract.", ["ostinato", "repeated bass pattern", "repeated bass line", "bass ostinato", "repeated pattern"], "Ostinato", ["CAM-EX-03"], ["ostinato", "bass line", "repeated pattern", "Latin dance"], "Melody Master", "../melody-master/index.html", "live", "recognising bass ostinatos", "MEL.DEVICE", "RHY.DEVICE"),
        st("Describe", "Describe the texture when most instruments are playing.", ["layered", "homophonic", "melody and accompaniment", "thick", "dense"], "Layered / homophonic / melody and accompaniment", ["CAM-EX-03"], ["texture", "layering", "homophonic", "Latin dance"], "Texture Trainer", "../texture-trainer/index.html", "live", "describing layered dance textures", "TEX.TYPE", "TEX.ROLE"),
        mc("Identify", "Which term best describes the addition of parts to build up the music?", "Layering", ["Imitation", "Layering", "Canon", "Pedal"], ["CAM-EX-03"], ["layering", "texture", "build-up", "dance music"], "Texture Trainer", "../texture-trainer/index.html", "live", "recognising layered build-ups", "TEX.TYPE", ""),
        st("Give", "Give one way in which technology has been used in this extract.", ["synthesiser", "synthesized", "electronic", "programmed", "electronic sounds", "synth", "electronic production"], "Synthesiser / electronic sounds / programmed drums", ["CAM-EX-03"], ["music technology", "synthesiser", "electronic production", "Latin dance"], "Context & Style", "#", "planned", "identifying uses of music technology", "CTX.TECHNOLOGY", "CTX.GENRE"),
        st("Describe", "Describe one change which takes place during the extract.", ["a part is added", "a part is removed", "texture changes", "dynamics change", "instruments enter", "instruments leave", "layers are added"], "A part is added or removed / texture or dynamics change", ["CAM-EX-03"], ["change recognition", "texture", "dynamics", "structure"], "Texture Trainer", "../texture-trainer/index.html", "live", "describing audible musical changes", "TEX.TYPE", "DYN.CHANGE"),
        st("Give", "Give one feature which makes this music suitable for dancing.", ["strong beat", "steady pulse", "syncopation", "repeated rhythm", "driving rhythm", "dance rhythm", "regular beat"], "Strong beat / syncopation / driving rhythm", ["CAM-EX-03", "CAM-EX-12"], ["dance music", "pulse", "syncopation", "function"], "Context & Style", "#", "planned", "linking musical features to dance function", "CTX.GENRE", "RHY.PULSE"),
        st("Give", "Give one feature typical of Latin American dance music.", ["syncopation", "percussion", "dance rhythms", "repeated patterns", "ostinato", "cross-rhythm"], "Syncopation / percussion / dance rhythms", ["CAM-EX-03", "CAM-EX-12"], ["Latin American music", "genre features", "dance", "rhythm"], "Context & Style", "#", "planned", "recognising Latin American genre features", "CTX.GENRE", "RHY.DEVICE"),
        mc("Identify", "Choose the most suitable style for this extract.", "Latin dance music", ["Baroque suite", "Latin dance music", "Romantic symphony", "Balinese gamelan"], ["CAM-EX-03", "CAM-EX-12"], ["style recognition", "Latin dance", "genre", "context"], "Context & Style", "#", "planned", "matching extracts to popular and world styles", "CTX.GENRE", ""),
    ],
    "EXL015": [
        mc("Identify", "From which region is this music most closely associated?", "Middle East", ["Middle East", "Latin America", "Sub-Saharan Africa", "North America"], ["CAM-EX-03", "CAM-EX-12"], ["world region", "Middle East", "context", "tradition"], "Context & Style", "#", "planned", "locating Middle Eastern traditions", "CTX.GENRE", ""),
        st("Describe", "Describe the timbre of the string instruments.", ["plucked", "resonant", "bright", "nasal", "reedy", "twangy", "sharp"], "Plucked / resonant / bright", ["CAM-EX-03"], ["timbre", "strings", "Middle Eastern", "plucked"], "Instrument Identifier", "../instrument-identifier/index.html", "live", "describing Middle Eastern string timbres", "INS.INDIVIDUAL", "ART.TYPE"),
        st("Describe", "Describe one feature of the rhythm.", ["repetitive", "driving", "steady", "hypnotic", "repeated", "regular pulse", "persistent"], "Repetitive / driving / steady pulse", ["CAM-EX-03"], ["rhythm", "repetition", "Middle Eastern", "pulse"], "Meter Master", "../meter-master/index.html", "live", "describing repetitive rhythmic patterns", "RHY.DEVICE", "RHY.PULSE"),
        mc("Identify", "Which scale type is most likely to be associated with this music?", "Modal / non-Western scale", ["Major scale", "Modal / non-Western scale", "Whole-tone scale", "Chromatic scale"], ["CAM-EX-03", "CAM-EX-12"], ["scale", "mode", "Middle Eastern", "pitch"], "Context & Style", "#", "planned", "linking world traditions to scale types", "CTX.GENRE", "HAR.TONALITY"),
        st("Describe", "Describe the texture.", ["melody and accompaniment", "heterophonic", "monophonic", "layered", "melody with drone", "melody over accompaniment"], "Melody and accompaniment / heterophonic", ["CAM-EX-03"], ["texture", "heterophonic", "melody and accompaniment", "Middle Eastern"], "Texture Trainer", "../texture-trainer/index.html", "live", "describing Middle Eastern textures", "TEX.TYPE", "TEX.ROLE"),
        st("Name", "Name one percussion instrument heard in the extract.", ["drum", "drums", "frame drum", "darbuka", "tabla", "percussion", "hand drum"], "Drums / frame drum / hand drum", ["CAM-EX-03", "CAM-INS-01"], ["instrument identification", "percussion", "Middle Eastern", "drums"], "Instrument Identifier", "../instrument-identifier/index.html", "live", "recognising Middle Eastern percussion", "INS.INDIVIDUAL", "INS.FAMILY"),
        st("Describe", "Describe the role of any repeated low notes or drones.", ["pedal", "drone", "sustained", "underpins the melody", "harmonic foundation", "repeated bass"], "Drone / pedal / underpins the melody", ["CAM-EX-03"], ["drone", "pedal", "harmony", "Middle Eastern"], "Harmony Explorer", "../harmony-explorer/index.html", "live", "recognising drone textures", "HAR.TONALITY", "TEX.ROLE"),
        mc("Identify", "Which time signature is most likely?", "Simple time", ["Simple time", "Compound time", "Irregular time", "Mixed metre"], ["CAM-EX-03"], ["metre", "time signature", "simple time", "Middle Eastern"], "Meter Master", "../meter-master/index.html", "live", "identifying simple metres", "RHY.METRE", "RHY.TIME_SIGNATURE"),
        st("Give", "Give one feature typical of Middle Eastern music.", ["ornamentation", "modal melody", "drone", "plucked strings", "percussion", "improvisation", "repetitive rhythm"], "Modal melody / drone / ornamentation / plucked strings", ["CAM-EX-03", "CAM-EX-12"], ["Middle Eastern music", "genre features", "tradition", "context"], "Context & Style", "#", "planned", "recognising Middle Eastern genre features", "CTX.GENRE", "MEL.ORNAMENT"),
        st("Describe", "Describe one way in which the melody is decorated.", ["ornamented", "embellished", "trills", "slides", "grace notes", "decorative", "flourishes"], "Ornamented / embellished / slides / grace notes", ["CAM-EX-03"], ["ornamentation", "melody", "decoration", "Middle Eastern"], "Melody Master", "../melody-master/index.html", "live", "recognising melodic ornamentation", "MEL.ORNAMENT", ""),
        mc("Identify", "Choose the most suitable style for this extract.", "Middle Eastern music", ["Middle Eastern music", "Rock", "Disco", "Baroque concerto"], ["CAM-EX-03", "CAM-EX-12"], ["style recognition", "Middle Eastern", "genre", "context"], "Context & Style", "#", "planned", "matching extracts to world styles", "CTX.GENRE", ""),
    ],
    "EXL016": [
        mc("Identify", "From which part of the world is this music most closely associated?", "India", ["India", "Japan", "Ireland", "Brazil"], ["CAM-EX-03", "CAM-EX-12"], ["world region", "India", "context", "tradition"], "Context & Style", "#", "planned", "locating Indian traditions", "CTX.GENRE", ""),
        st("Name", "Name the plucked string instrument heard in the melody.", ["sitar", "plucked string", "string instrument"], "Sitar / plucked string instrument", ["CAM-EX-03", "CAM-INS-01"], ["instrument identification", "sitar", "India", "plucked strings"], "Instrument Identifier", "../instrument-identifier/index.html", "live", "recognising sitar-like timbres", "INS.INDIVIDUAL", "INS.FAMILY"),
        st("Describe", "Describe the timbre of the melodic instrument.", ["buzzing", "resonant", "nasal", "metallic", "bright", "twangy", "reedy"], "Buzzing / resonant / nasal / twangy", ["CAM-EX-03"], ["timbre", "sitar", "Indian music", "plucked strings"], "Instrument Identifier", "../instrument-identifier/index.html", "live", "describing sitar timbres", "INS.INDIVIDUAL", "ART.TYPE"),
        st("Describe", "Describe one feature of the rhythm.", ["cyclical", "repetitive", "tabla patterns", "driving", "regular", "repeated"], "Cyclical / repetitive / tabla patterns", ["CAM-EX-03"], ["rhythm", "cyclical", "Indian music", "tabla"], "Meter Master", "../meter-master/index.html", "live", "describing cyclical rhythmic patterns", "RHY.DEVICE", "RHY.METRE"),
        st("Describe", "Describe the role of any sustained low notes.", ["drone", "pedal", "sustained", "underpins the melody", "tonic drone", "harmonic foundation"], "Drone / pedal / underpins the melody", ["CAM-EX-03"], ["drone", "pedal", "Indian music", "raga"], "Harmony Explorer", "../harmony-explorer/index.html", "live", "recognising drone in Indian music", "HAR.TONALITY", "TEX.ROLE"),
        mc("Identify", "Which term describes melodic decoration in this extract?", "Ornamentation", ["Sequence", "Ornamentation", "Inversion", "Retrograde"], ["CAM-EX-03"], ["ornamentation", "melody", "Indian music", "decoration"], "Melody Master", "../melody-master/index.html", "live", "recognising melodic ornamentation", "MEL.ORNAMENT", ""),
        st("Describe", "Describe the texture.", ["melody and accompaniment", "melody with drone", "heterophonic", "monophonic", "layered"], "Melody and accompaniment / melody with drone", ["CAM-EX-03"], ["texture", "melody and accompaniment", "drone", "Indian music"], "Texture Trainer", "../texture-trainer/index.html", "live", "describing Indian instrumental textures", "TEX.TYPE", "TEX.ROLE"),
        st("Name", "Name one percussion instrument heard.", ["tabla", "drum", "drums", "hand drum", "percussion"], "Tabla / hand drum / percussion", ["CAM-EX-03", "CAM-INS-01"], ["instrument identification", "tabla", "percussion", "Indian music"], "Instrument Identifier", "../instrument-identifier/index.html", "live", "recognising tabla and percussion", "INS.INDIVIDUAL", "INS.FAMILY"),
        mc("Identify", "Which scale type is most likely to be associated with this music?", "Raga / modal scale", ["Major scale", "Raga / modal scale", "Whole-tone scale", "Chromatic scale"], ["CAM-EX-03", "CAM-EX-12"], ["scale", "raga", "Indian music", "mode"], "Context & Style", "#", "planned", "linking Indian music to raga scales", "CTX.GENRE", "HAR.TONALITY"),
        st("Give", "Give one feature typical of Indian classical or influenced music.", ["drone", "ornamentation", "cyclical rhythm", "improvisation", "raga", "tabla patterns", "sitar"], "Drone / ornamentation / cyclical rhythm / raga", ["CAM-EX-03", "CAM-EX-12"], ["Indian music", "genre features", "tradition", "context"], "Context & Style", "#", "planned", "recognising Indian genre features", "CTX.GENRE", "MEL.ORNAMENT"),
        mc("Identify", "Choose the most suitable style for this extract.", "Indian-influenced music", ["Indian-influenced music", "Reggae", "Rock", "Symphony"], ["CAM-EX-03", "CAM-EX-12"], ["style recognition", "Indian music", "genre", "context"], "Context & Style", "#", "planned", "matching extracts to world styles", "CTX.GENRE", ""),
    ],
    "EXL017": [
        mc("Identify", "From which continent is this music most closely associated?", "Africa", ["Africa", "Europe", "Asia", "Australia"], ["CAM-EX-03", "CAM-EX-12"], ["world region", "Africa", "context", "tradition"], "Context & Style", "#", "planned", "locating African traditions", "CTX.GENRE", ""),
        mc("Identify", "Which family of instruments is most prominent?", "Percussion", ["Strings", "Percussion", "Brass", "Woodwind"], ["CAM-EX-03", "CAM-INS-01"], ["instrument family", "percussion", "African music", "ensemble"], "Instrument Identifier", "../instrument-identifier/index.html", "live", "identifying percussion-led African textures", "INS.FAMILY", "CTX.GENRE"),
        st("Describe", "Describe one feature of the rhythm.", ["polyrhythm", "cross-rhythm", "interlocking", "repeated", "layered", "syncopated", "cyclical"], "Polyrhythm / cross-rhythm / interlocking patterns", ["CAM-EX-03"], ["rhythm", "polyrhythm", "cross-rhythm", "African music"], "Meter Master", "../meter-master/index.html", "live", "describing African rhythmic patterns", "RHY.DEVICE", "RHY.METRE"),
        st("Describe", "Describe the texture.", ["layered", "polyphonic", "interlocking", "heterogeneous", "multiple rhythmic layers"], "Layered / polyphonic / interlocking", ["CAM-EX-03"], ["texture", "layering", "polyrhythm", "African music"], "Texture Trainer", "../texture-trainer/index.html", "live", "describing layered African textures", "TEX.TYPE", "TEX.ROLE"),
        mc("Identify", "Which term best describes the relationship between some rhythmic parts?", "Interlocking", ["Unison", "Interlocking", "Homophonic", "Monophonic"], ["CAM-EX-03"], ["interlocking", "texture", "ensemble relationship", "African music"], "Texture Trainer", "../texture-trainer/index.html", "live", "recognising interlocking rhythmic parts", "TEX.TYPE", "RHY.DEVICE"),
        st("Describe", "Describe the timbre of the percussion.", ["dry", "sharp", " resonant", "woody", "hand-struck", "bright", "crisp"], "Dry / sharp / resonant / hand-struck", ["CAM-EX-03"], ["timbre", "percussion", "African music", "drums"], "Instrument Identifier", "../instrument-identifier/index.html", "live", "describing African percussion timbres", "INS.INDIVIDUAL", "ART.TYPE"),
        st("Name", "Name one type of drum or percussion heard.", ["djembe", "drum", "hand drum", "conga", "bongo", "percussion", "tom"], "Djembe / hand drum / percussion", ["CAM-EX-03", "CAM-INS-01"], ["instrument identification", "drums", "percussion", "African music"], "Instrument Identifier", "../instrument-identifier/index.html", "live", "naming African percussion", "INS.INDIVIDUAL", "INS.FAMILY"),
        st("Describe", "Describe one change which takes place during the extract.", ["a layer is added", "a layer is removed", "texture changes", "dynamics change", "rhythm intensifies", "parts enter"], "A layer is added or removed / texture or dynamics change", ["CAM-EX-03"], ["change recognition", "texture", "dynamics", "structure"], "Texture Trainer", "../texture-trainer/index.html", "live", "describing audible changes in African percussion", "TEX.TYPE", "DYN.CHANGE"),
        mc("Identify", "Which time signature is most likely?", "Simple time", ["Simple time", "Compound time", "Irregular time", "Mixed metre"], ["CAM-EX-03"], ["metre", "time signature", "simple time", "African music"], "Meter Master", "../meter-master/index.html", "live", "identifying metres in African music", "RHY.METRE", "RHY.TIME_SIGNATURE"),
        st("Give", "Give one feature typical of African percussion music.", ["polyrhythm", "interlocking rhythms", "call and response", "repeated patterns", "cross-rhythm", "layered percussion"], "Polyrhythm / interlocking rhythms / call and response", ["CAM-EX-03", "CAM-EX-12"], ["African music", "genre features", "percussion", "rhythm"], "Context & Style", "#", "planned", "recognising African genre features", "CTX.GENRE", "RHY.DEVICE"),
        mc("Identify", "Choose the most suitable style for this extract.", "African percussion music", ["African percussion music", "Baroque fugue", "Disco", "Romantic art song"], ["CAM-EX-03", "CAM-EX-12"], ["style recognition", "African music", "genre", "context"], "Context & Style", "#", "planned", "matching extracts to world styles", "CTX.GENRE", ""),
    ],
    "EXL018": [
        mc("Identify", "Which instrument plays the off-beat chords?", "Electric guitar", ["Piano", "Electric guitar", "Flute", "Violin"], ["CAM-EX-03", "CAM-INS-01"], ["instrument identification", "electric guitar", "reggae", "skank"], "Instrument Identifier", "../instrument-identifier/index.html", "live", "recognising reggae guitar skank", "INS.INDIVIDUAL", "CTX.GENRE"),
        st("Name", "Name the rhythmic guitar pattern used in reggae.", ["skank", "off-beat chords", "skank chords", "chords on the off-beat", "reggae skank"], "Skank / off-beat chords", ["CAM-EX-03"], ["skank", "reggae", "rhythm guitar", "off-beat"], "Meter Master", "../meter-master/index.html", "live", "naming the reggae skank", "RHY.DEVICE", "CTX.GENRE"),
        st("Describe", "Describe the bass line.", ["repeated", "syncopated", "stepwise", "riffs", "melodic", "outlines harmony", "bouncy"], "Repeated / syncopated / outlines the harmony", ["CAM-EX-03"], ["bass line", "reggae", "syncopation", "repeated pattern"], "Melody Master", "../melody-master/index.html", "live", "describing reggae bass lines", "MEL.DEVICE", "RHY.DEVICE"),
        mc("Identify", "On which beats are the guitar chords mainly heard?", "Off-beats", ["On every beat", "Off-beats", "Beats 1 and 3 only", "Beats 2 and 4 only"], ["CAM-EX-03"], ["off-beat", "reggae", "metre", "rhythm"], "Meter Master", "../meter-master/index.html", "live", "recognising off-beat reggae chords", "RHY.METRE", "RHY.DEVICE"),
        st("Describe", "Describe the role of the drums.", ["steady beat", "backbeat", "groove", "rhythmic foundation", "keep the pulse", "support the bass"], "Steady beat / groove / rhythmic foundation", ["CAM-EX-03"], ["drums", "reggae", "pulse", "groove"], "Meter Master", "../meter-master/index.html", "live", "describing drum roles in reggae", "RHY.PULSE", "INS.ROLE"),
        st("Describe", "Describe the texture.", ["melody and accompaniment", "homophonic", "layered", "bass and chords with melody"], "Melody and accompaniment / homophonic", ["CAM-EX-03"], ["texture", "homophonic", "reggae", "melody and accompaniment"], "Texture Trainer", "../texture-trainer/index.html", "live", "describing reggae textures", "TEX.TYPE", "TEX.ROLE"),
        st("Describe", "Describe one change which takes place during the extract.", ["a part is added", "texture changes", "dynamics change", "instruments enter", "layers are added"], "A part is added / texture or dynamics change", ["CAM-EX-03"], ["change recognition", "texture", "dynamics", "structure"], "Texture Trainer", "../texture-trainer/index.html", "live", "describing changes in reggae", "TEX.TYPE", "DYN.CHANGE"),
        st("Give", "Give one feature typical of reggae music.", ["off-beat guitar", "skank", "syncopated bass", "steady beat", "repeated bass line", "relaxed tempo"], "Off-beat guitar / skank / syncopated bass / steady beat", ["CAM-EX-03", "CAM-EX-12"], ["reggae", "genre features", "Caribbean", "rhythm"], "Context & Style", "#", "planned", "recognising reggae genre features", "CTX.GENRE", "RHY.DEVICE"),
        mc("Identify", "From which region is reggae most closely associated?", "Caribbean", ["Caribbean", "Scandinavia", "East Asia", "Central Europe"], ["CAM-EX-03", "CAM-EX-12"], ["world region", "Caribbean", "reggae", "context"], "Context & Style", "#", "planned", "locating Caribbean traditions", "CTX.GENRE", ""),
        st("Give", "Give one way in which technology has been used in this extract.", ["electric guitar", "amplified", "electronic keyboard", "effects", "recording technology", "electric bass"], "Electric / amplified instruments / electronic keyboard", ["CAM-EX-03"], ["music technology", "amplification", "reggae", "popular music"], "Context & Style", "#", "planned", "identifying technology in reggae", "CTX.TECHNOLOGY", "CTX.GENRE"),
        mc("Identify", "Choose the most suitable style for this extract.", "Reggae", ["Reggae", "Baroque concerto", "Latin dance music", "Symphony"], ["CAM-EX-03", "CAM-EX-12"], ["style recognition", "reggae", "genre", "context"], "Context & Style", "#", "planned", "matching extracts to popular styles", "CTX.GENRE", ""),
    ],
    "EXL019": [
        mc("Identify", "From which country is this music most closely associated?", "Japan", ["Japan", "India", "Mexico", "Nigeria"], ["CAM-EX-03", "CAM-EX-12"], ["world region", "Japan", "context", "tradition"], "Context & Style", "#", "planned", "locating Japanese traditions", "CTX.GENRE", ""),
        st("Name", "Name one traditional Japanese instrument heard.", ["shamisen", "koto", "shakuhachi", "taiko", "biwa"], "Shamisen / koto / shakuhachi", ["CAM-EX-03", "CAM-INS-01"], ["instrument identification", "Japanese music", "traditional instruments"], "Instrument Identifier", "../instrument-identifier/index.html", "live", "recognising Japanese instruments", "INS.INDIVIDUAL", "CTX.GENRE"),
        mc("Identify", "Which family of instruments is most prominent?", "Strings", ["Strings", "Brass", "Percussion only", "Electronic"], ["CAM-EX-03", "CAM-INS-01"], ["instrument family", "strings", "Japanese music", "ensemble"], "Instrument Identifier", "../instrument-identifier/index.html", "live", "identifying string-led Japanese textures", "INS.FAMILY", "CTX.GENRE"),
        st("Describe", "Describe the timbre of the main melodic instrument.", ["plucked", "bright", "sharp", "nasal", "penetrating", "resonant", "twangy"], "Plucked / bright / sharp / nasal", ["CAM-EX-03"], ["timbre", "Japanese music", "plucked strings"], "Instrument Identifier", "../instrument-identifier/index.html", "live", "describing Japanese string timbres", "INS.INDIVIDUAL", "ART.TYPE"),
        st("Describe", "Describe the texture.", ["monophonic", "heterophonic", "melody and accompaniment", "unison", "single melodic line"], "Monophonic / heterophonic / melody and accompaniment", ["CAM-EX-03"], ["texture", "Japanese music", "folk song"], "Texture Trainer", "../texture-trainer/index.html", "live", "describing Japanese folk textures", "TEX.TYPE", "TEX.ROLE"),
        mc("Identify", "Which scale type is most likely to be associated with this music?", "Pentatonic", ["Major scale", "Pentatonic", "Whole-tone scale", "Chromatic scale"], ["CAM-EX-03", "CAM-EX-12"], ["scale", "pentatonic", "Japanese music", "pitch"], "Context & Style", "#", "planned", "linking Japanese music to pentatonic scales", "CTX.GENRE", "HAR.TONALITY"),
        st("Describe", "Describe one feature of the melody.", ["ornamented", "stepwise", "decorative", "florid", "melismatic", "simple", "folk-like"], "Ornamented / decorative / folk-like", ["CAM-EX-03"], ["melody", "ornamentation", "Japanese folk", "decoration"], "Melody Master", "../melody-master/index.html", "live", "describing Japanese folk melodies", "MEL.ORNAMENT", "MEL.DEVICE"),
        st("Describe", "Describe one feature of the rhythm.", ["free", "flexible", "rubato", "unmeasured", "steady", "simple", "regular"], "Free / flexible / rubato OR steady / simple", ["CAM-EX-03"], ["rhythm", "rubato", "Japanese folk", "flexible tempo"], "Meter Master", "../meter-master/index.html", "live", "describing flexible folk rhythms", "RHY.TEMPO", "RHY.DEVICE"),
        mc("Identify", "This music was traditionally associated with which context?", "Folk traditions", ["Opera houses", "Folk traditions", "Nightclubs", "Film studios"], ["CAM-EX-03", "CAM-EX-12"], ["context", "folk tradition", "Japanese music", "function"], "Context & Style", "#", "planned", "linking music to cultural contexts", "CTX.GENRE", ""),
        st("Give", "Give one feature typical of traditional Japanese music.", ["pentatonic scale", "plucked strings", "ornamentation", "heterophonic texture", "folk melody", "traditional instruments"], "Pentatonic scale / plucked strings / ornamentation", ["CAM-EX-03", "CAM-EX-12"], ["Japanese music", "genre features", "tradition", "context"], "Context & Style", "#", "planned", "recognising Japanese genre features", "CTX.GENRE", "MEL.ORNAMENT"),
        mc("Identify", "Choose the most suitable style for this extract.", "Japanese folk music", ["Japanese folk music", "Hip-hop", "Disco", "Romantic symphony"], ["CAM-EX-03", "CAM-EX-12"], ["style recognition", "Japanese folk", "genre", "context"], "Context & Style", "#", "planned", "matching extracts to world styles", "CTX.GENRE", ""),
    ],
    "EXL020": [
        mc("Identify", "Which instrument provides the main rhythmic foundation?", "Drum machine / drums", ["Violin", "Drum machine / drums", "Flute", "Harp"], ["CAM-EX-03", "CAM-INS-01"], ["instrument identification", "drums", "hip-hop", "beat"], "Instrument Identifier", "../instrument-identifier/index.html", "live", "recognising hip-hop drum patterns", "INS.INDIVIDUAL", "CTX.TECHNOLOGY"),
        st("Give", "Give one way in which technology has been used in this extract.", ["drum machine", "sampling", "programmed beats", "electronic production", "synthesiser", "loop", "electronic drums"], "Drum machine / sampling / programmed beats", ["CAM-EX-03"], ["music technology", "hip-hop", "electronic production", "sampling"], "Context & Style", "#", "planned", "identifying technology in hip-hop", "CTX.TECHNOLOGY", "CTX.GENRE"),
        st("Describe", "Describe the bass line.", ["repeated", "syncopated", "loop", "ostinato", "rhythmic", "low", "groove"], "Repeated / syncopated / loop / ostinato", ["CAM-EX-03"], ["bass line", "hip-hop", "ostinato", "groove"], "Melody Master", "../melody-master/index.html", "live", "describing hip-hop bass lines", "MEL.DEVICE", "RHY.DEVICE"),
        mc("Identify", "Which term describes the repeated rhythmic pattern?", "Beat / groove", ["Cadence", "Beat / groove", "Sequence", "Pedal"], ["CAM-EX-03"], ["beat", "groove", "hip-hop", "rhythm"], "Meter Master", "../meter-master/index.html", "live", "recognising hip-hop beats", "RHY.DEVICE", "RHY.PULSE"),
        st("Describe", "Describe the texture.", ["layered", "homophonic", "melody and accompaniment", "beat with bass and samples"], "Layered / homophonic / beat with bass", ["CAM-EX-03"], ["texture", "layering", "hip-hop", "beat"], "Texture Trainer", "../texture-trainer/index.html", "live", "describing hip-hop textures", "TEX.TYPE", "TEX.ROLE"),
        st("Describe", "Describe one change which takes place during the extract.", ["a layer is added", "a layer is removed", "texture changes", "dynamics change", "elements drop out", "parts enter"], "A layer is added or removed / texture or dynamics change", ["CAM-EX-03"], ["change recognition", "texture", "dynamics", "structure"], "Texture Trainer", "../texture-trainer/index.html", "live", "describing changes in hip-hop", "TEX.TYPE", "DYN.CHANGE"),
        mc("Identify", "On which beats is the snare or clap mainly heard?", "2 and 4", ["1 and 2", "1 and 3", "2 and 4", "3 and 4"], ["CAM-EX-03"], ["backbeat", "snare", "metre", "hip-hop rhythm"], "Meter Master", "../meter-master/index.html", "live", "recognising the hip-hop backbeat", "RHY.DEVICE", "RHY.METRE"),
        st("Name", "Name the short repeated rhythmic idea in the drums.", ["beat", "groove", "rhythmic loop", "ostinato", "repeated pattern", "drum pattern"], "Beat / groove / rhythmic loop / ostinato", ["CAM-EX-03"], ["beat", "groove", "ostinato", "hip-hop"], "Meter Master", "../meter-master/index.html", "live", "naming hip-hop rhythmic loops", "RHY.DEVICE", "MEL.DEVICE"),
        st("Give", "Give one feature typical of hip-hop music.", ["sampled beats", "rap-ready groove", "backbeat", "bass loop", "electronic production", "repeated beat"], "Sampled beats / backbeat / bass loop / electronic production", ["CAM-EX-03", "CAM-EX-12"], ["hip-hop", "genre features", "popular music", "technology"], "Context & Style", "#", "planned", "recognising hip-hop genre features", "CTX.GENRE", "CTX.TECHNOLOGY"),
        st("Describe", "Describe the role of the hi-hat or cymbals.", ["steady pulse", "keeps time", "rhythmic pattern", "sixteenth notes", "drives the rhythm", "supports the beat"], "Steady pulse / keeps time / rhythmic pattern", ["CAM-EX-03"], ["hi-hat", "rhythm", "pulse", "hip-hop"], "Meter Master", "../meter-master/index.html", "live", "describing hi-hat patterns", "RHY.PULSE", "INS.ROLE"),
        mc("Identify", "Choose the most suitable style for this extract.", "Hip-hop", ["Hip-hop", "Baroque fugue", "Gamelan music", "Romantic art song"], ["CAM-EX-03", "CAM-EX-12"], ["style recognition", "hip-hop", "genre", "context"], "Context & Style", "#", "planned", "matching extracts to popular styles", "CTX.GENRE", ""),
    ],
    "EXL021": [
        mc("Identify", "Which instrument plays the main melody?", "Piano", ["Trumpet", "Piano", "Trombone", "Oboe"], ["CAM-EX-03", "CAM-INS-01"], ["instrument identification", "piano", "pop", "melody"], "Instrument Identifier", "../instrument-identifier/index.html", "live", "recognising piano melody in pop", "INS.INDIVIDUAL", "CTX.GENRE"),
        st("Describe", "Describe the texture.", ["melody and accompaniment", "homophonic", "melody with chords", "simple", "clear melody"], "Melody and accompaniment / homophonic", ["CAM-EX-03"], ["texture", "homophonic", "pop", "melody and accompaniment"], "Texture Trainer", "../texture-trainer/index.html", "live", "describing pop textures", "TEX.TYPE", "TEX.ROLE"),
        st("Describe", "Describe the bass line.", ["stepwise", "repeated", "simple", "supports harmony", "root notes", "walking", "smooth"], "Stepwise / repeated / supports harmony", ["CAM-EX-03"], ["bass line", "pop", "harmony", "accompaniment"], "Melody Master", "../melody-master/index.html", "live", "describing pop bass lines", "MEL.DEVICE", "HAR.CHORD"),
        mc("Identify", "Which time signature is most likely?", "Simple time", ["Simple time", "Compound time", "Irregular time", "Mixed metre"], ["CAM-EX-03"], ["metre", "time signature", "simple time", "pop"], "Meter Master", "../meter-master/index.html", "live", "identifying simple metres in pop", "RHY.METRE", "RHY.TIME_SIGNATURE"),
        st("Describe", "Describe one feature of the melody.", ["catchy", "stepwise", "simple", "memorable", "repeated", "smooth", "singable"], "Catchy / stepwise / simple / memorable", ["CAM-EX-03"], ["melody", "pop", "memorable", "singable"], "Melody Master", "../melody-master/index.html", "live", "describing pop melodies", "MEL.DEVICE", "MEL.DIRECTION"),
        st("Describe", "Describe the dynamics.", ["moderate", "steady", "soft to moderate", "consistent", "gentle", "relaxed"], "Moderate / steady / gentle", ["CAM-EX-03"], ["dynamics", "pop", "level", "expression"], "Context & Style", "#", "planned", "describing pop dynamics", "DYN.LEVEL", ""),
        mc("Identify", "Which term describes the chordal support beneath the melody?", "Accompaniment", ["Countermelody", "Accompaniment", "Pedal", "Canon"], ["CAM-EX-03"], ["accompaniment", "texture", "pop", "harmony"], "Texture Trainer", "../texture-trainer/index.html", "live", "recognising accompaniment roles", "TEX.ROLE", "HAR.CHORD"),
        st("Describe", "Describe one change which takes place during the extract.", ["dynamics change", "texture changes", "a part is added", "instruments enter", "layers are added"], "Dynamics / texture change / parts added", ["CAM-EX-03"], ["change recognition", "dynamics", "texture", "structure"], "Texture Trainer", "../texture-trainer/index.html", "live", "describing changes in pop", "TEX.TYPE", "DYN.CHANGE"),
        st("Give", "Give one feature typical of pop music.", ["catchy melody", "simple harmony", "steady beat", "verse-chorus structure", "memorable tune", "homophonic texture"], "Catchy melody / simple harmony / steady beat", ["CAM-EX-03", "CAM-EX-12"], ["pop", "genre features", "popular music", "melody"], "Context & Style", "#", "planned", "recognising pop genre features", "CTX.GENRE", "MEL.DEVICE"),
        st("Describe", "Describe the role of the drums.", ["steady beat", "keep the pulse", "support the melody", "simple pattern", "backbeat"], "Steady beat / keep the pulse / simple pattern", ["CAM-EX-03"], ["drums", "pop", "pulse", "accompaniment"], "Meter Master", "../meter-master/index.html", "live", "describing drum roles in pop", "RHY.PULSE", "INS.ROLE"),
        mc("Identify", "Choose the most suitable style for this extract.", "Pop", ["Pop", "Gamelan music", "Baroque fugue", "Symphony"], ["CAM-EX-03", "CAM-EX-12"], ["style recognition", "pop", "genre", "context"], "Context & Style", "#", "planned", "matching extracts to popular styles", "CTX.GENRE", ""),
    ],
    "EXL022": [
        mc("Identify", "Which family of instruments provides the main beat?", "Percussion / electronic drums", ["Strings", "Percussion / electronic drums", "Brass", "Woodwind"], ["CAM-EX-03", "CAM-INS-01"], ["instrument family", "electronic drums", "EDM", "beat"], "Instrument Identifier", "../instrument-identifier/index.html", "live", "recognising electronic drum beats", "INS.FAMILY", "CTX.TECHNOLOGY"),
        st("Give", "Give one way in which technology has been used in this extract.", ["synthesiser", "drum machine", "electronic production", "programmed drums", "electronic bass", "synth"], "Synthesiser / drum machine / programmed drums", ["CAM-EX-03"], ["music technology", "EDM", "electronic production", "synthesis"], "Context & Style", "#", "planned", "identifying technology in EDM", "CTX.TECHNOLOGY", "CTX.GENRE"),
        mc("Identify", "Which rhythmic pattern is played by the bass drum?", "On every crotchet beat", ["On every crotchet beat", "Only on beats 2 and 4", "Syncopated off-beats only", "Irregular pattern"], ["CAM-EX-03"], ["bass drum", "four on the floor", "metre", "house"], "Meter Master", "../meter-master/index.html", "live", "recognising four-on-the-floor patterns", "RHY.METRE", "RHY.DEVICE"),
        st("Name", "What name is given to this bass-drum pattern in dance music?", ["four on the floor", "4 on the floor", "four-on-the-floor", "steady kick pattern"], "Four on the floor", ["CAM-EX-03"], ["four on the floor", "bass drum", "house", "dance music"], "Meter Master", "../meter-master/index.html", "live", "naming four-on-the-floor patterns", "RHY.DEVICE", "CTX.GENRE"),
        st("Describe", "Describe the bass line.", ["repeated", "syncopated", "electronic", "loop", "ostinato", "driving"], "Repeated / syncopated / electronic loop", ["CAM-EX-03"], ["bass line", "ostinato", "EDM", "electronic"], "Melody Master", "../melody-master/index.html", "live", "describing EDM bass lines", "MEL.DEVICE", "RHY.DEVICE"),
        st("Describe", "Describe the texture when most elements are playing.", ["layered", "thick", "homophonic", "dense", "beat with synth layers"], "Layered / thick / homophonic", ["CAM-EX-03"], ["texture", "layering", "EDM", "density"], "Texture Trainer", "../texture-trainer/index.html", "live", "describing dense EDM textures", "TEX.TYPE", "TEX.ROLE"),
        mc("Identify", "Which term describes the addition of electronic parts to build up the texture?", "Layering", ["Imitation", "Layering", "Canon", "Pedal"], ["CAM-EX-03"], ["layering", "texture", "build-up", "EDM"], "Texture Trainer", "../texture-trainer/index.html", "live", "recognising layered EDM textures", "TEX.TYPE", ""),
        st("Describe", "Describe one change which takes place during the extract.", ["a part is added", "a part is removed", "texture changes", "dynamics change", "filter sweep", "layers drop"], "A part is added or removed / texture or dynamics change", ["CAM-EX-03"], ["change recognition", "texture", "dynamics", "structure"], "Texture Trainer", "../texture-trainer/index.html", "live", "describing changes in EDM", "TEX.TYPE", "DYN.CHANGE"),
        st("Give", "Give one feature which makes this music suitable for dancing.", ["steady beat", "four on the floor", "repeated bass", "driving rhythm", "regular pulse", "strong kick drum"], "Steady beat / four on the floor / driving rhythm", ["CAM-EX-03", "CAM-EX-12"], ["dance music", "pulse", "EDM", "function"], "Context & Style", "#", "planned", "linking EDM features to dance function", "CTX.GENRE", "RHY.PULSE"),
        st("Describe", "Describe the timbre of the synthesiser sounds.", ["bright", "electronic", "harsh", "filtered", "synthetic", "punchy", "sharp"], "Bright / electronic / synthetic / filtered", ["CAM-EX-03"], ["timbre", "synthesiser", "EDM", "electronic"], "Instrument Identifier", "../instrument-identifier/index.html", "live", "describing synthesiser timbres", "INS.INDIVIDUAL", "CTX.TECHNOLOGY"),
        mc("Identify", "Choose the most suitable style for this extract.", "House / EDM", ["House / EDM", "Baroque concerto", "Reggae", "Gamelan music"], ["CAM-EX-03", "CAM-EX-12"], ["style recognition", "EDM", "house", "genre"], "Context & Style", "#", "planned", "matching extracts to popular styles", "CTX.GENRE", ""),
    ],
    "EXL023": [
        mc("Identify", "From which region is this music most closely associated?", "Celtic regions / British Isles", ["Celtic regions / British Isles", "Latin America", "East Asia", "North Africa"], ["CAM-EX-03", "CAM-EX-12"], ["world region", "Celtic", "folk", "context"], "Context & Style", "#", "planned", "locating Celtic folk traditions", "CTX.GENRE", ""),
        st("Name", "Name the bowed string instrument heard in the melody.", ["fiddle", "violin", "folk fiddle"], "Fiddle / violin", ["CAM-EX-03", "CAM-INS-01"], ["instrument identification", "fiddle", "Celtic folk", "strings"], "Instrument Identifier", "../instrument-identifier/index.html", "live", "recognising fiddle in Celtic folk", "INS.INDIVIDUAL", "CTX.GENRE"),
        st("Describe", "Describe the timbre of the fiddle.", ["bright", "lively", "folk-like", "sharp", "energetic", "reedy", "nasal"], "Bright / lively / folk-like / energetic", ["CAM-EX-03"], ["timbre", "fiddle", "Celtic folk", "strings"], "Instrument Identifier", "../instrument-identifier/index.html", "live", "describing fiddle timbres", "INS.INDIVIDUAL", "ART.TYPE"),
        mc("Identify", "Which scale type is most likely to be associated with this music?", "Modal / folk scale", ["Major scale only", "Modal / folk scale", "Whole-tone scale", "Chromatic scale"], ["CAM-EX-03", "CAM-EX-12"], ["scale", "mode", "Celtic folk", "pitch"], "Context & Style", "#", "planned", "linking folk music to modal scales", "CTX.GENRE", "HAR.TONALITY"),
        st("Describe", "Describe one feature of the melody.", ["ornamented", "florid", "repeated", "folk-like", "lively", "stepwise", "decorative"], "Ornamented / lively / folk-like / decorative", ["CAM-EX-03"], ["melody", "ornamentation", "Celtic folk", "decoration"], "Melody Master", "../melody-master/index.html", "live", "describing Celtic folk melodies", "MEL.ORNAMENT", "MEL.DEVICE"),
        st("Describe", "Describe the texture.", ["melody and accompaniment", "homophonic", "monophonic", "heterophonic", "melody with drone"], "Melody and accompaniment / homophonic", ["CAM-EX-03"], ["texture", "folk", "melody and accompaniment", "Celtic"], "Texture Trainer", "../texture-trainer/index.html", "live", "describing Celtic folk textures", "TEX.TYPE", "TEX.ROLE"),
        st("Name", "Name one other instrument heard supporting the melody.", ["harp", "guitar", "bodhran", "accordion", "flute", "pipes", "percussion"], "Harp / guitar / bodhrán / flute", ["CAM-EX-03", "CAM-INS-01"], ["instrument identification", "folk ensemble", "Celtic", "accompaniment"], "Instrument Identifier", "../instrument-identifier/index.html", "live", "recognising Celtic folk accompaniment", "INS.INDIVIDUAL", "TEX.ROLE"),
        st("Describe", "Describe one feature of the rhythm.", ["lively", "dance-like", "steady", "repeated", "jig-like", "regular", "driving"], "Lively / dance-like / steady / jig-like", ["CAM-EX-03"], ["rhythm", "dance", "Celtic folk", "pulse"], "Meter Master", "../meter-master/index.html", "live", "describing Celtic dance rhythms", "RHY.DEVICE", "RHY.METRE"),
        mc("Identify", "Which time signature is most likely?", "Compound time", ["Simple time", "Compound time", "Irregular time", "Mixed metre"], ["CAM-EX-03"], ["metre", "compound time", "jig", "Celtic folk"], "Meter Master", "../meter-master/index.html", "live", "identifying compound metres in folk dance", "RHY.METRE", "RHY.TIME_SIGNATURE"),
        st("Give", "Give one feature typical of Celtic folk music.", ["ornamented melody", "fiddle", "dance rhythms", "modal scale", "folk instruments", "lively tempo"], "Ornamented melody / fiddle / dance rhythms / modal scale", ["CAM-EX-03", "CAM-EX-12"], ["Celtic folk", "genre features", "tradition", "context"], "Context & Style", "#", "planned", "recognising Celtic genre features", "CTX.GENRE", "MEL.ORNAMENT"),
        mc("Identify", "Choose the most suitable style for this extract.", "Celtic folk music", ["Celtic folk music", "Hip-hop", "Disco", "Symphony"], ["CAM-EX-03", "CAM-EX-12"], ["style recognition", "Celtic folk", "genre", "context"], "Context & Style", "#", "planned", "matching extracts to world styles", "CTX.GENRE", ""),
    ],
}


def js_str(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    last_err: Exception | None = None
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=180) as resp, open(dest, "wb") as out:
                shutil.copyfileobj(resp, out)
            return
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"download failed: {url} ({last_err})")


def trim(src: Path, dest: Path, start: float, duration: float = EXTRACT_DURATION) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [FFMPEG, "-y", "-ss", str(start), "-t", str(duration), "-i", str(src), "-ac", "2", "-ar", "44100", "-b:a", "192k", str(dest)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def render_js(extract: dict, questions: list[dict]) -> str:
    exl_id = extract["id"]
    q_js = []
    for index, q in enumerate(questions, start=1):
        qid = f"{exl_id}-Q{index:02d}"
        block = [
            "      {",
            f"        id: {js_str(qid)},",
            f"        number: {index},",
            f"        commandWord: {js_str(q['commandWord'])},",
            f"        prompt: {js_str(q['prompt'])},",
            "        marks: 1,",
            f"        responseType: {js_str(q['type'])},",
        ]
        if q["type"] == "multiple-choice":
            block.append(f"        options: {json.dumps(q['options'], ensure_ascii=False, indent=10)[0:1]}{json.dumps(q['options'], ensure_ascii=False)[1:-1]},".replace('"', '"').replace('options: [', 'options: [\n          ').replace(', ', ',\n          ').replace(']', '\n        ],'))
            # simpler:
            opts = ",\n          ".join(js_str(o) for o in q["options"])
            block[-1:] = [f"        options: [\n          {opts}\n        ],"]
            block.append(f"        correctChoice: {js_str(q['correctChoice'])},")
        else:
            acc = ",\n          ".join(js_str(a) for a in q["acceptedAnswers"])
            block.append(f"        acceptedAnswers: [\n          {acc}\n        ],")
        block.extend([
            f"        modelAnswer: {js_str(q['modelAnswer'])},",
            f"        feedback: {js_str(q['modelAnswer'] + '.')},",
            f"        skills: {json.dumps(q['skills'], ensure_ascii=False, indent=10).replace(chr(10)+' '*10, chr(10)+' '*8)},",
            f"        cambridgeRequirements: {json.dumps(q['cambridgeRequirements'], ensure_ascii=False, indent=10).replace(chr(10)+' '*10, chr(10)+' '*8)},",
            f"        route: {{ module: {js_str(q['route']['module'])}, path: {js_str(q['route']['path'])}, status: {js_str(q['route']['status'])}, focus: {js_str(q['route']['focus'])} }}",
            "      }",
        ])
        q_js.append("\n".join(block))

    licence = f"{extract['licence']}; {extract['attribution']}" if extract["licence"].startswith("CC") else extract["licence"]
    questions_body = ",\n".join(q_js)
    return textwrap.dedent(f"""\
    (() => {{
      "use strict";

      const set = Object.freeze({{
        id: {js_str(exl_id)},
        title: {js_str(extract['title'])},
        subtitle: "Aural-only listening question",
        board: "Cambridge",
        syllabus: "0410",
        syllabusYears: "2026–2028",
        areaOfStudy: {js_str(extract['area'])},
        genre: {js_str(extract['genre'])},
        performingForces: {js_str(extract['forces'])},
        extractDescription: "Aural-only extract without a supplied skeleton score",
        reviewStatus: "Requires final listening QA",
        totalMarks: 11,
        maxPlays: 4,
        scoreRequired: false,
        lyricsRequired: false,
        audio: {js_str(f"assets/{exl_id}.mp3")},
        score: "",
        scoreAlt: "",
        source: {{
          composer: {js_str(extract['composer'])},
          work: {js_str(extract['work'])},
          movement: {js_str(extract['movement'])},
          recordingSource: {js_str(extract['recording_source'])},
          recordingLicence: {js_str(licence)},
          scoreLicence: "No score supplied"
        }},
        overarchingRequirements: [
          "CAM-EX-01",
          "CAM-EX-03"
        ],
        questions: [
    {questions_body}
        ]
      }});

      window.EXAM_LAB_QUESTION_SETS = window.EXAM_LAB_QUESTION_SETS || {{}};
      window.EXAM_LAB_QUESTION_SETS.{exl_id} = set;
      window.EXAM_LAB_QUESTION_SET = set;
    }})();
    """)


def render_csv(extract: dict, questions: list[dict]) -> str:
    rows = ["Question Set,Question ID,Question Number,Prompt,Marks,Response Type,Correct Answer,Cambridge Requirement IDs,Skill Tags,Recommended EchoAural Module,Module Path,Route Status,Progression Focus"]
    exl_id = extract["id"]
    for index, q in enumerate(questions, start=1):
        qid = f"{exl_id}-Q{index:02d}"
        response = "Multiple choice" if q["type"] == "multiple-choice" else "Short text"
        correct = q["correctChoice"] if q["type"] == "multiple-choice" else q["modelAnswer"]
        reqs = "; ".join(q["cambridgeRequirements"])
        tags = "; ".join(q["skills"])
        route = q["route"]
        rows.append(
            f"{exl_id},{qid},{index},{q['prompt']},1,{response},{correct},{reqs},{tags},{route['module']},{route['path']},{route['status'].title()},{route['focus']}"
        )
    return "\n".join(rows) + "\n"


def render_test(extract: dict, questions: list[dict]) -> str:
    exl_id = extract["id"]
    num = exl_id.lower().replace("exl", "exl")
    file_id = exl_id.lower()
    correct = []
    for q in questions:
        if q["type"] == "multiple-choice":
            correct.append(q["correctChoice"])
        else:
            correct.append(q["acceptedAnswers"][0])
    correct_js = ",\n    ".join(js_str(c) for c in correct)
    return textwrap.dedent(f"""\
    "use strict";

    const test = require("node:test");
    const assert = require("node:assert/strict");
    const fs = require("node:fs");
    const path = require("node:path");
    const vm = require("node:vm");

    const moduleRoot = path.resolve(__dirname, "..");
    const marking = require(path.join(moduleRoot, "marking.js"));

    function loadQuestionSet() {{
      const context = vm.createContext({{ window: {{}} }});
      const source = fs.readFileSync(path.join(moduleRoot, "data", "{file_id}.js"), "utf8");
      vm.runInContext(source, context, {{ filename: "{file_id}.js" }});
      return context.window.EXAM_LAB_QUESTION_SET;
    }}

    function parseCsvRow(row) {{
      const cells = [];
      let cell = "";
      let quoted = false;
      for (let index = 0; index < row.length; index += 1) {{
        const char = row[index];
        if (char === '"' && quoted && row[index + 1] === '"') {{
          cell += '"';
          index += 1;
        }} else if (char === '"') {{
          quoted = !quoted;
        }} else if (char === "," && !quoted) {{
          cells.push(cell);
          cell = "";
        }} else {{
          cell += char;
        }}
      }}
      cells.push(cell);
      return cells;
    }}

    const {file_id} = loadQuestionSet();
    const question = (number) => {file_id}.questions[number - 1];
    const score = (answers) => {file_id}.questions.reduce((total, item, index) => total + marking.markQuestion(item, answers[index]).marks, 0);

    test("{exl_id} uses the prepared audio and is explicitly score-free", () => {{
      assert.equal(fs.existsSync(path.join(moduleRoot, "assets", "{exl_id}.mp3")), true);
      assert.equal({file_id}.audio, "assets/{exl_id}.mp3");
      assert.equal({file_id}.scoreRequired, false);
      assert.equal({file_id}.score, "");
      assert.equal({file_id}.lyricsRequired, false);
      assert.equal(fs.existsSync(path.join(moduleRoot, "assets", "{exl_id}-skeleton-score.png")), false);
    }});

    test("{exl_id} has eleven questions, eleven marks and four plays", () => {{
      assert.equal({file_id}.questions.length, 11);
      assert.equal({file_id}.questions.reduce((total, item) => total + item.marks, 0), 11);
      assert.equal({file_id}.totalMarks, 11);
      assert.equal({file_id}.maxPlays, 4);
      assert.deepEqual(Array.from({file_id}.questions, (item) => item.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    }});

    test("all-correct and all-incorrect {exl_id} submissions total 11/11 and 0/11", () => {{
      const correct = [
    {correct_js}
      ];
      const incorrect = Array.from({{ length: 11 }}, () => "not a creditworthy answer");
      assert.equal(score(correct), 11);
      assert.equal(score(incorrect), 0);
    }});

    test("{exl_id} is available in the selector", () => {{
      const html = fs.readFileSync(path.join(moduleRoot, "index.html"), "utf8");
      assert.match(html, /<option value="{exl_id}">{exl_id}<\\/option>/);
    }});

    test("{exl_id} CSV has one valid 13-column row per question", () => {{
      const csv = fs.readFileSync(path.join(moduleRoot, "ExamLab_{exl_id}_Cambridge_Skill_Map.csv"), "utf8");
      const rows = csv.trim().split(/\\r?\\n/);
      assert.equal(rows.length, 12);
      {file_id}.questions.forEach((item, index) => {{
        const cells = parseCsvRow(rows[index + 1]);
        assert.equal(cells.length, 13);
        assert.equal(cells[1], item.id);
        assert.equal(Number(cells[2]), item.number);
        assert.equal(cells[3], item.prompt);
        assert.equal(Number(cells[4]), item.marks);
      }});
    }});
    """)


def skill_metadata_row(qid: str, clip_id: str, primary: str, secondary: str, taxonomy: dict) -> dict:
    skill = taxonomy[primary]
    return {
        "question_id": qid,
        "clip_id": clip_id,
        "musical_element": skill["musical_element"],
        "primary_skill_code": primary,
        "primary_skill_name": skill["skill_name"],
        "secondary_skill_codes": secondary,
        "learning_stage": "identify",
        "difficulty_band": "Exam application",
        "period": "",
        "genre": "",
        "ensemble": "",
        "metadata_confidence": "high",
        "metadata_review_status": "Tagged",
    }


def main() -> None:
    taxonomy = {s["skill_code"]: s for s in json.loads((ROOT / "shared/data/skill-taxonomy.json").read_text())["skills"]}
    cache = DESKTOP / "_cache"
    audio_out = DESKTOP / "audio"
    answers_out = DESKTOP / "answer_keys"
    cache.mkdir(parents=True, exist_ok=True)
    audio_out.mkdir(parents=True, exist_ok=True)
    answers_out.mkdir(parents=True, exist_ok=True)

    rights_rows = []
    new_clip_rows = []
    new_question_rows = []
    new_question_json = {}

    for extract in EXTRACTS:
        exl_id = extract["id"]
        print(f"Processing {exl_id}...")
        raw_name = exl_id + Path(extract["source_url"]).suffix.split("?")[0]
        raw_path = cache / raw_name
        if not raw_path.exists():
            download(extract["source_url"], raw_path)
        trimmed_desktop = audio_out / f"{exl_id}.mp3"
        trimmed_repo = EXAM_LAB / "assets" / f"{exl_id}.mp3"
        trim(raw_path, trimmed_desktop, extract["start"])
        shutil.copy2(trimmed_desktop, trimmed_repo)

        questions = QUESTIONS[exl_id]
        js_path = EXAM_LAB / "data" / f"{exl_id.lower()}.js"
        js_path.write_text(render_js(extract, questions), encoding="utf-8")
        csv_path = EXAM_LAB / f"ExamLab_{exl_id}_Cambridge_Skill_Map.csv"
        csv_path.write_text(render_csv(extract, questions), encoding="utf-8")
        test_path = EXAM_LAB / "tests" / f"{exl_id.lower()}.test.js"
        test_path.write_text(render_test(extract, questions), encoding="utf-8")

        answer_lines = [f"# {exl_id} — {extract['title']}", ""]
        for index, q in enumerate(questions, start=1):
            ans = q["correctChoice"] if q["type"] == "multiple-choice" else q["modelAnswer"]
            answer_lines.append(f"Q{index}. {q['prompt']}")
            answer_lines.append(f"    Answer: {ans}")
            answer_lines.append("")
        (answers_out / f"{exl_id}_answers.txt").write_text("\n".join(answer_lines), encoding="utf-8")

        rights_rows.append({
            "clip_id": exl_id,
            "title": extract["work"],
            "creator": extract["composer"],
            "source": extract["recording_source"],
            "URL": extract["source_url"],
            "licence": extract["licence"],
            "attribution": extract["attribution"],
            "notes": f"{extract['movement']}; EchoAural Exam Lab {exl_id}",
        })

        genre_tags = extract["genre"].replace(" / ", " | ")
        new_clip_rows.append({
            "clip_id": f"CLIP-{exl_id}",
            "file_path": f"modules/exam-lab/assets/{exl_id}.mp3",
            "composer_creator": extract["composer"],
            "title_work": extract["work"],
            "movement_section": extract["movement"],
            "performer": "",
            "source": extract["recording_source"],
            "licence": extract["licence"],
            "period": "Contemporary" if "Kevin" in extract["composer"] else "",
            "genre": extract["genre"],
            "ensemble": extract["forces"],
            "featured_instrument": "",
            "instrument_family": "",
            "usage_context": "Exam Lab extract",
            "skill_tags": "CTX.GENRE | INS.INDIVIDUAL | TEX.TYPE | RHY.DEVICE | EXM.WRITTEN",
            "question_count": "11",
            "metadata_confidence": "high",
        })

        clip_id = f"CLIP-{exl_id}"
        for index, q in enumerate(questions, start=1):
            qid = f"{exl_id}-Q{index:02d}"
            row = skill_metadata_row(qid, clip_id, q["primary_skill_code"], q["secondary_skill_codes"], taxonomy)
            new_question_rows.append(row)
            new_question_json[qid] = {k: v for k, v in row.items() if k != "question_id"}

    rights_path = DESKTOP / "RIGHTS.csv"
    with rights_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["clip_id", "title", "creator", "source", "URL", "licence", "attribution", "notes"])
        writer.writeheader()
        writer.writerows(rights_rows)

    readme = DESKTOP / "README.md"
    mapping = "\n".join(
        f"| {e['id']} | `{e['id']}.mp3` | `{e['work']}` | `{answers_out.name}/{e['id']}_answers.txt` |"
        for e in EXTRACTS
    )
    readme.write_text(textwrap.dedent(f"""\
    # EchoAural EXL Score-Free Pack (EXL014–EXL023)

    Ten Cambridge-style, score-free Exam Lab extracts for world music and popular music coverage.

    ## Contents

    | EXL ID | Audio file | Source work | Answer key |
    |--------|------------|-------------|------------|
    {mapping}

    ## Rights

    See `RIGHTS.csv` for full attribution rows (clip_id, title, creator, source, URL, licence, attribution, notes).

    Audio is also copied into the EchoAural repo at `modules/exam-lab/assets/`.

    **Not part of the four Desktop training packs in `EchoAural_Audio_Packs/`.**
    """), encoding="utf-8")

    # Update clip catalogue CSV/JSON
    clip_csv_path = ROOT / "shared/data/clip-catalogue.csv"
    clip_lines = clip_csv_path.read_text(encoding="utf-8").rstrip().splitlines()
    clip_header = clip_lines[0]
    clip_fieldnames = clip_header.split(",")
    for row in new_clip_rows:
        clip_lines.append(",".join([
            row["clip_id"], row["file_path"], row["composer_creator"], f'"{row["title_work"]}"',
            row["movement_section"], row["performer"], row["source"], row["licence"], row["period"],
            row["genre"], f'"{row["ensemble"]}"', row["featured_instrument"], row["instrument_family"],
            row["usage_context"], row["skill_tags"], row["question_count"], row["metadata_confidence"],
        ]))
    clip_csv_path.write_text("\n".join(clip_lines) + "\n", encoding="utf-8")

    clip_json = json.loads((ROOT / "shared/data/clip-catalogue.json").read_text(encoding="utf-8"))
    for row in new_clip_rows:
        clip_json["clips"].append({
            "clip_id": row["clip_id"],
            "file_path": row["file_path"],
            "composer_creator": row["composer_creator"],
            "title_work": row["title_work"],
            "movement_section": row["movement_section"],
            "performer": row["performer"] or None,
            "source": row["source"],
            "licence": row["licence"],
            "period": row["period"] or None,
            "genre": row["genre"],
            "ensemble": row["ensemble"],
            "featured_instrument": row["featured_instrument"] or None,
            "instrument_family": row["instrument_family"] or None,
            "usage_context": row["usage_context"],
            "skill_tags": row["skill_tags"],
            "question_count": int(row["question_count"]),
            "metadata_confidence": row["metadata_confidence"],
        })
    (ROOT / "shared/data/clip-catalogue.json").write_text(json.dumps(clip_json, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Update question skill map CSV/JSON
    q_csv_path = ROOT / "shared/data/question-skill-map.csv"
    q_lines = q_csv_path.read_text(encoding="utf-8").rstrip().splitlines()
    for row in new_question_rows:
        q_lines.append(",".join([
            row["question_id"], row["clip_id"], row["musical_element"], row["primary_skill_code"],
            row["primary_skill_name"], row["secondary_skill_codes"], row["learning_stage"],
            row["difficulty_band"], row["period"], row["genre"], row["ensemble"],
            row["metadata_confidence"], row["metadata_review_status"],
        ]))
    q_csv_path.write_text("\n".join(q_lines) + "\n", encoding="utf-8")

    q_json = json.loads((ROOT / "shared/data/question-skill-map.json").read_text(encoding="utf-8"))
    q_json["questions"].update(new_question_json)
    (ROOT / "shared/data/question-skill-map.json").write_text(json.dumps(q_json, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Built {len(EXTRACTS)} extracts. Desktop pack: {DESKTOP}")


if __name__ == "__main__":
    main()
